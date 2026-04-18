import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_token
from app.database import get_db
from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction
from app.services.import_service import parse_file, parse_xlsx_reconciled

router = APIRouter(prefix="/import", tags=["import"])


# NOTE: /xlsx-reconciled MUST be registered before /{account_id} so that FastAPI
# does not swallow the literal path as a path parameter.
@router.post("/xlsx-reconciled")
async def import_xlsx_reconciled(
    file: UploadFile,
    itau_account_id: str = Query(..., description="UUID da conta Itaú no banco"),
    inter_account_id: str = Query(..., description="UUID da conta Inter no banco"),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> dict:
    """
    Import the reconciled XLSX spreadsheet (lancamento_por_lancamento_conferido.xlsx).

    Processes sheets 'Itaú' and 'Inter' separately.
    - 'Saldo inicial' row sets initial_balance_cents on the account.
    - 'Saldo final conferido' row is used only for balance validation.
    - Transfers are resolved using the 'Transferência' column (e.g. 'Itaú -> Inter').
    - Category names from the sheet are preserved in transaction notes.
    - Rolls back entirely if balance validation fails for either bank.

    Query params:
        itau_account_id: UUID of the Itaú account.
        inter_account_id: UUID of the Inter account.
    """
    # 1. Load and validate both accounts
    itau_account = await db.get(Account, itau_account_id)
    if not itau_account or itau_account.deleted_at:
        raise HTTPException(status_code=404, detail=f"Itaú account '{itau_account_id}' not found")

    inter_account = await db.get(Account, inter_account_id)
    if not inter_account or inter_account.deleted_at:
        raise HTTPException(status_code=404, detail=f"Inter account '{inter_account_id}' not found")

    if file.filename is None:
        raise HTTPException(status_code=400, detail="Filename required")

    content = await file.read()

    # 2. Parse the xlsx (pure Python, no DB access)
    try:
        parsed = parse_xlsx_reconciled(content, itau_account_id, inter_account_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # 3. Pre-load all categories for name-based matching
    cat_result = await db.execute(select(Category))
    categories_by_name: dict[str, str] = {
        c.name.lower(): c.id for c in cat_result.scalars().all()
    }

    def resolve_category(notes: str | None) -> str | None:
        """Extract category name from notes and find matching category ID."""
        if not notes:
            return None
        for part in notes.split(" | "):
            if part.startswith("Categoria: "):
                cat_name = part[len("Categoria: "):].strip().lower()
                return categories_by_name.get(cat_name)
        return None

    # 4. Validate balance for both banks before writing anything
    validation_summary: dict[str, dict] = {}
    has_errors = False

    for bank_key in ("itau", "inter"):
        bank_data = parsed[bank_key]
        errs = bank_data["validation_errors"]
        # Only balance mismatch errors block the import; unknown-tipo warnings do not
        balance_errors = [e for e in errs if "Balance mismatch" in e]
        if balance_errors:
            has_errors = True
        validation_summary[bank_key] = {
            "initial_balance_cents": bank_data["initial_balance_cents"],
            "expected_final_cents": bank_data["expected_final_cents"],
            "calculated_final_cents": bank_data["calculated_final_cents"],
            "warnings": [e for e in errs if "Balance mismatch" not in e],
            "errors": balance_errors,
        }

    if has_errors:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Balance validation failed — no data was imported.",
                "banks": validation_summary,
            },
        )

    # 5. Write transactions and update account balances
    bank_accounts = {"itau": itau_account, "inter": inter_account}
    import_stats: dict[str, dict] = {}

    for bank_key, bank_data in parsed.items():
        account = bank_accounts[bank_key]
        rows: list[dict] = bank_data["rows"]

        # — set initial balance on account (only if not already set) —
        initial_cents: int = bank_data["initial_balance_cents"]
        if account.initial_balance_cents == 0:
            account.initial_balance_cents = initial_cents
        # balance_cents will be set authoritatively at the end from the validated final value

        imported = 0
        skipped = 0

        for row in rows:
            # Resolve category by name stored in notes
            row["category_id"] = resolve_category(row.get("notes"))

            # Duplicate check: same account + date + amount + description
            existing = await db.scalar(
                select(Transaction).where(
                    Transaction.account_id == row["account_id"],
                    Transaction.date == row["date"],
                    Transaction.amount_cents == row["amount_cents"],
                    Transaction.description == row["description"],
                    Transaction.deleted_at.is_(None),
                ).limit(1)
            )
            if existing:
                skipped += 1
                continue

            row["id"] = str(uuid.uuid4())
            db.add(Transaction(**row))
            imported += 1

        # — set final balance authoritatively from the validated spreadsheet value —
        account.balance_cents = bank_data["expected_final_cents"]

        import_stats[bank_key] = {
            "imported": imported,
            "skipped": skipped,
            "total": len(rows),
            "initial_balance_cents": bank_data["initial_balance_cents"],
            "final_balance_cents": bank_data["expected_final_cents"],
            "validation": "ok",
            "warnings": validation_summary[bank_key]["warnings"],
        }

    await db.flush()

    return {
        "status": "ok",
        "banks": import_stats,
    }


@router.post("/{account_id}")
async def import_file(
    account_id: str,
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> dict:
    """
    Import OFX or CSV file into the given account.

    Supported formats: Itaú OFX, Nubank CSV, Inter CSV, BB OFX/CSV.
    Duplicate detection: skips rows with matching date+amount+description.
    """
    account = await db.get(Account, account_id)
    if not account or account.deleted_at:
        raise HTTPException(status_code=404, detail="Account not found")

    if file.filename is None:
        raise HTTPException(status_code=400, detail="Filename required")

    content = await file.read()

    try:
        rows = parse_file(content, file.filename, account_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    imported = 0
    skipped = 0

    for row in rows:
        # Simple duplicate check on (account_id, date, amount_cents, description)
        existing = await db.scalar(
            select(Transaction).where(
                Transaction.account_id == account_id,
                Transaction.date == row["date"],
                Transaction.amount_cents == row["amount_cents"],
                Transaction.description == row["description"],
                Transaction.deleted_at.is_(None),
            ).limit(1)
        )
        if existing:
            skipped += 1
            continue

        if not row.get("id"):
            row["id"] = str(uuid.uuid4())
        row.setdefault("source", "import")

        txn = Transaction(**row)
        db.add(txn)

        # Update balance
        if row["type"] == "income":
            account.balance_cents += row["amount_cents"]
        elif row["type"] == "expense":
            account.balance_cents -= row["amount_cents"]

        imported += 1

    return {
        "imported": imported,
        "skipped": skipped,
        "total": len(rows),
    }

import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_token
from app.database import get_db
from app.models.account import Account
from app.models.transaction import Transaction
from app.services.import_service import parse_file

router = APIRouter(prefix="/import", tags=["import"])


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
        from sqlalchemy import select
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

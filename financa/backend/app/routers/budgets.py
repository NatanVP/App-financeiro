import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_token
from app.database import get_db
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.schemas.budget import BudgetCreate, BudgetOut, BudgetUpdate
from app.services.finance_engine import compute_budget_variance

router = APIRouter(prefix="/budgets", tags=["budgets"])


def _current_year_month() -> str:
    today = date.today()
    return f"{today.year}-{today.month:02d}"


@router.get("/", response_model=list[BudgetOut])
async def list_budgets(
    year_month: str | None = Query(None, description="Filter by YYYY-MM; defaults to current month"),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> list[Budget]:
    ym = year_month or _current_year_month()
    result = await db.execute(
        select(Budget).where(
            Budget.deleted_at.is_(None),
            Budget.year_month == ym,
        )
    )
    return list(result.scalars().all())


@router.post("/", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
async def create_budget(
    payload: BudgetCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Budget:
    data = payload.model_dump()
    if not data.get("id"):
        data["id"] = str(uuid.uuid4())
    budget = Budget(**data)
    db.add(budget)
    await db.flush()
    return budget


@router.patch("/{budget_id}", response_model=BudgetOut)
async def update_budget(
    budget_id: str,
    payload: BudgetUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Budget:
    budget = await db.get(Budget, budget_id)
    if not budget or budget.deleted_at:
        raise HTTPException(status_code=404, detail="Budget not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(budget, field, value)
    return budget


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> None:
    from datetime import datetime, timezone
    budget = await db.get(Budget, budget_id)
    if not budget or budget.deleted_at:
        raise HTTPException(status_code=404, detail="Budget not found")
    budget.deleted_at = datetime.now(timezone.utc)


@router.post("/copy-previous", response_model=list[BudgetOut], status_code=status.HTTP_201_CREATED)
async def copy_from_previous(
    target_month: str = Query(..., description="YYYY-MM to copy into"),
    source_month: str | None = Query(None, description="YYYY-MM to copy from; defaults to month before target"),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> list[Budget]:
    """
    Copy all budgets from source_month into target_month.
    Skips categories that already have a budget for target_month.
    Returns list of newly created budgets.
    """
    if source_month is None:
        # Compute month before target
        year, month = int(target_month[:4]), int(target_month[5:])
        month -= 1
        if month < 1:
            month = 12
            year -= 1
        source_month = f"{year}-{month:02d}"

    source_result = await db.execute(
        select(Budget).where(
            Budget.deleted_at.is_(None),
            Budget.year_month == source_month,
        )
    )
    source_budgets = source_result.scalars().all()

    if not source_budgets:
        raise HTTPException(status_code=404, detail=f"No budgets found for {source_month}")

    # Existing budgets in target month
    existing_result = await db.execute(
        select(Budget.category_id).where(
            Budget.deleted_at.is_(None),
            Budget.year_month == target_month,
        )
    )
    existing_categories = {row[0] for row in existing_result.all()}

    created = []
    for src in source_budgets:
        if src.category_id in existing_categories:
            continue
        new_budget = Budget(
            id=str(uuid.uuid4()),
            category_id=src.category_id,
            year_month=target_month,
            amount_cents=src.amount_cents,
        )
        db.add(new_budget)
        await db.flush()
        created.append(new_budget)

    return created


@router.get("/variance")
async def budget_variance(
    year_month: str | None = Query(None, description="YYYY-MM; defaults to current month"),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> list[dict]:
    """Return budget vs actual for each category in the given month."""
    from calendar import monthrange

    ym = year_month or _current_year_month()
    year, month = int(ym[:4]), int(ym[5:])
    first_day = date(year, month, 1)
    last_day = date(year, month, monthrange(year, month)[1])

    budgets_result = await db.execute(
        select(Budget).where(
            Budget.deleted_at.is_(None),
            Budget.year_month == ym,
        )
    )
    budgets = budgets_result.scalars().all()

    report = []
    for budget in budgets:
        spent_result = await db.execute(
            select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
                Transaction.category_id == budget.category_id,
                Transaction.type == "expense",
                Transaction.date >= first_day,
                Transaction.date <= last_day,
                Transaction.deleted_at.is_(None),
            )
        )
        spent_cents = spent_result.scalar() or 0
        variance = compute_budget_variance(budget.amount_cents, spent_cents)
        report.append({
            "budget_id": budget.id,
            "category_id": budget.category_id,
            "year_month": budget.year_month,
            "budget_cents": budget.amount_cents,
            "spent_cents": spent_cents,
            **variance,
        })

    return report

from datetime import date
from calendar import monthrange

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_token
from app.database import get_db
from app.models.debt import Debt
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.services.finance_engine import compute_allocation, compute_surplus

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def monthly_summary(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> dict:
    """Full dashboard summary for a given month."""
    first_day = date(year, month, 1)
    last_day = date(year, month, monthrange(year, month)[1])

    # Income
    income_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
            Transaction.type == "income",
            Transaction.date >= first_day,
            Transaction.date <= last_day,
            Transaction.deleted_at.is_(None),
        )
    )
    income_cents: int = int(income_result.scalar() or 0)

    # Expenses
    expense_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
            Transaction.type == "expense",
            Transaction.date >= first_day,
            Transaction.date <= last_day,
            Transaction.deleted_at.is_(None),
        )
    )
    expense_cents: int = int(expense_result.scalar() or 0)

    surplus_cents = compute_surplus(income_cents, expense_cents)

    # Top categories
    top_cats_result = await db.execute(
        select(
            Transaction.category_id,
            func.sum(Transaction.amount_cents).label("total"),
        )
        .where(
            Transaction.type == "expense",
            Transaction.date >= first_day,
            Transaction.date <= last_day,
            Transaction.deleted_at.is_(None),
            Transaction.category_id.is_not(None),
        )
        .group_by(Transaction.category_id)
        .order_by(func.sum(Transaction.amount_cents).desc())
        .limit(5)
    )
    top_categories = [
        {"category_id": row.category_id, "total_cents": row.total}
        for row in top_cats_result
    ]

    # Active debts
    debts_result = await db.execute(
        select(
            func.count(Debt.id).label("count"),
            func.coalesce(func.sum(Debt.current_balance_cents), 0).label("total_balance"),
        ).where(Debt.status == "active", Debt.deleted_at.is_(None))
    )
    debts_row = debts_result.one()

    # Goals summary
    goals_result = await db.execute(
        select(
            func.count(Goal.id).label("count"),
            func.coalesce(func.sum(Goal.current_cents), 0).label("total_current"),
            func.coalesce(func.sum(Goal.target_cents), 0).label("total_target"),
        ).where(Goal.status == "active", Goal.deleted_at.is_(None))
    )
    goals_row = goals_result.one()

    return {
        "period": {"year": year, "month": month},
        "income_cents": income_cents,
        "expense_cents": expense_cents,
        "surplus_cents": surplus_cents,
        "top_categories": top_categories,
        "debts": {
            "count": debts_row.count,
            "total_balance_cents": debts_row.total_balance,
        },
        "goals": {
            "count": goals_row.count,
            "total_current_cents": goals_row.total_current,
            "total_target_cents": goals_row.total_target,
            "progress_pct": round(
                goals_row.total_current / goals_row.total_target * 100, 1
            ) if goals_row.total_target > 0 else 0.0,
        },
    }


@router.get("/cashflow")
async def cashflow_12m(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> list[dict]:
    """Monthly income/expense/surplus for last 12 months."""
    today = date.today()
    results = []

    for i in range(11, -1, -1):
        # Walk backwards 11 months
        month_offset = today.month - i
        year = today.year + (month_offset - 1) // 12
        month = ((month_offset - 1) % 12) + 1

        first_day = date(year, month, 1)
        last_day = date(year, month, monthrange(year, month)[1])

        income = await db.scalar(
            select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
                Transaction.type == "income",
                Transaction.date >= first_day,
                Transaction.date <= last_day,
                Transaction.deleted_at.is_(None),
            )
        ) or 0

        expense = await db.scalar(
            select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
                Transaction.type == "expense",
                Transaction.date >= first_day,
                Transaction.date <= last_day,
                Transaction.deleted_at.is_(None),
            )
        ) or 0

        results.append({
            "year": year,
            "month": month,
            "income_cents": income,
            "expense_cents": expense,
            "surplus_cents": income - expense,
        })

    return results

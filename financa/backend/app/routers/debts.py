import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_token
from app.database import get_db
from app.models.debt import Debt, DebtPayment
from app.schemas.debt import (
    DebtCreate,
    DebtOut,
    DebtPaymentCreate,
    DebtPaymentOut,
    DebtUpdate,
)
from app.services.finance_engine import compute_months_to_payoff, compute_pmt, simulate_debt_payment

router = APIRouter(prefix="/debts", tags=["debts"])

CRITICAL_RATE_THRESHOLD = 0.08  # 8% monthly


@router.get("/", response_model=list[DebtOut])
async def list_debts(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> list[Debt]:
    result = await db.execute(
        select(Debt).where(Debt.deleted_at.is_(None)).order_by(Debt.current_balance_cents.desc())
    )
    return list(result.scalars().all())


@router.post("/", response_model=DebtOut, status_code=status.HTTP_201_CREATED)
async def create_debt(
    payload: DebtCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Debt:
    data = payload.model_dump()
    if not data.get("id"):
        data["id"] = str(uuid.uuid4())
    debt = Debt(**data)
    db.add(debt)
    await db.flush()
    return debt


@router.get("/{debt_id}", response_model=DebtOut)
async def get_debt(
    debt_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Debt:
    debt = await db.get(Debt, debt_id)
    if not debt or debt.deleted_at:
        raise HTTPException(status_code=404, detail="Debt not found")
    return debt


@router.patch("/{debt_id}", response_model=DebtOut)
async def update_debt(
    debt_id: str,
    payload: DebtUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Debt:
    debt = await db.get(Debt, debt_id)
    if not debt or debt.deleted_at:
        raise HTTPException(status_code=404, detail="Debt not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(debt, field, value)
    return debt


@router.delete("/{debt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_debt(
    debt_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> None:
    from datetime import datetime, timezone
    debt = await db.get(Debt, debt_id)
    if not debt or debt.deleted_at:
        raise HTTPException(status_code=404, detail="Debt not found")
    debt.deleted_at = datetime.now(timezone.utc)


@router.post("/{debt_id}/payments", response_model=DebtPaymentOut, status_code=status.HTTP_201_CREATED)
async def add_payment(
    debt_id: str,
    payload: DebtPaymentCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> DebtPayment:
    debt = await db.get(Debt, debt_id)
    if not debt or debt.deleted_at:
        raise HTTPException(status_code=404, detail="Debt not found")

    # Split payment into principal + interest
    from decimal import Decimal
    rate = Decimal(str(debt.interest_rate_monthly))
    balance = Decimal(debt.current_balance_cents)
    interest_due = int((balance * rate).quantize(Decimal("1")))
    principal_paid = max(0, payload.amount_cents - interest_due)
    interest_paid = min(interest_due, payload.amount_cents)

    payment = DebtPayment(
        id=str(uuid.uuid4()),
        debt_id=debt_id,
        amount_cents=payload.amount_cents,
        principal_cents=principal_paid,
        interest_cents=interest_paid,
        date=payload.date,
        notes=payload.notes,
    )
    db.add(payment)

    # Update debt balance
    debt.current_balance_cents = max(0, debt.current_balance_cents - principal_paid)
    if debt.current_balance_cents == 0:
        debt.status = "paid_off"

    await db.flush()
    return payment


@router.get("/{debt_id}/payments", response_model=list[DebtPaymentOut])
async def list_payments(
    debt_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> list[DebtPayment]:
    result = await db.execute(
        select(DebtPayment)
        .where(DebtPayment.debt_id == debt_id)
        .order_by(DebtPayment.date.desc())
    )
    return list(result.scalars().all())


@router.get("/{debt_id}/simulate")
async def simulate(
    debt_id: str,
    monthly_payment_cents: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> dict:
    debt = await db.get(Debt, debt_id)
    if not debt or debt.deleted_at:
        raise HTTPException(status_code=404, detail="Debt not found")

    result = simulate_debt_payment(
        balance_cents=debt.current_balance_cents,
        rate_monthly=float(debt.interest_rate_monthly),
        monthly_payment_cents=monthly_payment_cents,
    )
    return {
        "months": result.months,
        "total_paid_cents": result.total_paid_cents,
        "total_interest_cents": result.total_interest_cents,
        "final_balance_cents": result.final_balance_cents,
        "is_infeasible": result.is_infeasible,
        "minimum_payment_cents": int(
            debt.current_balance_cents * float(debt.interest_rate_monthly) + 1
        ) if float(debt.interest_rate_monthly) > 0 else 1,
    }


@router.post("/plan")
async def debt_plan(
    monthly_budget_cents: int,
    strategy: str = "avalanche",  # avalanche | snowball
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> dict:
    """
    Global debt payoff plan.

    Given a total monthly budget to allocate to debts, compute payoff schedules
    for two strategies simultaneously:
      - Avalanche: highest interest rate first.
      - Snowball: smallest balance first.

    Critical debts (rate ≥ 8% a.m.) are always highlighted.

    Body params (query params for simplicity):
      monthly_budget_cents: Total cents available per month for debt payments.
      strategy: "avalanche" | "snowball" (controls which order is primary output).

    Returns both strategies plus a comparison summary.
    """
    result = await db.execute(
        select(Debt).where(Debt.deleted_at.is_(None), Debt.status == "active")
    )
    debts = list(result.scalars().all())

    if not debts:
        return {"avalanche": [], "snowball": [], "comparison": {}}

    def _simulate_strategy(ordered_debts: list[Debt], total_budget: int) -> list[dict]:
        """
        Pay minimum on all debts; extra budget cascades to the first debt in order.
        Returns per-debt payoff details.
        """
        from decimal import Decimal

        balances = {d.id: d.current_balance_cents for d in ordered_debts}
        rates = {d.id: float(d.interest_rate_monthly) for d in ordered_debts}
        minimums = {
            d.id: max(
                d.monthly_payment_cents,
                int(d.current_balance_cents * float(d.interest_rate_monthly)) + 1
                if float(d.interest_rate_monthly) > 0 else 1,
            )
            for d in ordered_debts
        }

        payoff_month: dict[str, int] = {}
        total_paid: dict[str, int] = {d.id: 0 for d in ordered_debts}
        total_interest: dict[str, int] = {d.id: 0 for d in ordered_debts}

        month = 0
        max_months = 600  # 50 year safety cap

        while any(balances[d.id] > 0 for d in ordered_debts) and month < max_months:
            month += 1
            # Pay minimum on all active debts first
            remaining_budget = total_budget
            for d in ordered_debts:
                if balances[d.id] <= 0:
                    continue
                interest = int(balances[d.id] * rates[d.id])
                min_pmt = min(minimums[d.id], balances[d.id] + interest)
                actual = min(min_pmt, remaining_budget)
                if actual <= 0:
                    continue
                principal = max(0, actual - interest)
                balances[d.id] = max(0, balances[d.id] - principal)
                total_paid[d.id] += actual
                total_interest[d.id] += min(interest, actual)
                remaining_budget -= actual
                if balances[d.id] == 0 and d.id not in payoff_month:
                    payoff_month[d.id] = month

            # Apply extra budget to first active debt in order
            if remaining_budget > 0:
                for d in ordered_debts:
                    if balances[d.id] <= 0:
                        continue
                    interest = int(balances[d.id] * rates[d.id])
                    extra = min(remaining_budget, balances[d.id] + interest)
                    principal = max(0, extra - interest)
                    balances[d.id] = max(0, balances[d.id] - principal)
                    total_paid[d.id] += extra
                    total_interest[d.id] += min(interest, extra)
                    if balances[d.id] == 0 and d.id not in payoff_month:
                        payoff_month[d.id] = month
                    break

        out = []
        for d in ordered_debts:
            pm = payoff_month.get(d.id, max_months if balances[d.id] > 0 else 0)
            out.append({
                "debt_id": d.id,
                "name": d.name,
                "balance_cents": d.current_balance_cents,
                "interest_rate_monthly": float(d.interest_rate_monthly),
                "is_critical": float(d.interest_rate_monthly) >= CRITICAL_RATE_THRESHOLD,
                "payoff_month": pm,
                "total_paid_cents": total_paid[d.id],
                "total_interest_cents": total_interest[d.id],
                "is_infeasible": balances[d.id] > 0 and pm == max_months,
            })
        return out

    # Separate critical debts (always go first)
    critical = [d for d in debts if float(d.interest_rate_monthly) >= CRITICAL_RATE_THRESHOLD]
    non_critical = [d for d in debts if float(d.interest_rate_monthly) < CRITICAL_RATE_THRESHOLD]

    avalanche_order = (
        sorted(critical, key=lambda d: float(d.interest_rate_monthly), reverse=True)
        + sorted(non_critical, key=lambda d: float(d.interest_rate_monthly), reverse=True)
    )
    snowball_order = (
        sorted(critical, key=lambda d: float(d.interest_rate_monthly), reverse=True)
        + sorted(non_critical, key=lambda d: d.current_balance_cents)
    )

    avalanche_result = _simulate_strategy(avalanche_order, monthly_budget_cents)
    snowball_result = _simulate_strategy(snowball_order, monthly_budget_cents)

    # Comparison summary
    av_months = max((r["payoff_month"] for r in avalanche_result if not r["is_infeasible"]), default=0)
    sn_months = max((r["payoff_month"] for r in snowball_result if not r["is_infeasible"]), default=0)
    av_interest = sum(r["total_interest_cents"] for r in avalanche_result)
    sn_interest = sum(r["total_interest_cents"] for r in snowball_result)

    return {
        "avalanche": avalanche_result,
        "snowball": snowball_result,
        "comparison": {
            "avalanche_months": av_months,
            "snowball_months": sn_months,
            "avalanche_interest_cents": av_interest,
            "snowball_interest_cents": sn_interest,
            "interest_saved_by_avalanche_cents": max(0, sn_interest - av_interest),
            "months_saved_by_avalanche": max(0, sn_months - av_months),
        },
    }

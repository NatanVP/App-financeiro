"""
Financial calculation engine.

All monetary inputs/outputs are in cents (int).
Rates are monthly decimals (e.g. 0.145 = 14.5% a.m.).
Uses Decimal internally for precision; returns int (cents) for money.

Every public function has unit tests in tests/test_finance_engine.py.
"""

import math
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal


@dataclass(frozen=True)
class AmortizationResult:
    months: int
    monthly_payment_cents: int
    total_paid_cents: int
    total_interest_cents: int
    # True when payment < monthly interest (infeasible)
    is_infeasible: bool


@dataclass(frozen=True)
class SimulationResult:
    months: int
    total_paid_cents: int
    total_interest_cents: int
    final_balance_cents: int
    is_infeasible: bool


@dataclass(frozen=True)
class GoalProjection:
    months_needed: int
    monthly_needed_cents: int
    # already reached if current >= target
    already_reached: bool


def _to_d(cents: int) -> Decimal:
    return Decimal(cents)


def _round_cents(d: Decimal) -> int:
    return int(d.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


# ─── PMT / Amortization ───────────────────────────────────────────────────────

def compute_pmt(principal_cents: int, rate_monthly: float, months: int) -> int:
    """
    Standard Price table PMT formula.

    Args:
        principal_cents: Loan principal in cents.
        rate_monthly: Monthly interest rate as decimal (e.g. 0.145).
        months: Number of periods (months).

    Returns:
        Monthly payment in cents.

    Edge cases:
        - rate=0 → simple division.
        - months=1 → full principal (no interest).
        - principal=0 → 0.
    """
    if principal_cents <= 0:
        return 0
    if months <= 0:
        raise ValueError("months must be > 0")

    p = _to_d(principal_cents)

    if rate_monthly == 0:
        return _round_cents(p / months)

    r = Decimal(str(rate_monthly))
    # PMT = P * r * (1+r)^n / ((1+r)^n - 1)
    one_plus_r_n = (1 + r) ** months
    pmt = p * r * one_plus_r_n / (one_plus_r_n - 1)
    return _round_cents(pmt)


def compute_months_to_payoff(
    balance_cents: int, rate_monthly: float, payment_cents: int
) -> AmortizationResult:
    """
    Compute how many months to pay off a debt given a fixed monthly payment.

    Args:
        balance_cents: Current outstanding balance in cents.
        rate_monthly: Monthly interest rate as decimal.
        payment_cents: Fixed monthly payment in cents.

    Returns:
        AmortizationResult with months, totals, and infeasibility flag.

    Edge cases:
        - balance=0 → 0 months.
        - rate=0 → n = ceil(balance / payment).
        - payment <= monthly_interest → is_infeasible=True.
    """
    if balance_cents <= 0:
        return AmortizationResult(
            months=0,
            monthly_payment_cents=payment_cents,
            total_paid_cents=0,
            total_interest_cents=0,
            is_infeasible=False,
        )

    p = _to_d(balance_cents)
    pmt = _to_d(payment_cents)

    if rate_monthly == 0:
        months = math.ceil(balance_cents / payment_cents)
        total_paid = payment_cents * months
        # last payment may be smaller
        overpay = total_paid - balance_cents
        return AmortizationResult(
            months=months,
            monthly_payment_cents=payment_cents,
            total_paid_cents=total_paid - overpay,
            total_interest_cents=0,
            is_infeasible=False,
        )

    r = Decimal(str(rate_monthly))
    monthly_interest = p * r  # cents

    if pmt <= monthly_interest:
        # Payment doesn't cover interest — debt will never be paid off
        return AmortizationResult(
            months=0,
            monthly_payment_cents=payment_cents,
            total_paid_cents=0,
            total_interest_cents=0,
            is_infeasible=True,
        )

    # n = -ln(1 - P*r / PMT) / ln(1+r)
    try:
        ln_arg = 1 - (p * r / pmt)
        if ln_arg <= 0:
            # balance_cents is effectively 0 after next payment
            months = 1
        else:
            months = math.ceil(-math.log(float(ln_arg)) / math.log(float(1 + r)))
    except (ValueError, ZeroDivisionError):
        return AmortizationResult(
            months=0,
            monthly_payment_cents=payment_cents,
            total_paid_cents=0,
            total_interest_cents=0,
            is_infeasible=True,
        )

    # Simulate to get exact totals (avoid floating-point drift over many months)
    bal = p
    total_paid = Decimal(0)
    actual_months = 0
    for _ in range(months + 2):  # +2 as safety buffer
        if bal <= 0:
            break
        interest = (bal * r).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        this_pmt = min(pmt, bal + interest)
        principal_paid = this_pmt - interest
        bal -= principal_paid
        total_paid += this_pmt
        actual_months += 1

    total_paid_cents = _round_cents(total_paid)
    total_interest_cents = total_paid_cents - balance_cents

    return AmortizationResult(
        months=actual_months,
        monthly_payment_cents=payment_cents,
        total_paid_cents=total_paid_cents,
        total_interest_cents=max(0, total_interest_cents),
        is_infeasible=False,
    )


def simulate_debt_payment(
    balance_cents: int, rate_monthly: float, monthly_payment_cents: int
) -> SimulationResult:
    """
    Full debt payment simulation.

    Args:
        balance_cents: Current outstanding balance in cents.
        rate_monthly: Monthly interest rate.
        monthly_payment_cents: Monthly payment in cents.

    Returns:
        SimulationResult.
    """
    result = compute_months_to_payoff(balance_cents, rate_monthly, monthly_payment_cents)
    if result.is_infeasible:
        return SimulationResult(
            months=0,
            total_paid_cents=0,
            total_interest_cents=0,
            final_balance_cents=balance_cents,
            is_infeasible=True,
        )
    return SimulationResult(
        months=result.months,
        total_paid_cents=result.total_paid_cents,
        total_interest_cents=result.total_interest_cents,
        final_balance_cents=0,
        is_infeasible=False,
    )


# ─── Goals ────────────────────────────────────────────────────────────────────

def compute_goal_projection(
    target_cents: int,
    current_cents: int,
    monthly_contribution_cents: int,
) -> GoalProjection:
    """
    How many months to reach goal given a fixed monthly contribution.

    No investment return assumed (conservative projection).

    Args:
        target_cents: Goal target in cents.
        current_cents: Amount already saved in cents.
        monthly_contribution_cents: Monthly addition in cents.

    Returns:
        GoalProjection.

    Edge cases:
        - current >= target → already_reached=True.
        - monthly=0 → infinite (returns 9999).
        - target=0 → already_reached=True.
    """
    if target_cents <= 0 or current_cents >= target_cents:
        return GoalProjection(
            months_needed=0,
            monthly_needed_cents=0,
            already_reached=True,
        )

    remaining = target_cents - current_cents

    if monthly_contribution_cents <= 0:
        return GoalProjection(
            months_needed=9999,
            monthly_needed_cents=0,
            already_reached=False,
        )

    months = math.ceil(remaining / monthly_contribution_cents)
    return GoalProjection(
        months_needed=months,
        monthly_needed_cents=monthly_contribution_cents,
        already_reached=False,
    )


def compute_monthly_needed_for_goal(
    target_cents: int, current_cents: int, months: int
) -> int:
    """
    How much to save per month to reach goal in `months` months.

    Args:
        target_cents: Goal target in cents.
        current_cents: Current savings in cents.
        months: Number of months available.

    Returns:
        Monthly contribution needed in cents (rounded up).
    """
    if months <= 0:
        raise ValueError("months must be > 0")
    remaining = max(0, target_cents - current_cents)
    return math.ceil(remaining / months)


# ─── Budget ───────────────────────────────────────────────────────────────────

def compute_budget_variance(budget_cents: int, spent_cents: int) -> dict[str, int | float]:
    """
    Compute budget utilization and variance.

    Returns:
        dict with keys: variance_cents, utilization_pct, is_over_budget.
    """
    variance = budget_cents - spent_cents  # positive = under budget
    utilization = (spent_cents / budget_cents * 100) if budget_cents > 0 else 0.0
    return {
        "variance_cents": variance,
        "utilization_pct": round(utilization, 1),
        "is_over_budget": spent_cents > budget_cents,
    }


# ─── Allocation ───────────────────────────────────────────────────────────────

def compute_allocation(
    surplus_cents: int, reserve_pct: int, debts_pct: int, goals_pct: int
) -> dict[str, int]:
    """
    Split surplus into reserve / debts / goals buckets.

    Args:
        surplus_cents: Available money to allocate (income - expenses).
        reserve_pct, debts_pct, goals_pct: Must sum to 100.

    Returns:
        dict with reserve_cents, debts_cents, goals_cents.
    """
    if surplus_cents <= 0:
        return {"reserve_cents": 0, "debts_cents": 0, "goals_cents": 0}

    s = _to_d(surplus_cents)
    reserve = _round_cents(s * reserve_pct / 100)
    debts = _round_cents(s * debts_pct / 100)
    # goals gets the remainder to avoid rounding errors
    goals = surplus_cents - reserve - debts

    return {
        "reserve_cents": reserve,
        "debts_cents": debts,
        "goals_cents": max(0, goals),
    }


# ─── Dashboard ────────────────────────────────────────────────────────────────

def compute_surplus(income_cents: int, expense_cents: int) -> int:
    """Available surplus: income - expenses. Can be negative."""
    return income_cents - expense_cents

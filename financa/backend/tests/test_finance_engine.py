"""
Unit tests for finance_engine.py.

Coverage per spec:
  - Happy path
  - Edge: balance=0, rate=0, term=1 month
  - Infeasible: payment <= monthly interest
"""
import pytest

from app.services.finance_engine import (
    AmortizationResult,
    compute_allocation,
    compute_budget_variance,
    compute_goal_projection,
    compute_monthly_needed_for_goal,
    compute_months_to_payoff,
    compute_pmt,
    compute_surplus,
    simulate_debt_payment,
)


# ─── compute_pmt ──────────────────────────────────────────────────────────────

class TestComputePmt:
    def test_happy_path(self) -> None:
        """R$ 10,000 at 2% monthly for 12 months"""
        # PMT = 10000*0.02*(1.02^12) / (1.02^12-1) ≈ R$944.87 → 94487 cents
        pmt = compute_pmt(1_000_000, 0.02, 12)
        # Allow ±5 cents rounding
        assert 94480 <= pmt <= 94495

    def test_edge_zero_rate(self) -> None:
        """With 0% rate, PMT = P/n"""
        pmt = compute_pmt(1_200_00, 0.0, 12)
        assert pmt == 10_000  # R$1200 / 12 = R$100

    def test_edge_one_month(self) -> None:
        """1 month term: entire principal in one payment"""
        pmt = compute_pmt(50_000, 0.1, 1)  # R$500 at 10%
        # PMT = 500*0.1*(1.1) / (1.1-1) = 55 / 0.1 = 550
        assert pmt == 55_000  # R$550 in cents

    def test_edge_zero_principal(self) -> None:
        """Zero principal returns 0"""
        assert compute_pmt(0, 0.05, 12) == 0

    def test_invalid_months(self) -> None:
        with pytest.raises(ValueError):
            compute_pmt(100_000, 0.02, 0)


# ─── compute_months_to_payoff ─────────────────────────────────────────────────

class TestComputeMonthsToPayoff:
    def test_happy_path(self) -> None:
        """R$5,000 debt at 3% monthly with R$300/month payment"""
        result = compute_months_to_payoff(500_000, 0.03, 30_000)
        assert not result.is_infeasible
        assert result.months > 0
        assert result.total_interest_cents > 0
        assert result.total_paid_cents == result.months * 30_000 or \
               abs(result.total_paid_cents - result.months * 30_000) < 30_000

    def test_edge_zero_balance(self) -> None:
        """Zero balance → zero months"""
        result = compute_months_to_payoff(0, 0.05, 10_000)
        assert result.months == 0
        assert result.total_paid_cents == 0
        assert not result.is_infeasible

    def test_edge_zero_rate(self) -> None:
        """No interest: months = ceil(balance / payment)"""
        result = compute_months_to_payoff(100_000, 0.0, 30_000)
        assert not result.is_infeasible
        assert result.months == 4  # ceil(100000/30000) = 4
        assert result.total_interest_cents == 0

    def test_edge_one_month(self) -> None:
        """Payment larger than balance+interest → paid in 1 month"""
        result = compute_months_to_payoff(10_000, 0.02, 100_000)
        assert not result.is_infeasible
        assert result.months == 1

    def test_infeasible_payment_equals_interest(self) -> None:
        """Payment exactly equals monthly interest → infeasible"""
        # balance=100000 cents, rate=0.02 → monthly interest=2000
        result = compute_months_to_payoff(100_000, 0.02, 2_000)
        assert result.is_infeasible

    def test_infeasible_payment_less_than_interest(self) -> None:
        """Payment below monthly interest → infeasible"""
        result = compute_months_to_payoff(100_000, 0.145, 500)
        # monthly interest = 100000*0.145 = 14500 > 500
        assert result.is_infeasible


# ─── simulate_debt_payment ────────────────────────────────────────────────────

class TestSimulateDebtPayment:
    def test_happy_path(self) -> None:
        result = simulate_debt_payment(500_000, 0.02, 50_000)
        assert not result.is_infeasible
        assert result.final_balance_cents == 0
        assert result.total_interest_cents >= 0

    def test_infeasible(self) -> None:
        result = simulate_debt_payment(1_000_000, 0.2, 1_000)
        assert result.is_infeasible
        assert result.final_balance_cents == 1_000_000

    def test_zero_balance(self) -> None:
        result = simulate_debt_payment(0, 0.05, 10_000)
        assert result.months == 0
        assert not result.is_infeasible


# ─── compute_goal_projection ──────────────────────────────────────────────────

class TestComputeGoalProjection:
    def test_happy_path(self) -> None:
        """R$10,000 goal, R$2,000 saved, R$1,000/month → 8 months"""
        result = compute_goal_projection(1_000_000, 200_000, 100_000)
        assert not result.already_reached
        assert result.months_needed == 8

    def test_already_reached(self) -> None:
        """Current >= target → already reached"""
        result = compute_goal_projection(500_000, 500_000, 50_000)
        assert result.already_reached
        assert result.months_needed == 0

    def test_zero_target(self) -> None:
        result = compute_goal_projection(0, 0, 10_000)
        assert result.already_reached

    def test_zero_contribution(self) -> None:
        result = compute_goal_projection(100_000, 0, 0)
        assert not result.already_reached
        assert result.months_needed == 9999

    def test_edge_one_month(self) -> None:
        """Remaining exactly equals one contribution"""
        result = compute_goal_projection(100_000, 0, 100_000)
        assert result.months_needed == 1


# ─── compute_monthly_needed_for_goal ──────────────────────────────────────────

class TestComputeMonthlyNeeded:
    def test_happy_path(self) -> None:
        # Target R$12,000, current R$0, in 12 months → R$1,000/month
        result = compute_monthly_needed_for_goal(1_200_000, 0, 12)
        assert result == 100_000

    def test_partial_current(self) -> None:
        result = compute_monthly_needed_for_goal(1_200_000, 600_000, 6)
        assert result == 100_000

    def test_invalid_months(self) -> None:
        with pytest.raises(ValueError):
            compute_monthly_needed_for_goal(100_000, 0, 0)


# ─── compute_budget_variance ──────────────────────────────────────────────────

class TestComputeBudgetVariance:
    def test_under_budget(self) -> None:
        result = compute_budget_variance(100_000, 80_000)
        assert result["variance_cents"] == 20_000
        assert result["utilization_pct"] == 80.0
        assert not result["is_over_budget"]

    def test_over_budget(self) -> None:
        result = compute_budget_variance(100_000, 120_000)
        assert result["variance_cents"] == -20_000
        assert result["utilization_pct"] == 120.0
        assert result["is_over_budget"]

    def test_zero_budget(self) -> None:
        result = compute_budget_variance(0, 10_000)
        assert result["utilization_pct"] == 0.0


# ─── compute_allocation ───────────────────────────────────────────────────────

class TestComputeAllocation:
    def test_happy_path(self) -> None:
        result = compute_allocation(100_000, 50, 20, 30)
        assert result["reserve_cents"] == 50_000
        assert result["debts_cents"] == 20_000
        assert result["goals_cents"] == 30_000
        # No rounding loss
        assert result["reserve_cents"] + result["debts_cents"] + result["goals_cents"] == 100_000

    def test_zero_surplus(self) -> None:
        result = compute_allocation(0, 50, 20, 30)
        assert all(v == 0 for v in result.values())

    def test_negative_surplus(self) -> None:
        result = compute_allocation(-10_000, 50, 20, 30)
        assert all(v == 0 for v in result.values())


# ─── compute_surplus ──────────────────────────────────────────────────────────

class TestComputeSurplus:
    def test_positive(self) -> None:
        assert compute_surplus(1_000_000, 750_000) == 250_000

    def test_negative(self) -> None:
        assert compute_surplus(500_000, 800_000) == -300_000

    def test_zero(self) -> None:
        assert compute_surplus(500_000, 500_000) == 0

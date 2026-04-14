/**
 * Client-side financial calculations (mirrors backend finance_engine.py).
 * Used for instant simulation feedback without a round-trip to the server.
 */
import { money, Money } from './money';

export interface AmortizationResult {
  months: number;
  monthlyPaymentCents: Money;
  totalPaidCents: Money;
  totalInterestCents: Money;
  isInfeasible: boolean;
}

export interface GoalProjection {
  monthsNeeded: number;
  monthlyNeededCents: Money;
  alreadyReached: boolean;
}

/**
 * PMT — standard Price table payment formula.
 * rate=0: simple division. months=1: full principal.
 */
export function computePMT(
  principalCents: Money,
  rateMonthly: number,
  months: number,
): Money {
  if (principalCents <= 0) return money(0);
  if (months <= 0) throw new Error('months must be > 0');

  if (rateMonthly === 0) {
    return money(Math.round(principalCents / months));
  }

  const r = rateMonthly;
  const pow = Math.pow(1 + r, months);
  const pmt = (principalCents * r * pow) / (pow - 1);
  return money(Math.round(pmt));
}

/**
 * Months to pay off debt at given monthly payment.
 * Returns isInfeasible=true when payment <= monthly interest.
 */
export function computeMonthsToPayoff(
  balanceCents: Money,
  rateMonthly: number,
  paymentCents: Money,
): AmortizationResult {
  if (balanceCents <= 0) {
    return {
      months: 0,
      monthlyPaymentCents: paymentCents,
      totalPaidCents: money(0),
      totalInterestCents: money(0),
      isInfeasible: false,
    };
  }

  if (rateMonthly === 0) {
    const months = Math.ceil(balanceCents / paymentCents);
    return {
      months,
      monthlyPaymentCents: paymentCents,
      totalPaidCents: money(balanceCents),
      totalInterestCents: money(0),
      isInfeasible: false,
    };
  }

  const r = rateMonthly;
  const monthlyInterest = balanceCents * r;

  if (paymentCents <= monthlyInterest) {
    return {
      months: 0,
      monthlyPaymentCents: paymentCents,
      totalPaidCents: money(0),
      totalInterestCents: money(0),
      isInfeasible: true,
    };
  }

  // n = -ln(1 - P*r / PMT) / ln(1+r)
  const lnArg = 1 - (balanceCents * r) / paymentCents;
  if (lnArg <= 0) {
    return {
      months: 1,
      monthlyPaymentCents: paymentCents,
      totalPaidCents: money(Math.round(balanceCents * (1 + r))),
      totalInterestCents: money(Math.round(balanceCents * r)),
      isInfeasible: false,
    };
  }

  const months = Math.ceil(-Math.log(lnArg) / Math.log(1 + r));

  // Simulate for accurate totals
  let bal = balanceCents;
  let totalPaid = 0;
  let actualMonths = 0;

  for (let i = 0; i < months + 2 && bal > 0; i++) {
    const interest = Math.round(bal * r);
    const thisPmt = Math.min(paymentCents, bal + interest);
    const principalPaid = thisPmt - interest;
    bal -= principalPaid;
    totalPaid += thisPmt;
    actualMonths++;
  }

  return {
    months: actualMonths,
    monthlyPaymentCents: paymentCents,
    totalPaidCents: money(totalPaid),
    totalInterestCents: money(Math.max(0, totalPaid - balanceCents)),
    isInfeasible: false,
  };
}

/**
 * Goal projection: months to reach target with fixed monthly contribution.
 */
export function computeGoalProjection(
  targetCents: Money,
  currentCents: Money,
  monthlyContributionCents: Money,
): GoalProjection {
  if (targetCents <= 0 || currentCents >= targetCents) {
    return { monthsNeeded: 0, monthlyNeededCents: money(0), alreadyReached: true };
  }

  const remaining = targetCents - currentCents;

  if (monthlyContributionCents <= 0) {
    return { monthsNeeded: 9999, monthlyNeededCents: money(0), alreadyReached: false };
  }

  const months = Math.ceil(remaining / monthlyContributionCents);
  return {
    monthsNeeded: months,
    monthlyNeededCents: monthlyContributionCents,
    alreadyReached: false,
  };
}

/**
 * Allocation split: given surplus, return bucket amounts.
 * goals gets the remainder to avoid rounding drift.
 */
export function computeAllocation(
  surplusCents: Money,
  reservePct: number,
  debtsPct: number,
  goalsPct: number,
): { reserveCents: Money; debtsCents: Money; goalsCents: Money } {
  if (surplusCents <= 0) {
    return {
      reserveCents: money(0),
      debtsCents: money(0),
      goalsCents: money(0),
    };
  }
  const reserve = money(Math.round((surplusCents * reservePct) / 100));
  const debts = money(Math.round((surplusCents * debtsPct) / 100));
  const goals = money(surplusCents - reserve - debts);
  return { reserveCents: reserve, debtsCents: debts, goalsCents: money(Math.max(0, goals)) };
}

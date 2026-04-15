import { create } from 'zustand';
import { money, Money } from '@/lib/money';

export interface Budget {
  id: string;
  category_id: string;
  year_month: string;  // YYYY-MM
  amount_cents: Money;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface BudgetState {
  budgets: Budget[];
  setBudgets: (budgets: Budget[]) => void;
  upsertBudget: (budget: Budget) => void;
  deleteBudget: (id: string) => void;
  getBudgetsForMonth: (yearMonth: string) => Budget[];
  getActiveBudgets: () => Budget[];  // current month
  copyFromPreviousMonth: (targetMonth: string, sourceMonth: string) => void;
}

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  setBudgets: (budgets) => set({ budgets }),
  upsertBudget: (budget) =>
    set((state) => {
      const existing = state.budgets.findIndex((b) => b.id === budget.id);
      if (existing >= 0) {
        const updated = [...state.budgets];
        updated[existing] = budget;
        return { budgets: updated };
      }
      return { budgets: [budget, ...state.budgets] };
    }),
  deleteBudget: (id) =>
    set((state) => ({
      budgets: state.budgets.map((b) =>
        b.id === id ? { ...b, deleted_at: new Date().toISOString() } : b,
      ),
    })),
  getBudgetsForMonth: (yearMonth) =>
    get().budgets.filter((b) => !b.deleted_at && b.year_month === yearMonth),
  getActiveBudgets: () =>
    get().getBudgetsForMonth(currentYearMonth()),

  copyFromPreviousMonth: (targetMonth, sourceMonth) => {
    const sourceBudgets = get().getBudgetsForMonth(sourceMonth);
    const targetBudgets = get().getBudgetsForMonth(targetMonth);
    const targetCategoryIds = new Set(targetBudgets.map((b) => b.category_id));
    const now = new Date().toISOString();
    for (const budget of sourceBudgets) {
      if (!targetCategoryIds.has(budget.category_id)) {
        get().upsertBudget({
          ...budget,
          id: `budget-${budget.category_id}-${targetMonth}-${Date.now()}`,
          year_month: targetMonth,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });
      }
    }
  },
}));

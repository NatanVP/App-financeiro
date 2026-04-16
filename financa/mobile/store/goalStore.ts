import { create } from 'zustand';
import { money, Money } from '@/lib/money';

export interface Goal {
  id: string;
  name: string;
  target_cents: Money;
  current_cents: Money;
  target_date: string | null;
  icon: string;
  color: string;
  status: string;
  /** Valor da parcela mensal (0 = sem parcelamento) */
  monthly_cents: number;
  /** Total de parcelas planejadas (0 = sem parcelamento) */
  months_total: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface GoalState {
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  getActiveGoals: () => Goal[];
  getTotalProgress: () => { currentCents: Money; targetCents: Money; pct: number };
  /**
   * Verifica se há parcelas em atraso e cria as transações faltantes.
   * Deve ser chamado sempre que a tela de missões abrir.
   */
  processInstallments: (
    addTransaction: (tx: import('@/store/transactionStore').Transaction) => void,
    getTransactions: () => import('@/store/transactionStore').Transaction[],
    defaultAccountId: string,
  ) => void;
}

/** Diferença em meses completos entre duas datas */
function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],

  setGoals: (goals) => set({ goals }),

  addGoal: (goal) => set((state) => ({ goals: [goal, ...state.goals] })),

  updateGoal: (id, updates) =>
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === id ? { ...g, ...updates, updated_at: new Date().toISOString() } : g,
      ),
    })),

  deleteGoal: (id) =>
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === id ? { ...g, deleted_at: new Date().toISOString() } : g,
      ),
    })),

  getActiveGoals: () =>
    get().goals.filter((g) => g.status === 'active' && !g.deleted_at),

  getTotalProgress: () => {
    const active = get().getActiveGoals();
    const currentCents = money(active.reduce((s, g) => s + g.current_cents, 0));
    const targetCents = money(active.reduce((s, g) => s + g.target_cents, 0));
    const pct = targetCents > 0 ? (currentCents / targetCents) * 100 : 0;
    return { currentCents, targetCents, pct: Math.round(pct * 10) / 10 };
  },

  processInstallments: (addTransaction, getTransactions, defaultAccountId) => {
    const { getActiveGoals, updateGoal } = get();
    const goals = getActiveGoals();
    const today = new Date();
    // Início do mês atual — não processa o mês corrente (tem botão manual)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const transactions = getTransactions();

    for (const goal of goals) {
      if (!goal.monthly_cents || goal.months_total <= 0) continue;

      const created = new Date(goal.created_at);
      // Parcelas de meses que JÁ PASSARAM completamente (exclui o mês atual)
      const monthsFullyPast = monthsBetween(created, startOfMonth);
      const autoDue = Math.min(monthsFullyPast + 1, goal.months_total);

      const paidCount = transactions.filter(
        (t) => !t.deleted_at && t.notes === goal.id && t.category_id === 'goal_deposit',
      ).length;

      const newCount = autoDue - paidCount;
      if (newCount <= 0) continue;

      const now = new Date().toISOString();
      let addedCents = 0;

      for (let i = 0; i < newCount; i++) {
        const installDate = new Date(created);
        installDate.setMonth(created.getMonth() + paidCount + i);
        if (installDate >= startOfMonth) break; // não cria o mês atual

        addTransaction({
          id: `tx-inst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          account_id: defaultAccountId,
          category_id: 'goal_deposit',
          amount_cents: money(goal.monthly_cents),
          type: 'expense',
          description: `Parcela: ${goal.name}`,
          date: installDate.toISOString().slice(0, 10),
          notes: goal.id,
          transfer_to_account_id: null,
          is_reconciled: false,
          device_id: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });
        addedCents += goal.monthly_cents;
      }

      if (addedCents > 0) {
        updateGoal(goal.id, {
          current_cents: money(Math.min(goal.current_cents + addedCents, goal.target_cents)),
        });
      }
    }
  },
}));

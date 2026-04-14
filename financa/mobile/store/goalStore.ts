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
}));

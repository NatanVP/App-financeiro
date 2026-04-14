import { create } from 'zustand';
import { money, Money } from '@/lib/money';

export interface EmergencyReserve {
  id: number;
  target_months: number;
  target_cents: Money;
  current_cents: Money;
  account_id: string | null;
  progress_pct: number;
  remaining_cents: Money;
  updated_at: string;
}

interface EmergencyReserveState {
  reserve: EmergencyReserve | null;
  setReserve: (r: EmergencyReserve) => void;
  updateReserve: (updates: Partial<EmergencyReserve>) => void;
}

export const useEmergencyReserveStore = create<EmergencyReserveState>((set, get) => ({
  reserve: null,
  setReserve: (reserve) => set({ reserve }),
  updateReserve: (updates) =>
    set((state) => {
      if (!state.reserve) return state;
      const next = { ...state.reserve, ...updates };
      const progressPct =
        next.target_cents > 0 ? Math.min(100, (next.current_cents / next.target_cents) * 100) : 0;
      const remaining = money(Math.max(0, next.target_cents - next.current_cents));
      return { reserve: { ...next, progress_pct: progressPct, remaining_cents: remaining } };
    }),
}));

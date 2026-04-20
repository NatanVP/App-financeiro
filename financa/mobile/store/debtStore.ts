import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { money, Money } from '@/lib/money';

export interface Debt {
  id: string;
  name: string;
  type: string;
  bank_id?: string | null;
  principal_cents: Money;
  current_balance_cents: Money;
  interest_rate_monthly: number;
  start_date: string;
  due_date: string | null;
  monthly_payment_cents: Money;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface DebtState {
  debts: Debt[];
  setDebts: (debts: Debt[]) => void;
  addDebt: (debt: Debt) => void;
  updateDebt: (id: string, updates: Partial<Debt>) => void;
  applyPayment: (id: string, amountCents: Money) => void;
  deleteDebt: (id: string) => void;
  getActiveDebts: () => Debt[];
  getTotalBalance: () => Money;
}

export const useDebtStore = create<DebtState>()(
  persist(
    (set, get) => ({
      debts: [],

      setDebts: (debts) => set({ debts }),

      addDebt: (debt) => set((state) => ({ debts: [debt, ...state.debts] })),

      updateDebt: (id, updates) =>
        set((state) => ({
          debts: state.debts.map((d) =>
            d.id === id ? { ...d, ...updates, updated_at: new Date().toISOString() } : d,
          ),
        })),

      applyPayment: (id, amountCents) =>
        set((state) => ({
          debts: state.debts.map((d) => {
            if (d.id !== id) return d;

            const nextBalance = money(Math.max(0, d.current_balance_cents - amountCents));
            return {
              ...d,
              current_balance_cents: nextBalance,
              status: nextBalance === 0 ? 'paid' : d.status,
              updated_at: new Date().toISOString(),
            };
          }),
        })),

      deleteDebt: (id) =>
        set((state) => ({
          debts: state.debts.map((d) =>
            d.id === id ? { ...d, deleted_at: new Date().toISOString() } : d,
          ),
        })),

      getActiveDebts: () =>
        get().debts.filter((d) => d.status === 'active' && !d.deleted_at),

      getTotalBalance: () =>
        money(
          get()
            .getActiveDebts()
            .reduce((s, d) => s + d.current_balance_cents, 0),
        ),
    }),
    {
      name: 'financa:debts',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ debts: state.debts }),
    }
  )
);

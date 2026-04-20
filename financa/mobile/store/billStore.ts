import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { money, Money } from '@/lib/money';

export interface Bill {
  id: string;
  name: string;
  amount_cents: Money;
  category_id: string | null;
  due_date: string;
  is_recurring: boolean;
  recurrence_day: number | null;
  status: 'pending' | 'paid' | 'overdue' | 'scheduled' | 'cancelled';
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface BillState {
  bills: Bill[];
  setBills: (bills: Bill[]) => void;
  addBill: (bill: Bill) => void;
  updateBill: (id: string, updates: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
  getRecurringBills: () => Bill[];
  getPendingBills: () => Bill[];
  getOverdueBills: () => Bill[];
  getTotalPending: () => Money;
}

export const useBillStore = create<BillState>()(
  persist(
    (set, get) => ({
      bills: [],

      setBills: (bills) => set({ bills }),

      addBill: (bill) => set((state) => ({ bills: [bill, ...state.bills] })),

      updateBill: (id, updates) =>
        set((state) => ({
          bills: state.bills.map((b) =>
            b.id === id ? { ...b, ...updates, updated_at: new Date().toISOString() } : b,
          ),
        })),

      deleteBill: (id) =>
        set((state) => ({
          bills: state.bills.map((b) =>
            b.id === id ? { ...b, deleted_at: new Date().toISOString() } : b,
          ),
        })),

      getRecurringBills: () =>
        get().bills.filter((b) => !b.deleted_at && b.is_recurring),

      getPendingBills: () =>
        get().bills.filter((b) => !b.deleted_at && b.status === 'pending'),

      getOverdueBills: () =>
        get().bills.filter((b) => !b.deleted_at && b.status === 'overdue'),

      getTotalPending: () =>
        money(
          get()
            .bills.filter((b) => !b.deleted_at && b.status !== 'paid' && b.status !== 'cancelled')
            .reduce((s, b) => s + b.amount_cents, 0),
        ),
    }),
    {
      name: 'financa:bills',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ bills: state.bills }),
    },
  ),
);

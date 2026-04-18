import { create } from 'zustand';
import { money, Money } from '@/lib/money';

import { useCategoryStore } from '@/store/categoryStore';

export interface Transaction {
  id: string;
  account_id: string;
  category_id: string | null;
  amount_cents: Money;
  type: 'income' | 'expense' | 'transfer' | 'credit';
  description: string;
  date: string;
  notes: string | null;
  transfer_to_account_id: string | null;
  is_reconciled: boolean;
  device_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  getMonthlyTotals: (year: number, month: number) => { incomeCents: Money; expenseCents: Money };
  getByDateRange: (from: string, to: string) => Transaction[];
  getTopCategories: (year: number, month: number, limit?: number) => { name: string; amountCents: Money }[];
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,

  setTransactions: (transactions) => set({ transactions }),

  addTransaction: (transaction) =>
    set((state) => ({ transactions: [transaction, ...state.transactions] })),

  updateTransaction: (id, updates) =>
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t,
      ),
    })),

  deleteTransaction: (id) =>
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, deleted_at: new Date().toISOString() } : t,
      ),
    })),

  getMonthlyTotals: (year, month) => {
    const { transactions } = get();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    // credit transactions are excluded — they are tracked via the invoice, not here
    const active = transactions.filter(
      (t) => t.date.startsWith(prefix) && !t.deleted_at && t.type !== 'credit',
    );
    const incomeCents = money(
      active.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount_cents, 0),
    );
    const expenseCents = money(
      active.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount_cents, 0),
    );
    return { incomeCents, expenseCents };
  },

  getByDateRange: (from, to) => {
    const { transactions } = get();
    return transactions.filter(
      (t) => !t.deleted_at && t.date >= from && t.date <= to,
    );
  },

  getTopCategories: (year, month, limit = 5) => {
    const { transactions } = get();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const totals: Record<string, number> = {};
    for (const t of transactions) {
      if (t.deleted_at || (t.type !== 'expense' && t.type !== 'credit') || !t.date.startsWith(prefix)) continue;
      const key = t.category_id ?? '__sem_categoria__';
      totals[key] = (totals[key] ?? 0) + t.amount_cents;
    }
    const { getCategoryName } = useCategoryStore.getState();
    // Resolve names and merge entries that map to the same display name
    // (happens when category_id exists in transactions but not yet in local store)
    const byName: Record<string, number> = {};
    for (const [id, amount] of Object.entries(totals)) {
      const name = getCategoryName(id);
      byName[name] = (byName[name] ?? 0) + amount;
    }
    return Object.entries(byName)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([name, total]) => ({
        name,
        amountCents: money(total),
      }));
  },
}));

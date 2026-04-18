import { create } from 'zustand';
import { money, Money } from '@/lib/money';

export interface Account {
  id: string;
  name: string;
  bank: string;
  type: string; // checking | savings | investment | wallet | other
  balance_cents: Money;
  initial_balance_cents: Money;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface AccountState {
  accounts: Account[];
  setAccounts: (accounts: Account[]) => void;
  addAccount: (account: Account) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  getActiveAccounts: () => Account[];
  getTotalBalance: () => Money;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],

  setAccounts: (accounts) => set({ accounts }),

  addAccount: (account) =>
    set((state) => ({ accounts: [account, ...state.accounts] })),

  updateAccount: (id, updates) =>
    set((state) => ({
      accounts: state.accounts.map((a) =>
        a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a,
      ),
    })),

  deleteAccount: (id) =>
    set((state) => ({
      accounts: state.accounts.map((a) =>
        a.id === id ? { ...a, deleted_at: new Date().toISOString() } : a,
      ),
    })),

  getActiveAccounts: () =>
    get().accounts.filter((a) => a.is_active && !a.deleted_at),

  getTotalBalance: () => {
    const total = get()
      .accounts.filter((a) => a.is_active && !a.deleted_at)
      .reduce((sum, a) => sum + a.balance_cents, 0);
    return money(total);
  },
}));

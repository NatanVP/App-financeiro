import { create } from 'zustand';
import { money, Money } from '@/lib/money';

export interface Account {
  id: string;
  name: string;
  type: string; // checking | savings | investment | wallet | other
  balance_cents: Money;
  currency: string;
  color: string | null;
  icon: string | null;
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

const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'nubank',
    name: 'Nubank',
    type: 'checking',
    balance_cents: money(0),
    currency: 'BRL',
    color: '#820AD1',
    icon: 'credit-card',
    is_active: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    deleted_at: null,
  },
  {
    id: 'itau',
    name: 'Itaú',
    type: 'checking',
    balance_cents: money(0),
    currency: 'BRL',
    color: '#EC7000',
    icon: 'bank',
    is_active: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    deleted_at: null,
  },
  {
    id: 'inter',
    name: 'Inter',
    type: 'checking',
    balance_cents: money(0),
    currency: 'BRL',
    color: '#FF6600',
    icon: 'bank-outline',
    is_active: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    deleted_at: null,
  },
];

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: DEFAULT_ACCOUNTS,

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

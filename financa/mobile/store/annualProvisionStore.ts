import { create } from 'zustand';
import { money, Money } from '@/lib/money';

export interface AnnualProvision {
  id: string;
  name: string;
  annual_amount_cents: Money;
  due_month: number;  // 1-12
  accumulated_cents: Money;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface AnnualProvisionState {
  provisions: AnnualProvision[];
  setProvisions: (items: AnnualProvision[]) => void;
  upsertProvision: (item: AnnualProvision) => void;
  deleteProvision: (id: string) => void;
  getActiveProvisions: () => AnnualProvision[];
  getTotalMonthlyProvision: () => Money;
}

export const useAnnualProvisionStore = create<AnnualProvisionState>((set, get) => ({
  provisions: [],
  setProvisions: (provisions) => set({ provisions }),
  upsertProvision: (item) =>
    set((state) => {
      const idx = state.provisions.findIndex((p) => p.id === item.id);
      if (idx >= 0) {
        const updated = [...state.provisions];
        updated[idx] = item;
        return { provisions: updated };
      }
      return { provisions: [item, ...state.provisions] };
    }),
  deleteProvision: (id) =>
    set((state) => ({
      provisions: state.provisions.map((p) =>
        p.id === id ? { ...p, deleted_at: new Date().toISOString() } : p,
      ),
    })),
  getActiveProvisions: () =>
    get().provisions.filter((p) => !p.deleted_at),
  getTotalMonthlyProvision: () =>
    money(
      get()
        .getActiveProvisions()
        .reduce((s, p) => s + Math.ceil(p.annual_amount_cents / 12), 0),
    ),
}));

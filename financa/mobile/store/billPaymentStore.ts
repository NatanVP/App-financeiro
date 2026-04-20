/**
 * Rastreia pagamentos mensais de cobranças recorrentes.
 * Local-only — não entra no sync com o servidor.
 * Chave: `${billId}:${YYYY-MM}`
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BillPaymentState {
  paidMap: Record<string, boolean>;
  isPaid: (billId: string, monthKey: string) => boolean;
  setPaid: (billId: string, monthKey: string, paid: boolean) => void;
  /** Auto-marca como pago se hoje >= dia de vencimento e mês ainda não registrado. */
  autoMarkDue: (bills: { id: string; recurrence_day: number | null }[]) => void;
}

export const useBillPaymentStore = create<BillPaymentState>()(
  persist(
    (set, get) => ({
      paidMap: {},

      isPaid: (billId, monthKey) =>
        !!get().paidMap[`${billId}:${monthKey}`],

      setPaid: (billId, monthKey, paid) =>
        set((state) => ({
          paidMap: { ...state.paidMap, [`${billId}:${monthKey}`]: paid },
        })),

      autoMarkDue: (bills) => {
        const today = new Date();
        const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const todayDay = today.getDate();
        const updates: Record<string, boolean> = {};

        for (const bill of bills) {
          if (!bill.recurrence_day) continue;
          const key = `${bill.id}:${monthKey}`;
          // Só auto-marca se ainda não foi registrado (não sobrescreve decisão manual)
          if (todayDay >= bill.recurrence_day && !(key in get().paidMap)) {
            updates[key] = true;
          }
        }

        if (Object.keys(updates).length > 0) {
          set((state) => ({ paidMap: { ...state.paidMap, ...updates } }));
        }
      },
    }),
    {
      name: 'financa:bill-payments',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ paidMap: state.paidMap }),
    },
  ),
);

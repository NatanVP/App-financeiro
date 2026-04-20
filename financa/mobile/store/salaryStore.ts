import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SalaryConfig {
  /** Pagamento no 5º dia útil (em centavos) */
  payment5thCents: number;
  /** Pagamento no 20º dia útil (em centavos) */
  payment20thCents: number;
  /** Pagamento no último dia do mês (em centavos) */
  paymentLastCents: number;
  salaryAccountId: string;
}

/** Overrides manuais de recebimento por mês (chave: 'YYYY-MM') */
export interface MonthOverrides {
  p5?: boolean;
  p20?: boolean;
  pLast?: boolean;
}

interface SalaryState extends SalaryConfig {
  manualOverrides: Record<string, MonthOverrides>;
  setSalaryConfig: (config: Partial<SalaryConfig>) => void;
  setManualReceived: (monthKey: string, field: 'p5' | 'p20' | 'pLast', value: boolean) => void;
  totalMonthlyCents: () => number;
}

export const useSalaryStore = create<SalaryState>()(
  persist(
    (set, get) => ({
      payment5thCents: 0,
      payment20thCents: 0,
      paymentLastCents: 0,
      salaryAccountId: 'nubank',
      manualOverrides: {},

      setSalaryConfig: (config) => set((state) => ({ ...state, ...config })),

      setManualReceived: (monthKey, field, value) =>
        set((state) => ({
          manualOverrides: {
            ...state.manualOverrides,
            [monthKey]: {
              ...state.manualOverrides[monthKey],
              [field]: value,
            },
          },
        })),

      totalMonthlyCents: () => {
        const { payment5thCents, payment20thCents, paymentLastCents } = get();
        return payment5thCents + payment20thCents + paymentLastCents;
      },
    }),
    {
      name: 'financa:salary',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        payment5thCents: state.payment5thCents,
        payment20thCents: state.payment20thCents,
        paymentLastCents: state.paymentLastCents,
        salaryAccountId: state.salaryAccountId,
        manualOverrides: state.manualOverrides,
      }),
    }
  )
);

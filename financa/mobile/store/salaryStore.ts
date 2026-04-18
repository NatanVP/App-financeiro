import { create } from 'zustand';

export interface SalaryConfig {
  /** Pagamento no 5º dia útil (em centavos) */
  payment5thCents: number;
  /** Pagamento no 20º dia útil (em centavos) */
  payment20thCents: number;
  /** Pagamento no último dia do mês (em centavos) */
  paymentLastCents: number;
  salaryAccountId: string;
}

interface SalaryState extends SalaryConfig {
  setSalaryConfig: (config: Partial<SalaryConfig>) => void;
  totalMonthlyCents: () => number;
}

export const useSalaryStore = create<SalaryState>((set, get) => ({
  payment5thCents: 0,
  payment20thCents: 0,
  paymentLastCents: 0,
  salaryAccountId: 'nubank',

  setSalaryConfig: (config) => set((state) => ({ ...state, ...config })),

  totalMonthlyCents: () => {
    const { payment5thCents, payment20thCents, paymentLastCents } = get();
    return payment5thCents + payment20thCents + paymentLastCents;
  },
}));

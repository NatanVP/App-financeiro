import { create } from 'zustand';

interface CreditSettings {
  /** Day of the month the invoice closes (1–28). Default: 5 */
  closingDay: number;
  /** Day of the month the bill is due for payment (1–28). Default: 15 */
  dueDay: number;
  /** Whether the credit card feature is enabled */
  enabled: boolean;
}

interface CreditState extends CreditSettings {
  setClosingDay: (day: number) => void;
  setDueDay: (day: number) => void;
  setEnabled: (enabled: boolean) => void;
}

export const useCreditStore = create<CreditState>((set) => ({
  closingDay: 5,
  dueDay: 15,
  enabled: false,

  setClosingDay: (day) => set({ closingDay: Math.min(28, Math.max(1, day)) }),
  setDueDay:     (day) => set({ dueDay: Math.min(28, Math.max(1, day)) }),
  setEnabled:    (enabled) => set({ enabled }),
}));

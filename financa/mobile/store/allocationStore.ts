import { create } from 'zustand';

export interface AllocationState {
  reservePct: number;
  debtsPct: number;
  goalsPct: number;
  updatedAt: string;
  setAllocation: (reserve: number, debts: number, goals: number) => void;
}

export const useAllocationStore = create<AllocationState>((set) => ({
  reservePct: 50,
  debtsPct: 20,
  goalsPct: 30,
  updatedAt: new Date().toISOString(),
  setAllocation: (reserve, debts, goals) =>
    set({ reservePct: reserve, debtsPct: debts, goalsPct: goals, updatedAt: new Date().toISOString() }),
}));

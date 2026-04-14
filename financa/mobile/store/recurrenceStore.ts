import { create } from 'zustand';

export interface Recurrence {
  id: string;
  name: string;
  template_json: string;  // JSON string
  rrule: string;
  next_run: string;  // ISO date
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface RecurrenceState {
  recurrences: Recurrence[];
  setRecurrences: (items: Recurrence[]) => void;
  addRecurrence: (item: Recurrence) => void;
  updateRecurrence: (id: string, updates: Partial<Recurrence>) => void;
  deleteRecurrence: (id: string) => void;
  getActiveRecurrences: () => Recurrence[];
}

export const useRecurrenceStore = create<RecurrenceState>((set, get) => ({
  recurrences: [],
  setRecurrences: (recurrences) => set({ recurrences }),
  addRecurrence: (item) => set((state) => ({ recurrences: [item, ...state.recurrences] })),
  updateRecurrence: (id, updates) =>
    set((state) => ({
      recurrences: state.recurrences.map((r) =>
        r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r,
      ),
    })),
  deleteRecurrence: (id) =>
    set((state) => ({
      recurrences: state.recurrences.map((r) =>
        r.id === id ? { ...r, deleted_at: new Date().toISOString() } : r,
      ),
    })),
  getActiveRecurrences: () =>
    get().recurrences.filter((r) => !r.deleted_at && r.active),
}));

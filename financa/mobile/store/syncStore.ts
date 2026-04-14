import { create } from 'zustand';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

interface SyncState {
  status: SyncStatus;
  lastSyncAt: string | null;
  errorMessage: string | null;
  setSyncing: () => void;
  setSyncSuccess: () => void;
  setSyncError: (msg: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  lastSyncAt: null,
  errorMessage: null,
  setSyncing: () => set({ status: 'syncing', errorMessage: null }),
  setSyncSuccess: () =>
    set({ status: 'success', lastSyncAt: new Date().toISOString(), errorMessage: null }),
  setSyncError: (msg) => set({ status: 'error', errorMessage: msg }),
}));

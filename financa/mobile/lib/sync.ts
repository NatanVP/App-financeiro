/**
 * Sync service — offline-first, last-write-wins by updated_at.
 *
 * Flow:
 *   1. Pull: GET /sync/pull?since=<last_sync_ts> → merge into local SQLite
 *   2. Push: POST /sync/push → send all locally modified rows
 *   3. Save last_sync_ts to AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN ?? '';

const HEADERS = {
  Authorization: `Bearer ${API_TOKEN}`,
  'Content-Type': 'application/json',
};

const LAST_SYNC_KEY = 'financa:last_sync_ts';

async function getLastSyncTs(): Promise<string> {
  const stored = await AsyncStorage.getItem(LAST_SYNC_KEY);
  // Default: 10 years ago to pull everything on first sync
  return stored ?? '2015-01-01T00:00:00Z';
}

async function setLastSyncTs(ts: string): Promise<void> {
  await AsyncStorage.setItem(LAST_SYNC_KEY, ts);
}

export interface SyncPullResponse {
  since_ts: string;
  transactions: unknown[];
  debts: unknown[];
  debt_payments: unknown[];
  goals: unknown[];
  goal_contributions: unknown[];
  budgets: unknown[];
  bills: unknown[];
  accounts: unknown[];
  categories: unknown[];
  allocation: unknown | null;
}

export interface SyncPushRequest {
  transactions?: unknown[];
  debts?: unknown[];
  debt_payments?: unknown[];
  goals?: unknown[];
  goal_contributions?: unknown[];
  budgets?: unknown[];
  bills?: unknown[];
  accounts?: unknown[];
}

export interface SyncPushResponse {
  accepted: number;
  conflicts: number;
}

const FETCH_TIMEOUT_MS = 15_000;

function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

export async function pullFromServer(): Promise<SyncPullResponse> {
  const since = await getLastSyncTs();
  const url = `${API_BASE}/sync/pull?since=${encodeURIComponent(since)}`;
  const res = await fetchWithTimeout(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`Pull failed: ${res.status} ${res.statusText}`);
  }
  const data: SyncPullResponse = await res.json();
  await setLastSyncTs(new Date().toISOString());
  return data;
}

export async function pushToServer(payload: SyncPushRequest): Promise<SyncPushResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/sync/push`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Push failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<SyncPushResponse>;
}

/** Full sync cycle: pull then push pending local changes. */
export async function fullSync(pendingChanges: SyncPushRequest): Promise<{
  pull: SyncPullResponse;
  push: SyncPushResponse;
}> {
  const pull = await pullFromServer();
  const push = await pushToServer(pendingChanges);
  return { pull, push };
}

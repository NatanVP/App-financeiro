/**
 * performSync — pull server data and merge into all local Zustand stores.
 *
 * Strategy: last-write-wins by updated_at.
 * - Items that exist only on the server are added locally.
 * - Items that exist on both sides: server wins if server.updated_at >= local.updated_at.
 * - Items that exist only locally are kept (they'll be pushed on the next push cycle).
 */
import { pullFromServer } from '@/lib/sync';
import { useAccountStore, Account } from '@/store/accountStore';
import { useBillStore, Bill } from '@/store/billStore';
import { useBudgetStore, Budget } from '@/store/budgetStore';
import { useCategoryStore, ServerCategory } from '@/store/categoryStore';
import { useDebtStore, Debt } from '@/store/debtStore';
import { useGoalStore, Goal } from '@/store/goalStore';
import { useSyncStore } from '@/store/syncStore';
import { useTransactionStore, Transaction } from '@/store/transactionStore';

/** Merge remote rows into a local array using last-write-wins on updated_at. */
function mergeById<T extends { id: string; updated_at: string }>(
  local: T[],
  remote: unknown[],
): T[] {
  const map = new Map<string, T>(local.map((item) => [item.id, item]));
  for (const raw of remote) {
    const item = raw as T;
    const existing = map.get(item.id);
    if (!existing || new Date(item.updated_at) >= new Date(existing.updated_at)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

export async function performSync(): Promise<void> {
  const { setSyncing, setSyncSuccess, setSyncError } = useSyncStore.getState();
  setSyncing();

  try {
    const pull = await pullFromServer();

    const txStore = useTransactionStore.getState();
    txStore.setTransactions(
      mergeById<Transaction>(txStore.transactions, pull.transactions),
    );

    const debtStore = useDebtStore.getState();
    debtStore.setDebts(mergeById<Debt>(debtStore.debts, pull.debts));

    const goalStore = useGoalStore.getState();
    goalStore.setGoals(mergeById<Goal>(goalStore.goals, pull.goals));

    const billStore = useBillStore.getState();
    billStore.setBills(mergeById<Bill>(billStore.bills, pull.bills));

    const budgetStore = useBudgetStore.getState();
    budgetStore.setBudgets(mergeById<Budget>(budgetStore.budgets, pull.budgets));

    const accountStore = useAccountStore.getState();
    accountStore.setAccounts(mergeById<Account>(accountStore.accounts, pull.accounts));

    // Categories are server-authoritative — replace entirely (no local edits expected)
    if (pull.categories.length > 0) {
      useCategoryStore.getState().setCategories(pull.categories as ServerCategory[]);
    }

    setSyncSuccess();
  } catch (e) {
    const msg = e instanceof Error && e.name === 'AbortError'
      ? 'Timeout: servidor não respondeu em 15s'
      : String(e);
    setSyncError(msg);
    throw e;
  }
}

import { Platform } from 'react-native';
import { money, Money } from '@/lib/money';

type AnyDB = { executeAsync: (sql: string, params?: unknown[]) => Promise<{ rows?: { _array?: Record<string, unknown>[] } }> };

export interface DebtRow {
  id: string;
  name: string;
  type: string;
  principal_cents: Money;
  current_balance_cents: Money;
  interest_rate_monthly: number;
  start_date: string;
  due_date: string | null;
  monthly_payment_cents: Money;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export async function getDebts(db: AnyDB): Promise<DebtRow[]> {
  if (Platform.OS === 'web') return [];
  const result = await db.executeAsync(
    'SELECT * FROM debts WHERE deleted_at IS NULL ORDER BY current_balance_cents DESC',
  );
  return (result.rows?._array ?? []).map(mapDebtRow);
}

export async function upsertDebt(db: AnyDB, row: DebtRow): Promise<void> {
  if (Platform.OS === 'web') return;
  await db.executeAsync(
    `INSERT OR REPLACE INTO debts
     (id, name, type, principal_cents, current_balance_cents, interest_rate_monthly,
      start_date, due_date, monthly_payment_cents, status, notes, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id, row.name, row.type, row.principal_cents, row.current_balance_cents,
      row.interest_rate_monthly, row.start_date, row.due_date ?? null,
      row.monthly_payment_cents, row.status, row.notes ?? null,
      row.created_at, row.updated_at, row.deleted_at ?? null,
    ],
  );
}

function mapDebtRow(row: Record<string, unknown>): DebtRow {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as string,
    principal_cents: money(row.principal_cents as number),
    current_balance_cents: money(row.current_balance_cents as number),
    interest_rate_monthly: row.interest_rate_monthly as number,
    start_date: row.start_date as string,
    due_date: (row.due_date as string | null) ?? null,
    monthly_payment_cents: money(row.monthly_payment_cents as number),
    status: row.status as string,
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string | null) ?? null,
  };
}

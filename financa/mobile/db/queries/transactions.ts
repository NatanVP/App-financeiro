import { OPSQLiteConnection } from 'op-sqlite';
import { money, Money } from '@/lib/money';

export interface TransactionRow {
  id: string;
  account_id: string;
  category_id: string | null;
  amount_cents: Money;
  type: 'income' | 'expense' | 'transfer';
  description: string;
  date: string;
  notes: string | null;
  transfer_to_account_id: string | null;
  is_reconciled: boolean;
  device_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export async function getTransactions(
  db: OPSQLiteConnection,
  opts: {
    accountId?: string;
    categoryId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<TransactionRow[]> {
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];

  if (opts.accountId) { conditions.push('account_id = ?'); params.push(opts.accountId); }
  if (opts.categoryId) { conditions.push('category_id = ?'); params.push(opts.categoryId); }
  if (opts.type) { conditions.push('type = ?'); params.push(opts.type); }
  if (opts.dateFrom) { conditions.push('date >= ?'); params.push(opts.dateFrom); }
  if (opts.dateTo) { conditions.push('date <= ?'); params.push(opts.dateTo); }

  const where = conditions.join(' AND ');
  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;

  const result = await db.executeAsync(
    `SELECT * FROM transactions WHERE ${where} ORDER BY date DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return (result.rows?._array ?? []).map(mapRow);
}

export async function insertTransaction(
  db: OPSQLiteConnection,
  row: TransactionRow,
): Promise<void> {
  await db.executeAsync(
    `INSERT OR REPLACE INTO transactions
     (id, account_id, category_id, amount_cents, type, description, date, notes,
      transfer_to_account_id, is_reconciled, device_id, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id, row.account_id, row.category_id ?? null, row.amount_cents, row.type,
      row.description, row.date, row.notes ?? null, row.transfer_to_account_id ?? null,
      row.is_reconciled ? 1 : 0, row.device_id ?? null,
      row.created_at, row.updated_at, row.deleted_at ?? null,
    ],
  );
}

export async function getMonthlyTotals(
  db: OPSQLiteConnection,
  year: number,
  month: number,
): Promise<{ incomeCents: Money; expenseCents: Money }> {
  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
  const dateTo = `${year}-${String(month).padStart(2, '0')}-31`;

  const income = await db.executeAsync(
    `SELECT COALESCE(SUM(amount_cents), 0) as total FROM transactions
     WHERE type = 'income' AND date >= ? AND date <= ? AND deleted_at IS NULL`,
    [dateFrom, dateTo],
  );
  const expense = await db.executeAsync(
    `SELECT COALESCE(SUM(amount_cents), 0) as total FROM transactions
     WHERE type = 'expense' AND date >= ? AND date <= ? AND deleted_at IS NULL`,
    [dateFrom, dateTo],
  );

  return {
    incomeCents: money(income.rows?._array?.[0]?.total ?? 0),
    expenseCents: money(expense.rows?._array?.[0]?.total ?? 0),
  };
}

function mapRow(row: Record<string, unknown>): TransactionRow {
  return {
    id: row.id as string,
    account_id: row.account_id as string,
    category_id: (row.category_id as string | null) ?? null,
    amount_cents: money(row.amount_cents as number),
    type: row.type as TransactionRow['type'],
    description: row.description as string,
    date: row.date as string,
    notes: (row.notes as string | null) ?? null,
    transfer_to_account_id: (row.transfer_to_account_id as string | null) ?? null,
    is_reconciled: Boolean(row.is_reconciled),
    device_id: (row.device_id as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string | null) ?? null,
  };
}

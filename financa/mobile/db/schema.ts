/**
 * SQLite schema for offline-first local database.
 * Mirrors the PostgreSQL schema but uses TEXT for UUIDs and INTEGER for booleans.
 * All money columns are INTEGER (cents).
 *
 * dirty = 1 marks rows that have local changes not yet pushed to the server.
 * dirty is set to 1 on INSERT/UPDATE, cleared to 0 after a successful sync push.
 */

export const CREATE_TABLES_SQL = `
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bank TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#C0C1FF',
  type TEXT NOT NULL DEFAULT 'checking',
  balance_cents INTEGER NOT NULL DEFAULT 0,
  initial_balance_cents INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'label',
  color TEXT NOT NULL DEFAULT '#C0C1FF',
  type TEXT NOT NULL DEFAULT 'expense',
  parent_id TEXT,
  is_system INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  dirty INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  category_id TEXT,
  amount_cents INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  notes TEXT,
  transfer_to_account_id TEXT,
  is_reconciled INTEGER NOT NULL DEFAULT 0,
  device_id TEXT,
  source TEXT NOT NULL DEFAULT 'app',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_dirty ON transactions(dirty);

CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  principal_cents INTEGER NOT NULL,
  current_balance_cents INTEGER NOT NULL,
  interest_rate_monthly REAL NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL,
  due_date TEXT,
  monthly_payment_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  principal_cents INTEGER NOT NULL DEFAULT 0,
  interest_cents INTEGER NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  dirty INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_cents INTEGER NOT NULL,
  current_cents INTEGER NOT NULL DEFAULT 0,
  target_date TEXT,
  icon TEXT NOT NULL DEFAULT 'track_changes',
  color TEXT NOT NULL DEFAULT '#C0C1FF',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS goal_contributions (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  dirty INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  year_month TEXT NOT NULL,  -- YYYY-MM
  amount_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 1,
  UNIQUE(category_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(year_month);

CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  category_id TEXT,
  due_date TEXT NOT NULL,
  is_recurring INTEGER NOT NULL DEFAULT 1,
  recurrence_day INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS allocation (
  id INTEGER PRIMARY KEY DEFAULT 1,
  reserve_pct INTEGER NOT NULL DEFAULT 50,
  debts_pct INTEGER NOT NULL DEFAULT 20,
  goals_pct INTEGER NOT NULL DEFAULT 30,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO allocation (id, reserve_pct, debts_pct, goals_pct, updated_at)
VALUES (1, 50, 20, 30, datetime('now'));

CREATE TABLE IF NOT EXISTS recurrences (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  template_json TEXT NOT NULL,
  rrule TEXT NOT NULL DEFAULT 'FREQ=MONTHLY',
  next_run TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_recurrences_next_run ON recurrences(next_run);

CREATE TABLE IF NOT EXISTS annual_provisions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  annual_amount_cents INTEGER NOT NULL,
  due_month INTEGER NOT NULL,
  accumulated_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS emergency_reserve (
  id INTEGER PRIMARY KEY DEFAULT 1,
  target_months REAL NOT NULL DEFAULT 3.0,
  target_cents INTEGER NOT NULL DEFAULT 0,
  current_cents INTEGER NOT NULL DEFAULT 0,
  account_id TEXT,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO emergency_reserve (id, target_months, target_cents, current_cents, updated_at)
VALUES (1, 3.0, 0, 0, datetime('now'));
`;

import { OPSQLiteConnection } from 'op-sqlite';

import { CREATE_TABLES_SQL } from './schema';

export async function runMigrations(db: OPSQLiteConnection): Promise<void> {
  // Single migration: create all tables if not exists + seed
  // Future migrations can be appended as numbered SQL strings
  await db.executeAsync(CREATE_TABLES_SQL);
}

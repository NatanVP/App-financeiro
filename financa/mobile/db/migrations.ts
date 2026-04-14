import { Platform } from 'react-native';

// OPSQLiteConnection type — only used on native
type AnyDB = { executeAsync: (sql: string, params?: unknown[]) => Promise<unknown> };

export async function runMigrations(db: AnyDB): Promise<void> {
  if (Platform.OS === 'web') return;
  const { CREATE_TABLES_SQL } = await import('./schema');
  await db.executeAsync(CREATE_TABLES_SQL);
}

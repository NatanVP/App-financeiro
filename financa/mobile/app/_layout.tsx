import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { open } from 'op-sqlite';
import { runMigrations } from '@/db/migrations';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  useEffect(() => {
    // Initialize SQLite database on app start
    (async () => {
      const db = open({ name: 'financa.db' });
      await runMigrations(db);
    })();
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor={Colors.surfaceLowest} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.surfaceLowest },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="new-transaction"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="debts/[id]/simulator" />
        <Stack.Screen name="debts/[id]/index" />
      </Stack>
    </>
  );
}

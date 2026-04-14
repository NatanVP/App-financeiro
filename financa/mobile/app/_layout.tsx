import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  useEffect(() => {
    // SQLite is not available on web
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const { open } = await import('@op-engineering/op-sqlite');
        const { runMigrations } = await import('@/db/migrations');
        const db = open({ name: 'financa.db' });
        await runMigrations(db);
      } catch (e) {
        console.warn('DB init failed:', e);
      }
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

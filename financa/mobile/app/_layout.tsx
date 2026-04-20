import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import * as Font from 'expo-font';
import { Colors } from '@/constants/theme';
import { performSync } from '@/lib/syncActions';
import { useAccountStore } from '@/store/accountStore';

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    Font.loadAsync({
      VT323: require('../assets/fonts/VT323-Regular.ttf'),
    })
      .catch((e) => console.warn('Font VT323 not loaded:', e))
      .finally(() => setFontsLoaded(true));

    // Sync AFTER persist hydration — prevents AsyncStorage from overwriting synced data
    const runSync = () => performSync().catch((e) => console.warn('Startup sync failed:', e));

    if (useAccountStore.persist.hasHydrated()) {
      runSync();
      return;
    }
    return useAccountStore.persist.onFinishHydration(runSync);
  }, []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
  }

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
        <Stack.Screen
          name="new-goal"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="debts/new"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="debts/[id]/payment"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="bills" />
        <Stack.Screen name="transactions/[id]" />
        <Stack.Screen name="debts/[id]/simulator" />
        <Stack.Screen name="debts/[id]/index" />
      </Stack>
    </>
  );
}

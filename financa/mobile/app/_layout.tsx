import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import * as Font from 'expo-font';
import { Colors } from '@/constants/theme';
import { performSync } from '@/lib/syncActions';
import { requestNotificationPermission, scheduleBillNotifications } from '@/lib/notifications';
import { useAccountStore } from '@/store/accountStore';
import { useSalaryStore } from '@/store/salaryStore';
import { useBillStore } from '@/store/billStore';

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
    } else {
      useAccountStore.persist.onFinishHydration(runSync);
    }

    // Inicializa salário padrão se nunca configurado
    const initSalary = () => {
      const s = useSalaryStore.getState();
      if (s.payment5thCents === 0 && s.payment20thCents === 0 && s.paymentLastCents === 0) {
        s.setSalaryConfig({ payment5thCents: 110600, payment20thCents: 84800, paymentLastCents: 12800 });
        const now = new Date();
        const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        s.setManualReceived(mk, 'p5', true);
        s.setManualReceived(mk, 'p20', true);
      }
    };

    if (useSalaryStore.persist.hasHydrated()) {
      initSalary();
    } else {
      useSalaryStore.persist.onFinishHydration(initSalary);
    }

    // Agenda notificações de contratos após hydration da billStore
    const initNotifications = async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
        const bills = useBillStore.getState().getRecurringBills();
        await scheduleBillNotifications(bills);
      }
    };

    if (useBillStore.persist.hasHydrated()) {
      initNotifications();
    } else {
      useBillStore.persist.onFinishHydration(initNotifications);
    }
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
        <Stack.Screen name="transactions/[id]" />
        <Stack.Screen name="debts/[id]/simulator" />
        <Stack.Screen name="debts/[id]/index" />
      </Stack>
    </>
  );
}

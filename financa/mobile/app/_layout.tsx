import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import * as Font from 'expo-font';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await Font.loadAsync({
          VT323: require('../assets/fonts/VT323-Regular.ttf'),
        });
      } catch (e) {
        // Fonte não encontrada — app continua com fallback do sistema
        console.warn('Font VT323 not loaded:', e);
      } finally {
        setFontsLoaded(true);
      }
    })();
  }, []);

  // TODO: inicializar expo-sqlite aqui quando migrar persistência local

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
        <Stack.Screen name="transactions/[id]" />
        <Stack.Screen name="debts/[id]/simulator" />
        <Stack.Screen name="debts/[id]/index" />
      </Stack>
    </>
  );
}

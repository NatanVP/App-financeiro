import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { router } from 'expo-router';

function TabBarIcon({ name, focused }: { name: string; focused: boolean }) {
  // Using text placeholder since we don't have Material Icons in RN without extra setup
  const icons: Record<string, string> = {
    index: '⬛',
    transactions: '📋',
    goals: '🎯',
    more: '⋯',
  };
  return (
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{icons[name] ?? '●'}</Text>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: `${Colors.background}CC`,
          borderTopColor: `${Colors.primaryText}25`,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: `${Colors.primaryText}60`,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ focused }) => <TabBarIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transações',
          tabBarIcon: ({ focused }) => <TabBarIcon name="transactions" focused={focused} />,
        }}
      />

      {/* FAB spacer */}
      <Tabs.Screen
        name="fab-spacer"
        options={{
          title: '',
          tabBarButton: () => (
            <TouchableOpacity
              style={styles.fab}
              onPress={() => router.push('/new-transaction')}
              activeOpacity={0.8}
            >
              <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <Tabs.Screen
        name="goals"
        options={{
          title: 'Metas',
          tabBarIcon: ({ focused }) => <TabBarIcon name="goals" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Mais',
          tabBarIcon: ({ focused }) => <TabBarIcon name="more" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: Colors.onPrimary, fontSize: 24, fontWeight: '900', lineHeight: 28 },
});

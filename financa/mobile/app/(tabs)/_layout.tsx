import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { router } from 'expo-router';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabBarIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, MCIName> = {
    index:        'shield-home-outline',    // Guilda / Dashboard
    transactions: 'skull-crossbones-outline',        // Masmorra
    goals:        'flag-checkered',         // Missões
    more:         'crystal-ball',           // Grimório / Configurações
  };
  const icon = icons[name] ?? 'circle-outline';
  return (
    <MaterialCommunityIcons
      name={icon}
      size={22}
      color={focused ? Colors.primary : `${Colors.onSurface}50`}
    />
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surfaceHighest,
          borderTopColor: Colors.outline,
          borderTopWidth: 2,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: `${Colors.onSurface}50`,
        tabBarLabelStyle: {
          fontFamily: 'VT323',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Guilda',
          tabBarIcon: ({ focused }) => <TabBarIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Masmorra',
          tabBarIcon: ({ focused }) => <TabBarIcon name="transactions" focused={focused} />,
        }}
      />

      {/* FAB — Ação de guerra (espada) */}
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
              <MaterialCommunityIcons name="sword" size={24} color={Colors.onPrimary} />
            </TouchableOpacity>
          ),
        }}
      />

      <Tabs.Screen
        name="goals"
        options={{
          title: 'Missões',
          tabBarIcon: ({ focused }) => <TabBarIcon name="goals" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Grimório',
          tabBarIcon: ({ focused }) => <TabBarIcon name="more" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 50,
    height: 50,
    borderRadius: 0,       // pixel art: sem arredondamento
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    borderWidth: 2,
    borderColor: Colors.onPrimaryContainer,
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';

const ALERT_IDEAS = [
  {
    icon: 'credit-card-outline',
    title: 'Fatura fechando',
    text: 'Avisar 1 ou 2 dias antes do fechamento do cartao.',
  },
  {
    icon: 'calendar-clock',
    title: 'Conta vencendo',
    text: 'Lembrar contas a pagar no dia e alguns dias antes.',
  },
  {
    icon: 'bank-outline',
    title: 'Saldo baixo por banco',
    text: 'Definir um valor minimo por conta e avisar quando cair abaixo dele.',
  },
  {
    icon: 'cash',
    title: 'Salario esperado',
    text: 'Avisar quando o dia previsto passar e o salario ainda nao tiver entrado.',
  },
];

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>ALERTAS</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.hero}>
        <MaterialCommunityIcons name="bell-ring-outline" size={28} color={Colors.tertiary} />
        <Text style={styles.heroTitle}>CENTRAL DE AVISOS</Text>
        <Text style={styles.heroText}>
          Aqui vao morar os alertas configuraveis do app, com regras por banco, fatura e vencimento.
        </Text>
      </View>

      {ALERT_IDEAS.map((item) => (
        <View key={item.title} style={styles.alertCard}>
          <View style={styles.alertHead}>
            <MaterialCommunityIcons name={item.icon as never} size={18} color={Colors.tertiary} />
            <Text style={styles.alertTitle}>{item.title}</Text>
            <Text style={styles.badge}>PLANEJADO</Text>
          </View>
          <Text style={styles.alertText}>{item.text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceLowest },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'VT323',
    fontSize: 24,
    letterSpacing: 2,
    color: Colors.primary,
  },
  hero: {
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: `${Colors.tertiary}55`,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 10,
  },
  heroTitle: {
    fontFamily: 'VT323',
    fontSize: 18,
    letterSpacing: 2,
    color: Colors.tertiary,
  },
  heroText: {
    fontFamily: 'VT323',
    fontSize: 14,
    lineHeight: 18,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: `${Colors.outline}40`,
    padding: Spacing.lg,
    gap: 8,
  },
  alertHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertTitle: {
    flex: 1,
    fontFamily: 'VT323',
    fontSize: 16,
    letterSpacing: 1.5,
    color: Colors.onSurface,
  },
  badge: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 1.5,
    color: Colors.tertiary,
  },
  alertText: {
    fontFamily: 'VT323',
    fontSize: 13,
    lineHeight: 17,
    color: Colors.onSurfaceVariant,
  },
});

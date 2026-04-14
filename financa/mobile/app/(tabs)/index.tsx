/**
 * Dashboard screen — Início
 * Shows: surplus hero card, cashflow chart, top categories, emergency reserve, active debts.
 */
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Colors, Spacing, Typography } from '@/constants/theme';
import { formatBRL, money } from '@/lib/money';
import { useTransactionStore } from '@/store/transactionStore';
import { useDebtStore } from '@/store/debtStore';
import { useGoalStore } from '@/store/goalStore';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BarChart } from '@/components/charts/BarChart';

const MONTH_NAMES = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const { getMonthlyTotals, getTopCategories } = useTransactionStore();
  const { getActiveDebts, getTotalBalance } = useDebtStore();
  const { getActiveGoals } = useGoalStore();

  const { incomeCents, expenseCents } = getMonthlyTotals(year, month);
  const surplusCents = incomeCents - expenseCents;
  const activeDebts = getActiveDebts();
  const totalDebtBalance = getTotalBalance();
  const activeGoals = getActiveGoals();

  // Dummy cashflow bars — real data would come from store
  const cashflowBars = MONTH_NAMES.map((label, i) => ({
    label,
    value: Math.random() * 100,
    isHighlighted: i === month - 1,
  }));

  const topCategories = getTopCategories(year, month);
  const maxCatAmount = Math.max(...topCategories.map((c) => c.amountCents), 1);

  // Emergency reserve goal
  const emergencyGoal = activeGoals.find((g) => g.name.toLowerCase().includes('emergência'));
  const emergencyPct = emergencyGoal
    ? emergencyGoal.current_cents / emergencyGoal.target_cents
    : 0;

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: trigger sync
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      {/* TopAppBar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar} />
          <Text style={styles.appName}>Finança</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.monthLabel}>
            {MONTH_NAMES[month - 1]}, {year}
          </Text>
          <TouchableOpacity onPress={() => router.push('/more')}>
            <Ionicons name="settings-outline" size={22} color={Colors.primaryText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>SOBRA DISPONÍVEL</Text>
        <Text style={[styles.heroAmount, { color: surplusCents >= 0 ? Colors.onSurface : Colors.tertiary }]}>
          {formatBRL(money(surplusCents))}
        </Text>
        <View style={styles.heroStats}>
          <View>
            <Text style={styles.heroStatLabel}>Income</Text>
            <Text style={[styles.heroStatValue, { color: Colors.secondaryFixed }]}>
              +{formatBRL(incomeCents)}
            </Text>
          </View>
          <View>
            <Text style={styles.heroStatLabel}>Fixed</Text>
            <Text style={styles.heroStatValue}>{formatBRL(money(0))}</Text>
          </View>
          <View>
            <Text style={styles.heroStatLabel}>Variable</Text>
            <Text style={styles.heroStatValue}>{formatBRL(expenseCents)}</Text>
          </View>
        </View>
      </View>

      {/* Bento grid row 1 */}
      <View style={styles.bentoRow}>
        {/* Cashflow chart */}
        <View style={[styles.card, { flex: 2 }]}>
          <Text style={styles.cardTitle}>FLUXO DE CAIXA MENSAL</Text>
          <BarChart data={cashflowBars} height={120} />
        </View>

        {/* Emergency reserve */}
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardTitle}>RESERVA DE EMERGÊNCIA</Text>
          <Text style={styles.bigPct}>{Math.round(emergencyPct * 100)}%</Text>
          <Text style={styles.subLabel}>
            Meta: {emergencyGoal ? formatBRL(money(emergencyGoal.target_cents)) : 'R$ 0'}
          </Text>
          <ProgressBar progress={emergencyPct} color={Colors.secondary} height={6} />
        </View>
      </View>

      {/* Top categories */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>MAIORES CATEGORIAS</Text>
        {topCategories.length === 0 ? (
          <Text style={styles.emptyHint}>Nenhuma despesa lançada este mês.</Text>
        ) : (
          <View style={{ gap: 12 }}>
            {topCategories.map((cat) => (
              <View key={cat.name} style={{ gap: 4 }}>
                <View style={styles.catRow}>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <Text style={styles.catAmount}>{formatBRL(cat.amountCents)}</Text>
                </View>
                <ProgressBar progress={cat.amountCents / maxCatAmount} height={4} />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Active debts summary */}
      <TouchableOpacity style={styles.card} onPress={() => router.push('/debts')}>
        <Text style={styles.cardTitle}>DÍVIDAS ATIVAS</Text>
        <View style={styles.debtRow}>
          <Text style={styles.debtLabel}>Quantidade</Text>
          <Text style={styles.debtValue}>{activeDebts.length} contratos</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.debtRow}>
          <Text style={styles.debtLabel}>Saldo total</Text>
          <Text style={[styles.debtValue, { color: Colors.tertiary }]}>
            {formatBRL(totalDebtBalance)}
          </Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceLowest },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surface },
  appName: { ...Typography.titleMd, color: Colors.primaryText, fontWeight: '700', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  monthLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: Colors.onSurfaceVariant, fontWeight: '500' },
  settingsIcon: {},

  heroCard: {
    borderRadius: 12,
    padding: Spacing.xl,
    backgroundColor: Colors.primaryContainer,
  },
  heroLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '700', color: Colors.onPrimaryContainer, opacity: 0.8, marginBottom: 4 },
  heroAmount: { fontSize: 36, fontWeight: '900', letterSpacing: -1.5, fontVariant: ['tabular-nums'], color: Colors.onPrimaryContainer },
  heroStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xl, paddingTop: Spacing.lg, borderTopWidth: 1, borderTopColor: `${Colors.onPrimaryContainer}15` },
  heroStatLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: Colors.onPrimaryContainer, opacity: 0.7 },
  heroStatValue: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'], color: Colors.onPrimaryContainer, marginTop: 2 },

  bentoRow: { flexDirection: 'row', gap: Spacing.md },
  card: { backgroundColor: Colors.surfaceLow, padding: Spacing.xl, borderRadius: 12, gap: Spacing.md },
  cardTitle: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '700', color: Colors.onSurfaceVariant },

  bigPct: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'], color: Colors.onSurface },
  subLabel: { fontSize: 10, color: Colors.outline, fontVariant: ['tabular-nums'] },

  emptyHint: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 4 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between' },
  catName: { fontSize: 11, fontWeight: '500', color: Colors.onSurface },
  catAmount: { fontSize: 11, fontWeight: '500', fontVariant: ['tabular-nums'], color: Colors.onSurface },

  debtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  debtLabel: { fontSize: 10, color: Colors.outline, fontWeight: '500' },
  debtValue: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'], color: Colors.onSurface },
  separator: { height: 1, backgroundColor: `${Colors.outlineVariant}15` },
});

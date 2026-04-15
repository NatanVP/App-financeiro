/**
 * Dashboard — Bolsa de Ouro
 * Shows: hero card (bolsa de ouro), cashflow chart, ordens de compra, reserva real, dívidas ao ferreiro.
 */
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import { performSync } from '@/lib/syncActions';
import { formatBRL, money } from '@/lib/money';
import { useTransactionStore } from '@/store/transactionStore';
import { useDebtStore } from '@/store/debtStore';
import { useGoalStore } from '@/store/goalStore';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BarChart } from '@/components/charts/BarChart';
import { RPGIcon } from '@/components/ui/RPGIcon';

const MONTH_NAMES = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

function CardTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon}
      <Text style={styles.cardTitle}>{label}</Text>
    </View>
  );
}

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

  const cashflowBars = MONTH_NAMES.map((label, i) => ({
    label,
    value: Math.random() * 100,
    isHighlighted: i === month - 1,
  }));

  const topCategories = getTopCategories(year, month);
  const maxCatAmount = Math.max(...topCategories.map((c) => c.amountCents), 1);

  const emergencyGoal = activeGoals.find((g) => g.name.toLowerCase().includes('emergência'));
  const emergencyPct = emergencyGoal
    ? emergencyGoal.current_cents / emergencyGoal.target_cents
    : 0;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await performSync();
    } catch {
      // erro tratado no syncStore
    } finally {
      setRefreshing(false);
    }
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
      {/* Header — O Reino */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="shield-crown-outline" size={24} color={Colors.primary} />
          <Text style={styles.appName}>Guild Ledger</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.monthLabel}>
            {MONTH_NAMES[month - 1]}, {year}
          </Text>
          <TouchableOpacity onPress={() => router.push('/more')}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Card — Bolsa de Ouro */}
      <View style={styles.heroCard}>
        <View style={styles.heroCardInner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <RPGIcon name="sword" size={18} />
            <Text style={styles.heroLabel}>BOLSA DE OURO</Text>
          </View>
          <Text style={[styles.heroAmount, { color: surplusCents >= 0 ? Colors.primary : Colors.tertiary }]}>
            {formatBRL(money(surplusCents))}
          </Text>
          <View style={styles.heroStats}>
            <View>
              <Text style={styles.heroStatLabel}>Saques</Text>
              <Text style={[styles.heroStatValue, { color: Colors.secondary }]}>
                +{formatBRL(incomeCents)}
              </Text>
            </View>
            <View>
              <Text style={styles.heroStatLabel}>Tributos</Text>
              <Text style={styles.heroStatValue}>{formatBRL(money(0))}</Text>
            </View>
            <View>
              <Text style={styles.heroStatLabel}>Gastos</Text>
              <Text style={[styles.heroStatValue, { color: Colors.tertiary }]}>
                {formatBRL(expenseCents)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bento row — Fluxo de Magia + Reserva Real */}
      <View style={styles.bentoRow}>
        <View style={[styles.card, { flex: 2 }]}>
          <CardTitle icon={<RPGIcon name="potion_blue" size={18} />} label="FLUXO DE MAGIA" />
          <BarChart data={cashflowBars} height={120} />
        </View>

        <View style={[styles.card, { flex: 1 }]}>
          <CardTitle icon={<RPGIcon name="shield" size={18} />} label="RESERVA REAL" />
          <Text style={styles.bigPct}>{Math.round(emergencyPct * 100)}%</Text>
          <Text style={styles.subLabel}>
            Meta: {emergencyGoal ? formatBRL(money(emergencyGoal.target_cents)) : '0,00 G'}
          </Text>
          <ProgressBar progress={emergencyPct} color={Colors.primary} height={6} />
        </View>
      </View>

      {/* Ordens de Compra (top categorias) */}
      <View style={styles.card}>
        <CardTitle icon={<RPGIcon name="chest" size={18} />} label="ORDENS DE COMPRA" />
        {topCategories.length === 0 ? (
          <Text style={styles.emptyHint}>Nenhuma ordem registrada este mês.</Text>
        ) : (
          <View style={{ gap: 12 }}>
            {topCategories.map((cat) => (
              <View key={cat.name} style={{ gap: 4 }}>
                <View style={styles.catRow}>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <Text style={styles.catAmount}>{formatBRL(cat.amountCents)}</Text>
                </View>
                <ProgressBar progress={cat.amountCents / maxCatAmount} height={4} color={Colors.primary} />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Dívidas ao Ferreiro */}
      <TouchableOpacity style={styles.card} onPress={() => router.push('/debts')}>
        <CardTitle icon={<RPGIcon name="trident" size={18} />} label="DÍVIDAS AO FERREIRO" />
        <View style={styles.debtRow}>
          <Text style={styles.debtLabel}>Títulos de guerra</Text>
          <Text style={styles.debtValue}>{activeDebts.length} contratos</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.debtRow}>
          <Text style={styles.debtLabel}>Saldo total</Text>
          <Text style={[styles.debtValue, { color: Colors.tertiary }]}>
            {formatBRL(totalDebtBalance)}
          </Text>
        </View>
        <Text style={styles.tapHint}>Toque para quitar débitos →</Text>
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
  appName: {
    fontFamily: 'VT323',
    fontSize: 22,
    color: Colors.primary,
    letterSpacing: 1,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  monthLabel: {
    fontFamily: 'VT323',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: Colors.onSurfaceVariant,
  },

  heroCard: {
    borderWidth: 2,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceHighest,
  },
  heroCardInner: {
    borderWidth: 1,
    borderColor: Colors.primary,
    margin: 3,
    padding: Spacing.xl,
  },
  heroLabel: {
    fontFamily: 'VT323',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
    marginBottom: 4,
  },
  heroAmount: {
    fontFamily: 'VT323',
    fontSize: 44,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: `${Colors.outline}40`,
  },
  heroStatLabel: {
    fontFamily: 'VT323',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: Colors.onSurfaceVariant,
  },
  heroStatValue: {
    fontFamily: 'VT323',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    color: Colors.onSurface,
    marginTop: 2,
  },

  bentoRow: { flexDirection: 'row', gap: Spacing.md },
  card: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    borderRadius: 0,
    gap: Spacing.md,
  },
  cardTitle: {
    fontFamily: 'VT323',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: Colors.onSurfaceVariant,
  },

  bigPct: {
    fontFamily: 'VT323',
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    color: Colors.primary,
  },
  subLabel: {
    fontFamily: 'VT323',
    fontSize: 12,
    color: Colors.outline,
    fontVariant: ['tabular-nums'],
  },

  emptyHint: { fontFamily: 'VT323', fontSize: 13, color: Colors.onSurfaceVariant, marginTop: 4 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between' },
  catName: { fontFamily: 'VT323', fontSize: 14, color: Colors.onSurface },
  catAmount: { fontFamily: 'VT323', fontSize: 14, fontVariant: ['tabular-nums'], color: Colors.onSurface },

  debtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  debtLabel: { fontFamily: 'VT323', fontSize: 13, color: Colors.onSurfaceVariant },
  debtValue: { fontFamily: 'VT323', fontSize: 16, fontVariant: ['tabular-nums'], color: Colors.onSurface },
  separator: { height: 1, backgroundColor: Colors.outlineVariant },
  tapHint: { fontFamily: 'VT323', fontSize: 11, color: Colors.outline, textAlign: 'right', marginTop: 4 },
});

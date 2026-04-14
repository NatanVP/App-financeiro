import React, { useCallback } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, PrimaryGradient, BorderRadius } from '@/constants/theme';
import { formatBRL } from '@/lib/money';
import { useDebtStore, Debt } from '@/store/debtStore';
import { DebtCard } from '@/components/ui/DebtCard';

const HIGH_INTEREST_THRESHOLD = 0.03; // 3% monthly

export default function DebtsScreen() {
  const { getActiveDebts, getTotalBalance } = useDebtStore();
  const debts = getActiveDebts();
  const totalBalance = getTotalBalance();

  const totalPaid = debts.reduce(
    (s, d) => s + (d.principal_cents - d.current_balance_cents),
    0,
  );
  const totalPrincipal = debts.reduce((s, d) => s + d.principal_cents, 0);
  const highInterestDebts = debts.filter(
    (d) => d.interest_rate_monthly >= HIGH_INTEREST_THRESHOLD,
  );

  const criticalityLabel =
    highInterestDebts.length > 0 ? 'ALTA CRITICALIDADE' : 'NORMAL';
  const criticalityStyle =
    highInterestDebts.length > 0 ? styles.criticalBadge : styles.normalBadge;
  const criticalityTextStyle =
    highInterestDebts.length > 0 ? styles.criticalBadgeText : styles.normalBadgeText;

  const handleDebtPress = useCallback(
    (id: string) => router.push(`/debts/${id}`),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: Debt }) => {
      const isHigh = item.interest_rate_monthly >= HIGH_INTEREST_THRESHOLD;
      const dueLabel = item.due_date
        ? new Date(item.due_date).toLocaleDateString('pt-BR', {
            month: 'short',
            year: '2-digit',
          })
        : undefined;

      return (
        <DebtCard
          id={item.id}
          name={item.name}
          currentBalanceCents={item.current_balance_cents}
          principalCents={item.principal_cents}
          interestRateMonthly={item.interest_rate_monthly}
          dueDate={dueLabel}
          isHighInterest={isHigh}
          onPress={() => handleDebtPress(item.id)}
        />
      );
    },
    [handleDebtPress],
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerBrand}>Finança</Text>
        </View>
        <Text style={styles.headerTitle}>Dívidas</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>TOTAL PASSIVO</Text>
              <Text style={styles.summaryAmount}>{formatBRL(totalBalance)}</Text>
            </View>
            <View style={[styles.criticalityBadge, criticalityStyle]}>
              <Text style={criticalityTextStyle}>{criticalityLabel}</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summarySubLabel}>QUITADO</Text>
              <Text style={[styles.summarySubValue, { color: Colors.secondary }]}>
                {formatBRL(totalPaid as Parameters<typeof formatBRL>[0])}
              </Text>
            </View>
            <View style={styles.summaryRight}>
              <Text style={styles.summarySubLabel}>EM ABERTO</Text>
              <Text style={[styles.summarySubValue, { color: Colors.tertiary }]}>
                {formatBRL(totalBalance)}
              </Text>
            </View>
          </View>
        </View>

        {/* List header */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>LISTA DE CONTRATOS</Text>
          <Text style={styles.listCount}>{debts.length} itens ativos</Text>
        </View>

        {/* Debt cards */}
        {debts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sem dívidas ativas</Text>
            <Text style={styles.emptySubtitle}>
              Toque em + para registrar uma dívida
            </Text>
          </View>
        ) : (
          debts.map((item) => {
            const isHigh = item.interest_rate_monthly >= HIGH_INTEREST_THRESHOLD;
            const dueLabel = item.due_date
              ? new Date(item.due_date).toLocaleDateString('pt-BR', {
                  month: 'short',
                  year: '2-digit',
                })
              : undefined;
            return (
              <DebtCard
                key={item.id}
                id={item.id}
                name={item.name}
                currentBalanceCents={item.current_balance_cents}
                principalCents={item.principal_cents}
                interestRateMonthly={item.interest_rate_monthly}
                dueDate={dueLabel}
                isHighInterest={isHigh}
                onPress={() => handleDebtPress(item.id)}
              />
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/debts/new')}
      >
        <LinearGradient
          colors={PrimaryGradient.colors}
          start={PrimaryGradient.start}
          end={PrimaryGradient.end}
          style={styles.fabGradient}
        >
          <Text style={styles.fabIcon}>+</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surfaceLowest,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 52,
    paddingBottom: Spacing.md,
    backgroundColor: `${Colors.surfaceLowest}CC`,
  },
  headerLeft: { flex: 1 },
  headerBrand: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: Colors.primaryText,
  },
  headerTitle: {
    ...Typography.headlineSm,
    color: Colors.primary,
  },
  headerRight: { flex: 1 },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.md,
  },

  summaryCard: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}1A`,
    marginTop: Spacing.sm,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  summaryLabel: {
    ...Typography.labelXs,
    color: Colors.onSurfaceVariant,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: Colors.primaryText,
    fontVariant: ['tabular-nums'],
  },
  criticalityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  criticalBadge: {
    backgroundColor: `${Colors.tertiaryFixed}1A`,
    borderColor: `${Colors.tertiaryFixed}33`,
  },
  criticalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.tertiary,
    letterSpacing: 0.5,
  },
  normalBadge: {
    backgroundColor: `${Colors.secondary}1A`,
    borderColor: `${Colors.secondary}33`,
  },
  normalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.secondary,
    letterSpacing: 0.5,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: `${Colors.outlineVariant}1A`,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryRight: { alignItems: 'flex-end' },
  summarySubLabel: {
    ...Typography.labelXs,
    color: Colors.onSurfaceVariant,
    marginBottom: 2,
  },
  summarySubValue: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: Spacing.xs,
  },
  listTitle: {
    ...Typography.labelXs,
    color: Colors.onSurfaceVariant,
    fontWeight: '700',
  },
  listCount: {
    fontSize: 10,
    color: `${Colors.onSurfaceVariant}99`,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    ...Typography.titleSm,
    color: Colors.onSurfaceVariant,
  },
  emptySubtitle: {
    ...Typography.bodySm,
    color: `${Colors.onSurfaceVariant}80`,
  },

  fab: {
    position: 'absolute',
    right: 24,
    bottom: 88,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.onPrimary,
    lineHeight: 32,
  },
});

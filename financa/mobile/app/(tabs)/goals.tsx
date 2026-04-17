/**
 * Goals / Missões screen — pixelated RPG theme.
 */
import React, { useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Colors, Spacing } from '@/constants/theme';
import { formatBRL, money } from '@/lib/money';
import { useGoalStore, Goal } from '@/store/goalStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useAccountStore } from '@/store/accountStore';
import { GoalCard } from '@/components/ui/GoalCard';
import { ProgressBar } from '@/components/ui/ProgressBar';

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const { getActiveGoals, getTotalProgress, deleteGoal, updateGoal, processInstallments } = useGoalStore();
  const { addTransaction, transactions, deleteTransaction } = useTransactionStore();
  const { getActiveAccounts } = useAccountStore();
  const defaultAccountId = getActiveAccounts()[0]?.id ?? 'nubank';

  // Processa silenciosamente meses já passados ao abrir a tela
  useEffect(() => {
    processInstallments(addTransaction, () => transactions, defaultAccountId);
  }, []);

  /** Paga a parcela do mês atual de uma missão */
  const payInstallment = (goal: Goal) => {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const paidCount = transactions.filter(
      (t) => !t.deleted_at && t.notes === goal.id && t.category_id === 'goal_deposit',
    ).length;

    Alert.alert(
      'Recolher parcela?',
      `Descontar ${formatBRL(money(goal.monthly_cents))} da sua bolsa para "${goal.name}"?\n\nParcela ${paidCount + 1}/${goal.months_total}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recolher',
          onPress: () => {
            addTransaction({
              id: `tx-inst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              account_id: defaultAccountId,
              category_id: 'goal_deposit',
              amount_cents: money(goal.monthly_cents),
              type: 'expense',
              description: `Parcela ${paidCount + 1}/${goal.months_total}: ${goal.name}`,
              date: today,
              notes: goal.id,
              transfer_to_account_id: null,
              is_reconciled: false,
              device_id: null,
              created_at: now,
              updated_at: now,
              deleted_at: null,
            });
            updateGoal(goal.id, {
              current_cents: money(Math.min(goal.current_cents + goal.monthly_cents, goal.target_cents)),
            });
          },
        },
      ],
    );
  };

  const activeGoals = getActiveGoals();
  const { currentCents, targetCents, pct } = getTotalProgress();
  const remainingCents = Math.max(targetCents - currentCents, 0);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="shield-sword-outline" size={20} color={Colors.primary} />
          <Text style={styles.title}>MISSÕES</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/new-goal')}>
          <MaterialCommunityIcons name="plus" size={20} color={Colors.onPrimary} />
          <Text style={styles.addBtnText}>NOVA</Text>
        </TouchableOpacity>
      </View>

      {/* Summary card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryHeading}>TESOURO TOTAL</Text>
        <Text style={styles.summaryBigAmount}>{formatBRL(currentCents)}</Text>

        <ProgressBar progress={pct / 100} color={Colors.primary} height={6} />

        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Text style={styles.statLabel}>OURO GUARDADO</Text>
            <Text style={[styles.statValue, { color: Colors.secondary }]}>
              {formatBRL(currentCents)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.statLabel}>FALTAM</Text>
            <Text style={[styles.statValue, { color: Colors.onSurface }]}>
              {formatBRL(money(remainingCents))}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.statLabel}>PROGRESSO</Text>
            <Text style={[styles.statValue, { color: Colors.primary }]}>
              {pct.toFixed(0)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Missions badge row */}
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="sword" size={14} color={Colors.primary} />
          <Text style={styles.badgeText}>
            {activeGoals.length} MISSÃO{activeGoals.length !== 1 ? 'ES' : ''} ATIVA{activeGoals.length !== 1 ? 'S' : ''}
          </Text>
        </View>
      </View>

      {/* Goals list */}
      <View style={styles.goalsList}>
        {activeGoals.map((goal) => {
          const isOverdue =
            goal.target_date
              ? new Date(goal.target_date) < new Date() && goal.current_cents < goal.target_cents
              : false;

          const goalTxs = transactions.filter(
            (t) => !t.deleted_at && t.notes === goal.id && t.category_id === 'goal_deposit',
          );
          const paidCount = goalTxs.length;

          // Parcela do mês atual em aberto?
          const today = new Date();
          const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
          const currentMonthPaid = goalTxs.some((t) => t.date.startsWith(currentMonthKey));
          const installmentDue =
            goal.monthly_cents > 0 &&
            goal.months_total > 1 &&
            paidCount < goal.months_total &&
            !currentMonthPaid;

          return (
            <GoalCard
              key={goal.id}
              name={goal.name}
              currentCents={goal.current_cents}
              targetCents={goal.target_cents}
              targetDate={goal.target_date?.slice(0, 7).replace('-', '/') ?? undefined}
              color={goal.color}
              isOverdue={isOverdue}
              monthlyCents={goal.monthly_cents}
              monthsTotal={goal.months_total}
              monthsPaid={paidCount}
              installmentDue={installmentDue}
              onPayInstallment={installmentDue ? () => payInstallment(goal) : undefined}
              onDelete={() =>
                Alert.alert(
                  'Abandonar missão?',
                  `"${goal.name}" será removida. O dinheiro guardado não volta automaticamente.`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                    text: 'Abandonar',
                    style: 'destructive',
                    onPress: () => {
                      // Remove todas as transações vinculadas à missão
                      transactions
                        .filter((t) => !t.deleted_at && t.notes === goal.id)
                        .forEach((t) => deleteTransaction(t.id));
                      deleteGoal(goal.id);
                    },
                  },
                  ]
                )
              }
            />
          );
        })}

        {activeGoals.length === 0 && (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="map-search-outline" size={32} color={Colors.onSurfaceVariant} />
            <Text style={styles.emptyText}>NENHUMA MISSÃO ATIVA</Text>
            <Text style={styles.emptyHint}>Adicione metas para começar sua jornada</Text>
          </View>
        )}
      </View>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontFamily: 'VT323',
    fontSize: 24,
    letterSpacing: 2,
    color: Colors.primary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  addBtnText: {
    fontFamily: 'VT323',
    fontSize: 14,
    letterSpacing: 1.5,
    color: Colors.onPrimary,
  },

  summaryCard: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  summaryHeading: {
    fontFamily: 'VT323',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
  },
  summaryBigAmount: {
    fontFamily: 'VT323',
    fontSize: 40,
    fontVariant: ['tabular-nums'],
    color: Colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  summaryCol: { flex: 1, alignItems: 'center', gap: 2 },
  summaryDivider: { width: 1, backgroundColor: `${Colors.outlineVariant}40` },
  statLabel: {
    fontFamily: 'VT323',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: Colors.onSurfaceVariant,
  },
  statValue: {
    fontFamily: 'VT323',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    color: Colors.onSurface,
  },

  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: 'VT323',
    fontSize: 13,
    letterSpacing: 1,
    color: Colors.primary,
  },

  goalsList: { gap: Spacing.sm },

  emptyBox: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl * 2,
  },
  emptyText: {
    fontFamily: 'VT323',
    fontSize: 16,
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
  },
  emptyHint: {
    fontFamily: 'VT323',
    fontSize: 13,
    color: `${Colors.onSurfaceVariant}80`,
    textAlign: 'center',
  },
});

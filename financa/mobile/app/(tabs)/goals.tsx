/**
 * Goals screen — circular progress cards + quarterly chart.
 */
import React from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing, Typography } from '@/constants/theme';
import { formatBRL, money } from '@/lib/money';
import { useGoalStore } from '@/store/goalStore';
import { GoalCard } from '@/components/ui/GoalCard';
import { BarChart } from '@/components/charts/BarChart';

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const { getActiveGoals, getTotalProgress } = useGoalStore();

  const activeGoals = getActiveGoals();
  const { currentCents, targetCents, pct } = getTotalProgress();

  const quarterlyData = [
    { label: 'Q1', value: 40 },
    { label: 'Q2', value: 60 },
    { label: 'Q3', value: 80 },
    { label: 'Q4', value: 100, isHighlighted: true },
  ];

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Metas</Text>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.card, { flex: 2 }]}>
          <Text style={styles.cardLabel}>APORTE CONSOLIDADO</Text>
          <Text style={styles.bigAmount}>{formatBRL(currentCents)}</Text>
          <View style={styles.summaryStats}>
            <View>
              <Text style={styles.statLabel}>Conclusão Média</Text>
              <Text style={[styles.statValue, { color: Colors.secondary }]}>{pct.toFixed(1)}%</Text>
            </View>
            <View style={styles.divider} />
            <View>
              <Text style={styles.statLabel}>Alvos Ativos</Text>
              <Text style={[styles.statValue, { color: Colors.primary }]}>
                {String(activeGoals.length).padStart(2, '0')}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, styles.centerCard]}>
          <Text style={styles.bigIcon}>🎯</Text>
          <Text style={styles.cardLabel}>FREQUÊNCIA</Text>
          <Text style={styles.freqText}>Mensal</Text>
        </View>
      </View>

      {/* Goals grid */}
      <Text style={styles.sectionHeader}>METAS</Text>
      <View style={styles.goalsGrid}>
        {activeGoals.map((goal) => {
          const isOverdue =
            goal.target_date
              ? new Date(goal.target_date) < new Date() && goal.current_cents < goal.target_cents
              : false;

          return (
            <GoalCard
              key={goal.id}
              name={goal.name}
              currentCents={goal.current_cents}
              targetCents={goal.target_cents}
              targetDate={goal.target_date?.slice(0, 7).replace('-', '/') ?? undefined}
              color={goal.color}
              isOverdue={isOverdue}
            />
          );
        })}

        {activeGoals.length === 0 && (
          <Text style={styles.empty}>Nenhuma meta cadastrada. Adicione sua primeira meta!</Text>
        )}
      </View>

      {/* Quarterly chart */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>EVOLUÇÃO TRIMESTRAL</Text>
        <View style={styles.card}>
          <BarChart data={quarterlyData} height={140} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceLowest },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  header: { height: 56, justifyContent: 'center' },
  title: { ...Typography.headlineSm, color: Colors.primary },
  summaryRow: { flexDirection: 'row', gap: Spacing.md },
  card: { backgroundColor: Colors.surfaceLow, padding: Spacing.xl, borderRadius: 8, gap: Spacing.sm },
  centerCard: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '700', color: Colors.onSurfaceVariant },
  bigAmount: {
    fontSize: 28,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
    color: Colors.primary,
  },
  summaryStats: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm },
  statLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant },
  statValue: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  divider: { width: 1, backgroundColor: `${Colors.outlineVariant}25`, height: 32 },
  bigIcon: { fontSize: 28, marginBottom: 4 },
  freqText: { fontSize: 16, fontWeight: '700', color: Colors.onSurface },
  sectionHeader: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '700', color: Colors.onSurfaceVariant, paddingHorizontal: 4, marginTop: Spacing.md },
  goalsGrid: { gap: Spacing.sm },
  section: { gap: Spacing.sm },
  empty: { ...Typography.bodySm, color: Colors.onSurfaceVariant, textAlign: 'center', padding: Spacing.xl },
});

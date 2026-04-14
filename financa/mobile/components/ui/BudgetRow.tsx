import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Typography } from '@/constants/theme';
import { formatBRL, Money } from '@/lib/money';
import { ProgressBar } from './ProgressBar';

interface Props {
  categoryName: string;
  icon?: string;
  spentCents: Money;
  budgetCents: Money;
}

export function BudgetRow({ categoryName, spentCents, budgetCents }: Props) {
  const progress = budgetCents > 0 ? spentCents / budgetCents : 0;
  const pct = Math.round(progress * 100);
  const isOver = spentCents > budgetCents;
  const isClose = !isOver && pct >= 85;

  const progressColor = isOver ? Colors.tertiary : isClose ? Colors.primary : Colors.secondary;
  const statusText = isOver ? 'Acima do orçamento' : `${pct}% utilizado`;
  const statusColor = isOver ? Colors.tertiary : isClose ? Colors.primary : Colors.secondary;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.left}>
          {/* Icon placeholder */}
          <View style={[styles.iconBg, { backgroundColor: `${progressColor}15` }]}>
            <View style={[styles.iconDot, { backgroundColor: progressColor }]} />
          </View>
          <View>
            <Text style={styles.name}>{categoryName}</Text>
            <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>
        <View style={styles.right}>
          <Text style={[styles.spent, isOver && { color: Colors.tertiary }]}>
            {formatBRL(spentCents)}
          </Text>
          <Text style={styles.limit}>de {formatBRL(budgetCents)}</Text>
        </View>
      </View>
      <ProgressBar progress={Math.min(1, progress)} color={progressColor} height={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: Colors.surfaceLow, borderRadius: 8, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBg: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iconDot: { width: 16, height: 16, borderRadius: 4 },
  right: { alignItems: 'flex-end' },
  name: { ...Typography.titleSm, color: Colors.onSurface },
  status: { ...Typography.labelSm, textTransform: 'uppercase', fontWeight: '700', marginTop: 2 },
  spent: { ...Typography.bodySm, fontWeight: '700', color: Colors.onSurface, fontVariant: ['tabular-nums'] },
  limit: { ...Typography.labelSm, color: Colors.onSurfaceVariant, fontVariant: ['tabular-nums'] },
});

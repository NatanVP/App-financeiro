import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Typography } from '@/constants/theme';
import { formatBRL, Money } from '@/lib/money';
import { ProgressBar } from './ProgressBar';

interface Props {
  id: string;
  name: string;
  currentBalanceCents: Money;
  principalCents: Money;
  interestRateMonthly: number;
  dueDate?: string;
  isHighInterest?: boolean;
  onPress?: () => void;
}

export function DebtCard({
  name,
  currentBalanceCents,
  principalCents,
  interestRateMonthly,
  dueDate,
  isHighInterest = false,
  onPress,
}: Props) {
  const paidOff = principalCents - currentBalanceCents;
  const progress = principalCents > 0 ? paidOff / principalCents : 0;
  const progressPct = Math.round(progress * 100);
  const ratePct = (interestRateMonthly * 100).toFixed(1);

  const progressColor = isHighInterest ? Colors.tertiary : Colors.primary;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {isHighInterest && <View style={styles.criticalDot} />}

      <View style={styles.header}>
        <Text style={styles.name}>{name.toUpperCase()}</Text>
      </View>

      <Text style={styles.balance}>{formatBRL(currentBalanceCents)}</Text>

      <View style={styles.meta}>
        <Text style={[styles.rate, isHighInterest && { color: Colors.tertiary }]}>
          Taxa: {ratePct}% a.m.
        </Text>
        {dueDate ? (
          <>
            <View style={styles.dot} />
            <Text style={styles.dueDate}>Liq: {dueDate}</Text>
          </>
        ) : null}
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Progresso de Quitação</Text>
          <Text style={styles.progressLabel}>{progressPct}%</Text>
        </View>
        <ProgressBar
          progress={progress}
          color={progressColor}
          height={6}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}25`,
    position: 'relative',
    overflow: 'hidden',
  },
  criticalDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.tertiary,
  },
  header: { marginBottom: 4 },
  name: {
    ...Typography.labelXs,
    color: Colors.onSurfaceVariant,
    marginBottom: 4,
  },
  balance: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: Colors.primaryText,
    fontVariant: ['tabular-nums'],
    marginBottom: 8,
  },
  meta: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 6 },
  rate: {
    ...Typography.labelSm,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
  },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: `${Colors.outlineVariant}50` },
  dueDate: { ...Typography.labelSm, color: `${Colors.onSurfaceVariant}CC`, fontVariant: ['tabular-nums'] },
  progressSection: { gap: 6 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: Colors.onSurfaceVariant },
});

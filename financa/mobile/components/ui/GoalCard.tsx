import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/theme';
import { formatBRL, money, Money } from '@/lib/money';
import { ProgressBar } from './ProgressBar';

interface Props {
  name: string;
  currentCents: Money;
  targetCents: Money;
  targetDate?: string;
  color?: string;
  isOverdue?: boolean;
  monthlyCents?: number;
  monthsTotal?: number;
  monthsPaid?: number;
  installmentDue?: boolean;
  onPayInstallment?: () => void;
  onPress?: () => void;
  onDelete?: () => void;
}

export function GoalCard({
  name,
  currentCents,
  targetCents,
  targetDate,
  color = Colors.primary,
  isOverdue = false,
  monthlyCents,
  monthsTotal,
  monthsPaid = 0,
  installmentDue = false,
  onPayInstallment,
  onPress,
  onDelete,
}: Props) {
  const progress = targetCents > 0 ? Math.min(currentCents / targetCents, 1) : 0;
  const pct = Math.round(progress * 100);
  const remainingCents = Math.max(targetCents - currentCents, 0);
  const hasInstallments = !!monthlyCents && monthlyCents > 0 && !!monthsTotal && monthsTotal > 1;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Nome da missão */}
      <View style={styles.titleRow}>
        <Text style={styles.name} numberOfLines={1}>{name.toUpperCase()}</Text>
        <View style={styles.titleRight}>
          {isOverdue && (
            <View style={styles.overdueTag}>
              <Text style={styles.overdueText}>ATRASADA</Text>
            </View>
          )}
          <Text style={[styles.pct, { color }]}>{pct}%</Text>
          {onDelete && (
            <TouchableOpacity onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={Colors.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Barra de progresso */}
      <ProgressBar progress={progress} color={color} height={5} />

      {/* Valores */}
      <View style={styles.valuesRow}>
        <View style={styles.valueCol}>
          <Text style={styles.valueLabel}>GUARDADO</Text>
          <Text style={[styles.valueAmount, { color: Colors.secondary }]}>
            {formatBRL(currentCents)}
          </Text>
        </View>

        <View style={styles.valueCol}>
          <Text style={styles.valueLabel}>FALTAM</Text>
          <Text style={[styles.valueAmount, { color: Colors.onSurface }]}>
            {formatBRL(money(remainingCents))}
          </Text>
        </View>

        <View style={styles.valueCol}>
          <Text style={styles.valueLabel}>META</Text>
          <Text style={[styles.valueAmount, { color }]}>
            {formatBRL(targetCents)}
          </Text>
        </View>
      </View>

      {/* Parcelas */}
      {hasInstallments && (
        <>
          <View style={styles.installmentRow}>
            <Text style={styles.installmentLabel}>
              {formatBRL(money(monthlyCents!))}/MÊS
            </Text>
            <Text style={styles.installmentPaid}>
              {monthsPaid}/{monthsTotal} PAGAS
            </Text>
          </View>

          {installmentDue && onPayInstallment && (
            <TouchableOpacity style={styles.payBtn} onPress={onPayInstallment}>
              <Text style={styles.payBtnText}>
                ⚔ PAGAR PARCELA — {formatBRL(money(monthlyCents!))}
              </Text>
            </TouchableOpacity>
          )}

          {!installmentDue && monthsPaid < (monthsTotal ?? 0) && (
            <Text style={styles.paidThisMonth}>✓ PARCELA DO MÊS RECOLHIDA</Text>
          )}
        </>
      )}

      {/* Prazo */}
      {targetDate && (
        <Text style={styles.deadline}>PRAZO: {targetDate}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontFamily: 'VT323',
    fontSize: 18,
    letterSpacing: 1,
    color: Colors.onSurface,
    flex: 1,
  },
  titleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pct: {
    fontFamily: 'VT323',
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  deleteBtn: {
    padding: 2,
  },

  overdueTag: {
    backgroundColor: `${Colors.tertiary}20`,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  overdueText: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.tertiary,
  },

  valuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  valueCol: { flex: 1, gap: 2 },
  valueLabel: {
    fontFamily: 'VT323',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: Colors.onSurfaceVariant,
  },
  valueAmount: {
    fontFamily: 'VT323',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },

  installmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: `${Colors.outlineVariant}40`,
  },
  payBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 2,
  },
  payBtnText: {
    fontFamily: 'VT323',
    fontSize: 15,
    letterSpacing: 1.5,
    color: Colors.onPrimary,
  },
  paidThisMonth: {
    fontFamily: 'VT323',
    fontSize: 12,
    letterSpacing: 1,
    color: Colors.secondary,
    textAlign: 'center',
    marginTop: 2,
  },

  installmentLabel: {
    fontFamily: 'VT323',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    color: Colors.primary,
    letterSpacing: 1,
  },
  installmentPaid: {
    fontFamily: 'VT323',
    fontSize: 12,
    letterSpacing: 1,
    color: Colors.onSurfaceVariant,
  },

  deadline: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 1.5,
    color: Colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 2,
  },
});

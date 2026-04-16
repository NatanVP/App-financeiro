import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';
import { formatBRL, money, Money } from '@/lib/money';
import { BankIcon } from './BankIcon';
import { ProgressBar } from './ProgressBar';

interface Props {
  id: string;
  name: string;
  bankId?: string | null;
  bankName?: string | null;
  currentBalanceCents: Money;
  principalCents: Money;
  monthlyPaymentCents?: Money;
  interestRateMonthly: number;
  dueDate?: string;
  isHighInterest?: boolean;
  monthlyPaid?: boolean;
  onRegisterPayment?: () => void;
  onPress?: () => void;
  onDelete?: () => void;
}

export function DebtCard({
  name,
  bankId,
  bankName,
  currentBalanceCents,
  principalCents,
  monthlyPaymentCents = money(0),
  interestRateMonthly,
  dueDate,
  isHighInterest = false,
  monthlyPaid = false,
  onRegisterPayment,
  onPress,
  onDelete,
}: Props) {
  const paidOff = Math.max(0, principalCents - currentBalanceCents);
  const progressRaw = principalCents > 0 ? paidOff / principalCents : 0;
  const progress = Math.max(0, Math.min(progressRaw, 1));
  const progressPct = Math.round(progress * 100);
  const ratePct = (interestRateMonthly * 100).toFixed(2);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <Text style={styles.name} numberOfLines={1}>
            {name.toUpperCase()}
          </Text>
          {isHighInterest && (
            <View style={styles.highTag}>
              <Text style={styles.highTagText}>JURO ALTO</Text>
            </View>
          )}
        </View>

        {onDelete && (
          <TouchableOpacity onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
            <MaterialCommunityIcons name="trash-can-outline" size={16} color={Colors.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.metaRow}>
        <View style={[styles.bankChip, !bankId && styles.bankChipEmpty]}>
          {bankId ? <BankIcon bank={bankId} size={18} /> : <MaterialCommunityIcons name="bank-outline" size={15} color={Colors.onSurfaceVariant} />}
          <Text style={[styles.bankChipText, !bankId && styles.bankChipTextEmpty]}>
            {bankName ?? 'Sem banco'}
          </Text>
        </View>

        <Text style={[styles.rateChip, isHighInterest && styles.rateChipDanger]}>
          {ratePct}% a.m.
        </Text>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>QUITAÇÃO</Text>
          <Text style={styles.progressLabel}>{progressPct}%</Text>
        </View>
        <ProgressBar
          progress={progress}
          color={isHighInterest ? Colors.tertiary : Colors.primary}
          height={5}
        />
      </View>

      <View style={styles.valuesRow}>
        <View style={styles.valueCol}>
          <Text style={styles.valueLabel}>EM ABERTO</Text>
          <Text style={[styles.valueAmount, { color: Colors.tertiary }]}>
            {formatBRL(currentBalanceCents)}
          </Text>
        </View>

        <View style={styles.valueCol}>
          <Text style={styles.valueLabel}>QUITADO</Text>
          <Text style={[styles.valueAmount, { color: Colors.secondary }]}>
            {formatBRL(money(paidOff))}
          </Text>
        </View>

        <View style={styles.valueCol}>
          <Text style={styles.valueLabel}>PAG./MÊS</Text>
          <Text style={styles.valueAmount}>
            {monthlyPaymentCents > 0 ? formatBRL(monthlyPaymentCents) : '--'}
          </Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>ORIGINAL: {formatBRL(principalCents)}</Text>
        <Text style={styles.footerText}>{dueDate ? `META: ${dueDate}` : 'SEM PRAZO'}</Text>
      </View>

      {onRegisterPayment && monthlyPaymentCents > 0 && !monthlyPaid && (
        <TouchableOpacity style={styles.payBtn} onPress={onRegisterPayment}>
          <Text style={styles.payBtnText}>
            ABATER ESTE MES - {formatBRL(monthlyPaymentCents)}
          </Text>
        </TouchableOpacity>
      )}

      {onRegisterPayment && monthlyPaymentCents <= 0 && (
        <TouchableOpacity style={styles.payBtnAlt} onPress={onRegisterPayment}>
          <Text style={styles.payBtnAltText}>ABATER SALDO</Text>
        </TouchableOpacity>
      )}

      {onRegisterPayment && monthlyPaymentCents > 0 && monthlyPaid && (
        <TouchableOpacity style={styles.payBtnAlt} onPress={onRegisterPayment}>
          <Text style={styles.payBtnAltText}>ABATER EXTRA</Text>
        </TouchableOpacity>
      )}

      {monthlyPaid && (
        <Text style={styles.paidThisMonth}>PAGAMENTO DO MES REGISTRADO</Text>
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
    gap: Spacing.sm,
  },
  titleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    flex: 1,
    fontFamily: 'VT323',
    fontSize: 18,
    letterSpacing: 1,
    color: Colors.onSurface,
  },
  highTag: {
    backgroundColor: `${Colors.tertiary}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  highTagText: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.tertiary,
  },
  deleteBtn: {
    padding: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bankChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${Colors.primary}12`,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bankChipEmpty: {
    backgroundColor: Colors.surface,
    borderColor: `${Colors.outlineVariant}70`,
  },
  bankChipText: {
    fontFamily: 'VT323',
    fontSize: 12,
    letterSpacing: 1,
    color: Colors.primary,
  },
  bankChipTextEmpty: {
    color: Colors.onSurfaceVariant,
  },
  rateChip: {
    fontFamily: 'VT323',
    fontSize: 12,
    letterSpacing: 1,
    color: Colors.onSurfaceVariant,
  },
  rateChipDanger: {
    color: Colors.tertiary,
  },
  progressSection: { gap: 6 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: {
    fontFamily: 'VT323',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: Colors.onSurfaceVariant,
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
    color: Colors.onSurface,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: `${Colors.outlineVariant}40`,
    gap: Spacing.sm,
  },
  footerText: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.onSurfaceVariant,
  },
  payBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    alignItems: 'center',
  },
  payBtnText: {
    fontFamily: 'VT323',
    fontSize: 15,
    letterSpacing: 1.5,
    color: Colors.onPrimary,
  },
  payBtnAlt: {
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: `${Colors.primary}10`,
  },
  payBtnAltText: {
    fontFamily: 'VT323',
    fontSize: 15,
    letterSpacing: 1.5,
    color: Colors.primary,
  },
  paidThisMonth: {
    fontFamily: 'VT323',
    fontSize: 12,
    letterSpacing: 1,
    color: Colors.secondary,
    textAlign: 'center',
  },
});

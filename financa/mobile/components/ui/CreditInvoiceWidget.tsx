/**
 * CreditInvoiceWidget — always-visible credit card invoice summary.
 *
 * Colour rules:
 *   > 10 days  → normal (primary gold)
 *   7–10 days  → warning (orange)
 *   ≤ 7 days   → danger (red / tertiary)
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';
import { formatBRL, money } from '@/lib/money';
import {
  getCurrentInvoiceMonthKey,
  getInvoiceClosingDate,
  getDaysUntilClosing,
  getInvoiceUrgency,
  formatInvoiceLabel,
  isInvoiceClosed,
  getInvoiceMonthKey,
  type InvoiceUrgency,
} from '@/lib/credit';
import { useTransactionStore, Transaction } from '@/store/transactionStore';

const URGENCY_COLOR: Record<InvoiceUrgency, string> = {
  normal:  Colors.primary,
  warning: '#FFA726',  // orange
  danger:  Colors.tertiary,
};

interface Props {
  closingDay: number;
  dueDay: number;
  onPress?: () => void;
}

function getInvoiceTotalCents(
  transactions: Transaction[],
  invoiceMonthKey: string,
  closingDay: number,
): number {
  return transactions
    .filter(
      (t) =>
        !t.deleted_at &&
        t.type === 'credit' &&
        getInvoiceMonthKey(t.date, closingDay) === invoiceMonthKey,
    )
    .reduce((s, t) => s + t.amount_cents, 0);
}

export function CreditInvoiceWidget({ closingDay, dueDay, onPress }: Props) {
  const { transactions } = useTransactionStore();

  const currentKey = getCurrentInvoiceMonthKey(closingDay);
  const urgency    = getInvoiceUrgency(closingDay);
  const accentColor = URGENCY_COLOR[urgency];
  const days       = getDaysUntilClosing(closingDay);
  const closed     = isInvoiceClosed(currentKey, closingDay);

  const currentTotal = getInvoiceTotalCents(transactions, currentKey, closingDay);

  // Also check if there's a previous invoice that was closed but not yet "paid"
  // (i.e., the one just before current)
  const [y, m] = currentKey.split('-').map(Number);
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear  = m === 1 ? y - 1 : y;
  const prevKey   = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
  const prevClosed = isInvoiceClosed(prevKey, closingDay);
  const prevTotal  = getInvoiceTotalCents(transactions, prevKey, closingDay);
  const prevHasBalance = prevTotal > 0 && prevClosed;

  const closingDate = getInvoiceClosingDate(currentKey, closingDay);
  const closingLabel = closingDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  const daysLabel =
    closed
      ? 'FECHADA'
      : days === 0
      ? 'FECHA HOJE'
      : days === 1
      ? 'FECHA AMANHÃ'
      : `FECHA EM ${days}D`;

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: `${accentColor}40` }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="credit-card-outline" size={14} color={accentColor} />
          <Text style={[styles.title, { color: accentColor }]}>CARTÃO DE CRÉDITO</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${accentColor}20` }]}>
          <Text style={[styles.badgeText, { color: accentColor }]}>{daysLabel}</Text>
        </View>
      </View>

      {/* Current invoice */}
      <View style={styles.invoiceRow}>
        <View>
          <Text style={styles.invoiceLabel}>FATURA {formatInvoiceLabel(currentKey)}</Text>
          <Text style={styles.closingHint}>Fecha {closingLabel} · dia {dueDay} pagar</Text>
        </View>
        <Text style={[styles.invoiceAmount, { color: closed ? Colors.tertiary : accentColor }]}>
          {formatBRL(money(currentTotal))}
        </Text>
      </View>

      {/* Previous invoice warning (closed but presumably unpaid) */}
      {prevHasBalance && (
        <View style={[styles.prevRow, { borderColor: `${Colors.tertiary}40` }]}>
          <Text style={styles.prevLabel}>⚠ FATURA {formatInvoiceLabel(prevKey)} EM ABERTO</Text>
          <Text style={[styles.prevAmount, { color: Colors.tertiary }]}>
            {formatBRL(money(prevTotal))}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceLow,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontFamily: 'VT323',
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: 'VT323',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  invoiceLabel: {
    fontFamily: 'VT323',
    fontSize: 18,
    letterSpacing: 1,
    color: Colors.onSurface,
  },
  closingHint: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  invoiceAmount: {
    fontFamily: 'VT323',
    fontSize: 28,
    fontVariant: ['tabular-nums'],
  },
  prevRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    marginTop: 2,
  },
  prevLabel: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.tertiary,
  },
  prevAmount: {
    fontFamily: 'VT323',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
});

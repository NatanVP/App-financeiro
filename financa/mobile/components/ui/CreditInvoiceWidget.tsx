/**
 * CreditInvoiceWidget — Aviso de fatura na taverna.
 *
 * Urgência:
 *   > 10 dias  → normal (ouro)
 *   7–10 dias  → aviso (âmbar)
 *   ≤ 7 dias   → perigo (vermelho sangue)
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Spacing } from '@/constants/theme';
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

// ── Tavern palette ──────────────────────────────────────────
const T = {
  plank:      '#1E0E07',
  plankDark:  '#160A04',
  border:     '#5C3218',
  borderGold: '#7A4A1A',
  amber:      '#D4860A',
  gold:       '#E8B84B',
  orange:     '#C45E0A',
  red:        '#CC3322',
  cream:      '#F0DEB0',
  creamDim:   '#9A7850',
  grainLine:  '#2A1208',
};

const URGENCY_COLOR: Record<InvoiceUrgency, string> = {
  normal:  T.gold,
  warning: T.orange,
  danger:  T.red,
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

  const currentKey  = getCurrentInvoiceMonthKey(closingDay);
  const urgency     = getInvoiceUrgency(closingDay);
  const accentColor = URGENCY_COLOR[urgency];
  const days        = getDaysUntilClosing(closingDay);
  const closed      = isInvoiceClosed(currentKey, closingDay);

  const currentTotal = getInvoiceTotalCents(transactions, currentKey, closingDay);

  const [y, m] = currentKey.split('-').map(Number);
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear  = m === 1 ? y - 1 : y;
  const prevKey   = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
  const prevClosed = isInvoiceClosed(prevKey, closingDay);
  const prevTotal  = getInvoiceTotalCents(transactions, prevKey, closingDay);
  const prevHasBalance = prevTotal > 0 && prevClosed;

  const closingDate  = getInvoiceClosingDate(currentKey, closingDay);
  const closingLabel = closingDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  const daysLabel =
    closed      ? 'FECHADA'       :
    days === 0  ? 'FECHA HOJE'    :
    days === 1  ? 'FECHA AMANHÃ'  :
    `FECHA EM ${days}D`;

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: `${accentColor}50` }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Entalhes de madeira horizontais */}
      <View style={styles.grainTop} />

      {/* Tocha indicadora de urgência */}
      <View style={styles.urgencyBar}>
        <View style={[styles.urgencyTorch, { backgroundColor: accentColor }]} />
      </View>

      <View style={styles.inner}>
        {/* Cabeçalho */}
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Text style={styles.titleIcon}>💳</Text>
            <Text style={[styles.title, { color: accentColor }]}>CARTÃO DE CRÉDITO</Text>
          </View>
          <View style={[styles.badge, { borderColor: `${accentColor}50`, backgroundColor: `${accentColor}15` }]}>
            <Text style={[styles.badgeText, { color: accentColor }]}>{daysLabel}</Text>
          </View>
        </View>

        {/* Separador de madeira */}
        <View style={styles.woodDivider} />

        {/* Fatura atual */}
        <View style={styles.invoiceRow}>
          <View>
            <Text style={styles.invoiceLabel}>FATURA {formatInvoiceLabel(currentKey)}</Text>
            <Text style={styles.closingHint}>Fecha {closingLabel} · pagar dia {dueDay}</Text>
          </View>
          <Text style={[styles.invoiceAmount, { color: closed ? T.red : accentColor }]}>
            {formatBRL(money(currentTotal))}
          </Text>
        </View>

        {/* Fatura anterior em aberto */}
        {prevHasBalance && (
          <View style={styles.prevRow}>
            <Text style={styles.prevLabel}>⚠ FATURA {formatInvoiceLabel(prevKey)} EM ABERTO</Text>
            <Text style={[styles.prevAmount, { color: T.red }]}>
              {formatBRL(money(prevTotal))}
            </Text>
          </View>
        )}
      </View>

      {/* Entalhe inferior */}
      <View style={styles.grainBottom} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.plank,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },

  // ── Veios de madeira ──────────────────────────────────
  grainTop: {
    height: 4,
    backgroundColor: T.grainLine,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  grainBottom: {
    height: 4,
    backgroundColor: T.grainLine,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },

  // ── Barra de urgência (lateral esquerda) ──────────────
  urgencyBar: {
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 4,
    width: 4,
    overflow: 'hidden',
  },
  urgencyTorch: {
    flex: 1,
    opacity: 0.85,
  },

  inner: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    paddingLeft: Spacing.lg + 4, // compensar barra de urgência
  },

  // ── Cabeçalho ─────────────────────────────────────────
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
  titleIcon: { fontSize: 14 },
  title: {
    fontFamily: 'VT323',
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: 'VT323',
    fontSize: 12,
    letterSpacing: 1.5,
  },

  // ── Divisor de madeira ────────────────────────────────
  woodDivider: {
    height: 1,
    backgroundColor: T.border,
    marginVertical: 2,
  },

  // ── Fatura ────────────────────────────────────────────
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  invoiceLabel: {
    fontFamily: 'VT323',
    fontSize: 18,
    letterSpacing: 1,
    color: T.cream,
  },
  closingHint: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 1,
    color: T.creamDim,
    marginTop: 2,
  },
  invoiceAmount: {
    fontFamily: 'VT323',
    fontSize: 28,
    fontVariant: ['tabular-nums'],
  },

  // ── Fatura anterior ───────────────────────────────────
  prevRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: `${T.red}40`,
    marginTop: 2,
  },
  prevLabel: {
    fontFamily: 'VT323',
    fontSize: 11,
    letterSpacing: 1,
    color: T.red,
  },
  prevAmount: {
    fontFamily: 'VT323',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
});

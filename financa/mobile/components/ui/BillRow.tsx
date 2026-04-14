import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Typography } from '@/constants/theme';
import { formatBRL, Money } from '@/lib/money';
import { FinancialChip } from './FinancialChip';

type BillStatus = 'pending' | 'paid' | 'overdue' | 'scheduled';

interface Props {
  name: string;
  amountCents: Money;
  dueDateLabel: string;
  status: BillStatus;
  onPress?: () => void;
}

const STATUS_MAP: Record<BillStatus, { label: string; variant: 'positive' | 'negative' | 'neutral'; dateColor: string }> = {
  paid: { label: 'Pago', variant: 'positive', dateColor: Colors.onSurfaceVariant },
  overdue: { label: 'Atrasado', variant: 'negative', dateColor: Colors.tertiary },
  pending: { label: 'Pendente', variant: 'neutral', dateColor: Colors.onSurfaceVariant },
  scheduled: { label: 'Agendado', variant: 'neutral', dateColor: Colors.onSurfaceVariant },
};

export function BillRow({ name, amountCents, dueDateLabel, status, onPress }: Props) {
  const config = STATUS_MAP[status];

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.left}>
        <Text style={styles.name}>{name}</Text>
        <Text style={[styles.date, { color: config.dateColor }]}>{dueDateLabel}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, status === 'overdue' && { color: Colors.tertiary }]}>
          {(amountCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Text>
        <FinancialChip label={config.label} variant={config.variant} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  left: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  name: { ...Typography.titleSm, color: Colors.onSurface },
  date: { ...Typography.labelSm, textTransform: 'uppercase', fontWeight: '500' },
  amount: { ...Typography.bodySm, fontWeight: '700', color: Colors.onSurface, fontVariant: ['tabular-nums'] },
});

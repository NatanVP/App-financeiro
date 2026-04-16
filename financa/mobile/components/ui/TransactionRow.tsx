import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Typography } from '@/constants/theme';
import { formatBRL, Money } from '@/lib/money';

interface Props {
  description: string;
  categoryName?: string;
  amountCents: Money;
  type: 'income' | 'expense' | 'transfer';
  icon?: string;
  onPress?: () => void;
}

export function TransactionRow({
  description,
  categoryName,
  amountCents,
  type,
  onPress,
}: Props) {
  const amountColor = type === 'income' ? Colors.secondary : Colors.onSurface;
  const amountText = type === 'income'
    ? `+ ${formatBRL(amountCents)}`
    : `- ${formatBRL(amountCents)}`;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {/* Icon placeholder */}
      <View style={styles.iconBg}>
        <View style={styles.iconDot} />
      </View>

      <View style={styles.content}>
        <Text style={styles.description} numberOfLines={1}>
          {categoryName ?? description}
        </Text>
        {categoryName && description ? (
          <Text style={styles.category} numberOfLines={1}>{description}</Text>
        ) : null}
      </View>

      <Text style={[styles.amount, { color: amountColor, fontWeight: type === 'income' ? '700' : '500' }]}>
        {amountText}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.onSurfaceVariant,
  },
  content: { flex: 1, minWidth: 0 },
  description: {
    ...Typography.bodySm,
    color: Colors.onSurface,
    fontWeight: '500',
  },
  category: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  amount: {
    ...Typography.bodySm,
    marginLeft: 8,
    fontVariant: ['tabular-nums'],
  },
});

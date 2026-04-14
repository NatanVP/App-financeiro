import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Typography } from '@/constants/theme';
import { formatBRL, Money } from '@/lib/money';

interface Props {
  cents: Money;
  size?: 'display' | 'headline' | 'body' | 'label';
  color?: string;
  showSign?: boolean;
  style?: object;
}

/**
 * Displays a Money value in BRL format with tabular-nums font variant.
 * Uses the "R$" prefix in a smaller weight for display size.
 */
export function MoneyDisplay({ cents, size = 'body', color, showSign = false, style }: Props) {
  const textColor = color ?? Colors.onSurface;

  if (size === 'display') {
    return (
      <View style={[styles.row, style]}>
        <Text style={[styles.prefix, { color: textColor, opacity: 0.5 }]}>R$ </Text>
        <Text style={[styles.display, { color: textColor }]}>
          {formatAmount(cents, showSign)}
        </Text>
      </View>
    );
  }

  const textStyle = {
    display: styles.display,
    headline: styles.headline,
    body: styles.body,
    label: styles.label,
  }[size];

  return (
    <Text style={[textStyle, { color: textColor }, style]}>
      {formatBRL(cents, showSign)}
    </Text>
  );
}

function formatAmount(cents: Money, showSign: boolean): string {
  const reais = Math.abs(cents) / 100;
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais);
  if (showSign) return cents >= 0 ? `+${formatted}` : `-${formatted}`;
  return cents < 0 ? `-${formatted}` : formatted;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline' },
  prefix: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  display: { ...Typography.displaySm, fontVariant: ['tabular-nums'] as const[] },
  headline: { ...Typography.headlineSm, fontVariant: ['tabular-nums'] as const[] },
  body: { ...Typography.bodySm, fontVariant: ['tabular-nums'] as const[] },
  label: { ...Typography.labelSm, fontVariant: ['tabular-nums'] as const[] },
});

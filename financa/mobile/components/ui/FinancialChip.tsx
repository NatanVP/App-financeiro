import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';

interface Props {
  label: string;
  variant: 'positive' | 'negative' | 'neutral';
}

/**
 * Small status chip for transaction/budget status indicators.
 * Design: 2px radius, positive=green bg, negative=red bg.
 */
export function FinancialChip({ label, variant }: Props) {
  const bgColor = {
    positive: `${Colors.secondary}20`,
    negative: `${Colors.tertiary}20`,
    neutral: Colors.surfaceHigh,
  }[variant];

  const textColor = {
    positive: Colors.secondary,
    negative: Colors.tertiary,
    neutral: Colors.onSurfaceVariant,
  }[variant];

  return (
    <View style={[styles.chip, { backgroundColor: bgColor }]}>
      <Text style={[styles.label, { color: textColor }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

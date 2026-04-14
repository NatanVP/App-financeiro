import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Typography } from '@/constants/theme';
import { formatBRL, Money } from '@/lib/money';
import { CircularProgress } from './CircularProgress';

interface Props {
  name: string;
  currentCents: Money;
  targetCents: Money;
  targetDate?: string;
  color?: string;
  isOverdue?: boolean;
  onPress?: () => void;
}

export function GoalCard({
  name,
  currentCents,
  targetCents,
  targetDate,
  color = Colors.primary,
  isOverdue = false,
  onPress,
}: Props) {
  const progress = targetCents > 0 ? currentCents / targetCents : 0;
  const pct = Math.round(progress * 100);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <CircularProgress
        progress={progress}
        size={80}
        color={color}
        label={`${pct}%`}
      />

      <View style={styles.info}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {targetDate ? (
            <Text style={styles.date}>{targetDate}</Text>
          ) : null}
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.metaLabel}>Atual / Alvo</Text>
            <Text style={styles.amounts}>
              {(currentCents / 100).toLocaleString('pt-BR')} / {(targetCents / 100).toLocaleString('pt-BR')}
            </Text>
          </View>

          {isOverdue && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ATRASADO</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceLow,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  info: { flex: 1, justifyContent: 'space-between', height: 80 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { ...Typography.titleSm, color: Colors.onSurface, flex: 1 },
  date: { ...Typography.labelSm, color: Colors.onSurfaceVariant, fontVariant: ['tabular-nums'] },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  metaLabel: { ...Typography.labelSm, textTransform: 'uppercase', color: Colors.onSurfaceVariant, letterSpacing: 0.5 },
  amounts: { ...Typography.bodySm, fontWeight: '700', color: Colors.onSurface, fontVariant: ['tabular-nums'] },
  badge: { backgroundColor: `${Colors.tertiary}20`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  badgeText: { fontSize: 9, fontWeight: '800', color: Colors.tertiary },
});

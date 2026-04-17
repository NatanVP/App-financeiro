import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Typography } from '@/constants/theme';
import { formatBRL, Money } from '@/lib/money';
import { RPGIcon, RPGIconName } from '@/components/ui/RPGIcon';

interface Props {
  description: string;
  categoryName?: string;
  categoryIcon?: RPGIconName;
  amountCents: Money;
  type: 'income' | 'expense' | 'transfer' | 'credit';
  onPress?: () => void;
}

export function TransactionRow({
  description,
  categoryName,
  categoryIcon,
  amountCents,
  type,
  onPress,
}: Props) {
  const amountColor =
    type === 'income' ? Colors.secondary :
    type === 'transfer' ? Colors.primary :
    type === 'credit' ? '#64B5F6' :
    Colors.onSurface;
  const amountText =
    type === 'income' ? `+ ${formatBRL(amountCents)}` :
    type === 'transfer' ? `↔ ${formatBRL(amountCents)}` :
    `- ${formatBRL(amountCents)}`;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>

      {/* Pergaminho — ocupa toda a linha */}
      <View style={styles.scroll}>
        {/* Ponta superior */}
        <View style={styles.roll}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
        </View>

        {/* Conteúdo */}
        <View style={styles.body}>
          {/* Ícone + nome da categoria */}
          <View style={styles.left}>
            {categoryIcon && (
              <View style={styles.iconWrap}>
                <RPGIcon name={categoryIcon} size={22} chip={false} />
              </View>
            )}
            <View style={styles.textCol}>
              <Text style={styles.catName} numberOfLines={1}>
                {categoryName ?? description}
              </Text>
              {categoryName && description ? (
                <Text style={styles.desc} numberOfLines={1}>{description}</Text>
              ) : null}
            </View>
          </View>

          {/* Valor */}
          <Text style={[styles.amount, { color: amountColor }]}>
            {amountText}
          </Text>
        </View>

        {/* Ponta inferior */}
        <View style={styles.roll}>
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },

  scroll: {
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceHighest,
    overflow: 'hidden',
  },

  roll: {
    height: 6,
    backgroundColor: Colors.surfaceHighest,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  corner: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: Colors.outline,
  },
  cornerTL: { top: 1, left: 4 },
  cornerTR: { top: 1, right: 4 },
  cornerBL: { bottom: 1, left: 4 },
  cornerBR: { bottom: 1, right: 4 },

  body: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },

  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },

  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceLowest,
    flexShrink: 0,
  },

  textCol: { flex: 1, minWidth: 0 },

  catName: {
    fontFamily: 'VT323',
    fontSize: 20,
    letterSpacing: 0.5,
    color: Colors.onSurface,
  },
  desc: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },

  amount: {
    fontFamily: 'VT323',
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
});

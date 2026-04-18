/**
 * TransactionRow — bloco de pedra da Masmorra.
 * Variantes determinísticas por hash: normal · musgo · rachado · escuro
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatBRL, Money } from '@/lib/money';
import { RPGIcon, RPGIconName } from '@/components/ui/RPGIcon';

// ── Paleta (idêntica à da tela Masmorra) ───────────────────
const P = {
  // Pedra
  stone0:   '#1C1C28',
  stone1:   '#222232',
  stone2:   '#282838',
  stone3:   '#1A1A24',   // escuro (variante 3)
  mortar:   '#0C0C16',
  chip:     '#2E2E44',
  // Hera
  ivy0:     '#1A3A10',
  ivy1:     '#2A5A1A',
  ivy2:     '#3A7A22',
  ivy3:     '#4A9A2A',
  ivy4:     '#5AB030',
  // Rachadura
  crack:    '#383848',
  crackDim: '#282838',
  // Alcova
  alcove:   '#0A0A12',
  // Texto
  cream:    '#C8C8D8',
  silver:   '#8A8A9A',
  dim:      '#484860',
  // Valores
  green:    '#4ABA5A',
  red:      '#BA4A4A',
  blue:     '#5A8ACA',
  torch:    '#D4860A',
};

const IVY_C = [P.ivy0, P.ivy1, P.ivy2, P.ivy3, P.ivy4];

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
  // ── Cor e texto do valor ──────────────────────────────
  const amountColor =
    type === 'income'   ? P.green :
    type === 'transfer' ? P.torch :
    type === 'credit'   ? P.blue  :
    P.red;

  const amountText =
    type === 'income'   ? `+${formatBRL(amountCents)}` :
    type === 'transfer' ? `↔ ${formatBRL(amountCents)}` :
    `-${formatBRL(amountCents)}`;

  // ── Variante determinística por hash ──────────────────
  // 0 = pedra padrão | 1 = musgo | 2 = rachado | 3 = pedra escura
  const seed = (categoryName ?? description)
    .split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
  const variant = seed % 4;

  const blockBg =
    variant === 1 ? P.stone1 :
    variant === 2 ? P.stone0 :
    variant === 3 ? P.stone3 :
    P.stone0;

  const mortarBorderColor =
    variant === 1 ? P.ivy1 :
    P.mortar;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.78}>
      <View style={[styles.block, { backgroundColor: blockBg }]}>

        {/* ── Argamassa superior ──────────────────── */}
        <View style={[styles.mortarBar, { borderBottomColor: mortarBorderColor }]}>
          {/* Fragmentos pixel de pedra */}
          <View style={[styles.chip, { left: 12 }]} />
          <View style={[styles.chip, { left: 36, width: 6 }]} />
          <View style={[styles.chip, { left: 80, width: 3 }]} />
          {/* Rachadura no topo (variant 2) */}
          {variant === 2 && <View style={styles.crackTop} />}
        </View>

        {/* ── Corpo do bloco ──────────────────────── */}
        <View style={styles.body}>

          {/* Barra de musgo lateral esquerda (variant 1) */}
          {variant === 1 && (
            <View style={styles.mossStripe} pointerEvents="none" />
          )}

          {/* Rachadura diagonal (variant 2) */}
          {variant === 2 && (
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
              {/* Simula rachadura com série de pixels escuros */}
              {[0,4,8,12,16,20].map((off, i) => (
                <View key={i} style={{
                  position: 'absolute',
                  left: 60 + off,
                  top: 4 + off,
                  width: 1, height: 3,
                  backgroundColor: P.crack,
                }} />
              ))}
            </View>
          )}

          {/* ── Alcova do ícone ──────────────────── */}
          <View style={[styles.alcove, variant === 1 && styles.alcoveMoss]}>
            {categoryIcon ? (
              <RPGIcon name={categoryIcon} size={20} chip={false} />
            ) : (
              <Text style={styles.alcoveGlyph}>▪</Text>
            )}
          </View>

          {/* ── Texto ────────────────────────────── */}
          <View style={styles.textCol}>
            <Text style={styles.catName} numberOfLines={1}>
              {categoryName ?? description}
            </Text>
            {categoryName && description ? (
              <Text style={styles.desc} numberOfLines={1}>{description}</Text>
            ) : null}
          </View>

          {/* ── Valor ────────────────────────────── */}
          <Text style={[styles.amount, { color: amountColor }]}>
            {amountText}
          </Text>
        </View>

        {/* ── Argamassa inferior ──────────────────── */}
        <View style={[styles.mortarBar, { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: mortarBorderColor }]}>
          <View style={[styles.chip, { right: 14, left: undefined }]} />
          <View style={[styles.chip, { right: 42, left: undefined, width: 5 }]} />
        </View>

      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 8,
    paddingVertical: 1,
  },

  block: {
    overflow: 'hidden',
    // Borda lateral sutil simulando separação entre blocos
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: '#181824',
    borderRightColor: '#181824',
  },

  // ── Argamassa ───────────────────────────────────────
  mortarBar: {
    height: 4,
    backgroundColor: P.mortar,
    borderBottomWidth: 1,
    borderBottomColor: P.mortar,
    position: 'relative',
  },
  chip: {
    position: 'absolute',
    top: 1, left: 0,
    width: 4, height: 2,
    backgroundColor: P.chip,
  },
  crackTop: {
    position: 'absolute',
    top: 0,
    left: '35%',
    width: 1, height: 4,
    backgroundColor: P.crack,
  },

  // ── Corpo ───────────────────────────────────────────
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
    position: 'relative',
  },

  // ── Musgo lateral (variant 1) ────────────────────────
  mossStripe: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: P.ivy2,
    opacity: 0.85,
  },

  // ── Alcova ──────────────────────────────────────────
  alcove: {
    width: 34, height: 34,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: P.alcove,
    borderWidth: 1, borderColor: '#1E1E2C',
    flexShrink: 0,
  },
  alcoveMoss: {
    borderColor: P.ivy1,
    borderLeftWidth: 2,
    borderLeftColor: P.ivy2,
  },
  alcoveGlyph: {
    fontSize: 10,
    color: P.dim,
  },

  // ── Texto ────────────────────────────────────────────
  textCol: { flex: 1, minWidth: 0 },
  catName: {
    fontFamily: 'VT323',
    fontSize: 20,
    letterSpacing: 0.5,
    color: P.cream,
  },
  desc: {
    fontFamily: 'VT323',
    fontSize: 13,
    color: P.silver,
  },

  // ── Valor ────────────────────────────────────────────
  amount: {
    fontFamily: 'VT323',
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
});

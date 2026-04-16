import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { RPGIcon, RPGIconName } from '@/components/ui/RPGIcon';

interface ScrollCardProps {
  icon?: RPGIconName;
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  /** hero=true usa borda dourada dupla e roll mais grosso (card principal) */
  hero?: boolean;
}

/**
 * ScrollCard — card estilo pergaminho pixel art.
 * Pontas enroladas (roll) no topo e base + cabeçalho com ícone integrado.
 * Mesmas cores da paleta The Sovereign's Ledger.
 */
export function ScrollCard({ icon, title, children, style, hero = false }: ScrollCardProps) {
  return (
    <View style={[styles.outer, hero && styles.outerHero, style]}>

      {/* Ponta superior do pergaminho */}
      <View style={[styles.roll, hero && styles.rollHero]}>
        {/* cantos ornamentais */}
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
      </View>

      {/* Cabeçalho com ícone + título */}
      {(icon || title) && (
        <View style={[styles.header, hero && styles.headerHero]}>
          {icon && (
            <View style={styles.iconWrap}>
              <RPGIcon name={icon} size={hero ? 20 : 16} chip={false} />
            </View>
          )}
          {title && (
            <Text style={[styles.title, hero && styles.titleHero]}>{title}</Text>
          )}
        </View>
      )}

      {/* Separador */}
      {(icon || title) && (
        <View style={[styles.divider, hero && styles.dividerHero]} />
      )}

      {/* Corpo do pergaminho */}
      <View style={[styles.body, hero && styles.bodyHero]}>
        {children}
      </View>

      {/* Ponta inferior do pergaminho */}
      <View style={[styles.roll, hero && styles.rollHero]}>
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  // ── Outer border ────────────────────────────────────────────────
  outer: {
    borderWidth: 1,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceLow,
    overflow: 'hidden',
  },
  outerHero: {
    borderWidth: 2,
    borderColor: Colors.outline,
    backgroundColor: Colors.surfaceHighest,
  },

  // ── Roll (pontas enroladas) ──────────────────────────────────────
  roll: {
    height: 8,
    backgroundColor: Colors.surfaceHighest,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  rollHero: {
    height: 12,
    backgroundColor: Colors.surfaceContainerHighest,
    borderColor: Colors.outline,
  },

  // ── Cantos ornamentais (pixels decorativos nos cantos do roll) ───
  corner: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: Colors.outline,
  },
  cornerTL: { top: 2, left: 4 },
  cornerTR: { top: 2, right: 4 },
  cornerBL: { bottom: 2, left: 4 },
  cornerBR: { bottom: 2, right: 4 },

  // ── Header ──────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceHigh,
  },
  headerHero: {
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surfaceHighest,
  },

  // ── Ícone integrado no header (sem chip, fundo do header é o container) ──
  iconWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceLowest,
  },

  // ── Título ──────────────────────────────────────────────────────
  title: {
    fontFamily: 'VT323',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
    flexShrink: 1,
    flexWrap: 'wrap',
    flex: 1,
  },
  titleHero: {
    fontSize: 14,
    color: Colors.primaryText,
    letterSpacing: 2.5,
  },

  // ── Divider ─────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
  },
  dividerHero: {
    backgroundColor: Colors.outline,
  },

  // ── Body ────────────────────────────────────────────────────────
  body: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  bodyHero: {
    padding: Spacing.xl,
  },
});

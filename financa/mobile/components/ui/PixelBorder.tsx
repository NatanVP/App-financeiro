import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';

interface PixelBorderProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Cor da borda externa (padrão: dourado envelhecido) */
  outerColor?: string;
  /** Cor da borda interna (padrão: surface mais clara) */
  innerColor?: string;
  padding?: number;
}

/**
 * PixelBorder — simula borda dupla estilo menu de RPG clássico (9-patch pixel art).
 * Camada externa escura + camada interna mais clara = efeito "forjado em pedra".
 */
export function PixelBorder({
  children,
  style,
  outerColor = Colors.outline,
  innerColor = Colors.surfaceHighest,
  padding = 12,
}: PixelBorderProps) {
  return (
    <View style={[styles.outer, { borderColor: outerColor }, style]}>
      <View style={[styles.inner, { borderColor: innerColor, padding }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderWidth: 2,
    borderRadius: 0,
    backgroundColor: Colors.surface,
  },
  inner: {
    borderWidth: 1,
    borderRadius: 0,
  },
});

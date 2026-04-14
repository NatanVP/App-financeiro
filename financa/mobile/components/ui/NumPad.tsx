import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

interface Props {
  onPress: (key: string) => void;
}

const KEYS: string[] = ['1','2','3','4','5','6','7','8','9',',','0','⌫'];

/**
 * Custom numeric keypad for quick transaction entry.
 * Matches the design: 3×4 grid, ⌫ for backspace, comma for decimal.
 */
export function NumPad({ onPress }: Props) {
  return (
    <View style={styles.grid}>
      {KEYS.map((key) => (
        <TouchableOpacity
          key={key}
          style={[styles.key, key === '⌫' && styles.keyDelete]}
          onPress={() => onPress(key)}
          activeOpacity={0.6}
        >
          <Text style={[styles.keyText, key === '⌫' && styles.deleteText]}>
            {key}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.surfaceLowest,
    borderRadius: 8,
    overflow: 'hidden',
    gap: 1,
  },
  key: {
    width: '33.333%',
    aspectRatio: 2,
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyDelete: {
    backgroundColor: Colors.surface,
  },
  keyText: {
    ...Typography.titleMd,
    color: Colors.onSurface,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  deleteText: {
    color: Colors.onSurfaceVariant,
    fontSize: 18,
  },
});

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

interface Props {
  onPress: (key: string) => void;
}

const ROWS: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [',', '0', '⌫'],
];

/**
 * Custom numeric keypad — grid 3×4.
 * Estruturado em linhas com flex:1 para evitar bug de gap + width%.
 */
export function NumPad({ onPress }: Props) {
  return (
    <View style={styles.grid}>
      {ROWS.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((key) => (
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
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    backgroundColor: Colors.surfaceLowest,
    borderRadius: 0,
    overflow: 'hidden',
    gap: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 1,
  },
  key: {
    flex: 1,
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

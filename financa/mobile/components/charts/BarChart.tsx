import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';

interface Bar {
  value: number;
  label: string;
  isHighlighted?: boolean;
}

interface Props {
  data: Bar[];
  height?: number;
  barColor?: string;
  highlightColor?: string;
}

/**
 * Minimal custom bar chart for the dashboard cash flow visualization.
 * Uses native View bars — no external chart library required for this simple case.
 * For richer charts (line, area), use victory-native.
 */
export function BarChart({
  data,
  height = 160,
  barColor = Colors.surfaceHigh,
  highlightColor = Colors.primary,
}: Props) {
  const maxValue = Math.max(...data.map((d) => Math.abs(d.value)), 1);

  return (
    <View style={[styles.container, { height }]}>
      {/* Bars */}
      <View style={styles.barsRow}>
        {data.map((bar, i) => {
          const barHeight = (Math.abs(bar.value) / maxValue) * (height - 20);
          const isNegative = bar.value < 0;
          const color = bar.isHighlighted
            ? (isNegative ? Colors.tertiary : highlightColor)
            : (isNegative ? Colors.tertiaryContainer : barColor);
          return (
            <View key={i} style={styles.barWrapper}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(2, barHeight),
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
      {/* Labels */}
      <View style={styles.labelsRow}>
        {data.map((bar, i) => (
          <Text
            key={i}
            style={[styles.label, bar.isHighlighted && { color: Colors.primary }]}
          >
            {bar.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  barsRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingHorizontal: 4 },
  barWrapper: { flex: 1 },
  barContainer: { justifyContent: 'flex-end', height: '100%' },
  bar: { width: '100%', borderRadius: 2 },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 4 },
  label: { fontSize: 8, color: Colors.outlineVariant, fontWeight: '500', fontVariant: ['tabular-nums'] },
});

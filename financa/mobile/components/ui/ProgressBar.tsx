import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/theme';

interface Props {
  progress: number;  // 0–1
  color?: string;
  backgroundColor?: string;
  height?: number;
}

export function ProgressBar({
  progress,
  color = Colors.primary,
  backgroundColor = Colors.surfaceHighest,
  height = 4,
}: Props) {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  return (
    <View style={[styles.track, { backgroundColor, height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            width: `${clampedProgress * 100}%`,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});

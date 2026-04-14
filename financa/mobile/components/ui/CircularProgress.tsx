import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Typography } from '@/constants/theme';

interface Props {
  progress: number;  // 0–1
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

/**
 * Circular progress ring with optional percentage label in center.
 * Matches the Goals screen design.
 */
export function CircularProgress({
  progress,
  size = 80,
  strokeWidth = 4,
  color = Colors.primary,
  label,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.surfaceHighest}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          // Rotate to start from top
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      {label !== undefined && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: Colors.onSurface }]}>{label}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  svg: { position: 'absolute' },
  labelContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.labelSm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});

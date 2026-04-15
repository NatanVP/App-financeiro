/**
 * BankIcon — real bank logos as local image assets.
 */
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const LOGOS: Record<string, ReturnType<typeof require>> = {
  nubank: require('@/assets/banks/nubank.png'),
  itau:   require('@/assets/banks/itau.png'),
  inter:  require('@/assets/banks/inter.png'),
};

interface Props {
  bank: string;
  size?: number;
}

export function BankIcon({ bank, size = 28 }: Props) {
  const source = LOGOS[bank];

  if (!source) {
    return <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]} />;
  }

  return (
    <Image
      source={source}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: '#444' },
});

import React from 'react';
import { Image, ImageStyle, StyleProp, View } from 'react-native';
import { Colors } from '../../constants/theme';

const ICONS = {
  sword:        require('../../assets/icons/sword.png'),
  shield:       require('../../assets/icons/shield.png'),
  potion_green: require('../../assets/icons/potion_green.png'),
  potion_red:   require('../../assets/icons/potion_red.png'),
  potion_blue:  require('../../assets/icons/potion_blue.png'),
  key:          require('../../assets/icons/key.png'),
  chest:        require('../../assets/icons/chest.png'),
  barrel:       require('../../assets/icons/barrel.png'),
  trident:      require('../../assets/icons/trident.png'),
  coin_bag:     require('../../assets/icons/coin_bag.png'),
} as const;

export type RPGIconName = keyof typeof ICONS;

interface RPGIconProps {
  name: RPGIconName;
  size?: number;
  /** chip=true envolve o ícone num quadrado escuro com borda (padrão). false = ícone solto. */
  chip?: boolean;
  style?: StyleProp<ImageStyle>;
}

/**
 * RPGIcon — exibe ícones pixel art do tileset Kenney Tiny Dungeon (CC0).
 * Tiles 16×16 renderizados com interpolação nearest-neighbor para manter o visual pixel.
 * Por padrão envolve o ícone num chip escuro para isolar as cores originais do fundo preto.
 */
export function RPGIcon({ name, size = 20, chip = true, style }: RPGIconProps) {
  const img = (
    <Image
      source={ICONS[name]}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );

  if (!chip) return img;

  const pad = Math.round(size * 0.35);
  return (
    <View style={{
      backgroundColor: Colors.surfaceHighest,
      borderWidth: 1,
      borderColor: Colors.outlineVariant,
      padding: pad,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {img}
    </View>
  );
}

import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

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
} as const;

export type RPGIconName = keyof typeof ICONS;

interface RPGIconProps {
  name: RPGIconName;
  size?: number;
  style?: StyleProp<ImageStyle>;
}

/**
 * RPGIcon — exibe ícones pixel art do tileset Kenney Tiny Dungeon (CC0).
 * Tiles 16×16 renderizados com interpolação nearest-neighbor para manter o visual pixel.
 */
export function RPGIcon({ name, size = 20, style }: RPGIconProps) {
  return (
    <Image
      source={ICONS[name]}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}

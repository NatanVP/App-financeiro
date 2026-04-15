/**
 * Design tokens — The Sovereign's Ledger (RPG theme)
 * Paleta medieval: terra escura, ouro, escarlate, pergaminho
 */

export const Colors = {
  // Surface layers (terra → mesa → pergaminho)
  surfaceLowest: '#170C00',
  surfaceLow: '#1D1101',
  surface: '#271904',
  surfaceHigh: '#2B1D07',
  surfaceHighest: '#362710',
  background: '#1D1101',

  // Ouro (primary)
  primary: '#FFD700',
  primaryContainer: '#FFE16D',
  onPrimary: '#3A3000',
  onPrimaryContainer: '#221B00',

  // Verde floresta (receita/positivo)
  secondary: '#4CAF50',
  secondaryFixed: '#A5D6A7',
  secondaryContainer: '#2D5A27',
  onSecondary: '#002108',
  onSecondaryFixedVariant: '#1E3E1A',

  // Escarlate (dívidas/perigo)
  tertiary: '#FFB4A8',
  tertiaryFixed: '#FFDAD4',
  tertiaryContainer: '#920703',
  onTertiary: '#690000',
  onTertiaryFixed: '#410000',

  // Texto (pergaminho)
  onSurface: '#FADEBC',
  onSurfaceVariant: '#D0C6AB',
  primaryText: '#F5DEB3',

  // Contorno dourado envelhecido
  outline: '#999077',
  outlineVariant: '#4D4732',

  // Erro
  error: '#FFB4AB',
  errorContainer: '#93000A',

  // Surface alias para compatibilidade
  surfaceBright: '#47361E',
  surfaceContainer: '#2B1D07',
  surfaceContainerHigh: '#362710',
  surfaceContainerHighest: '#42321A',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const BorderRadius = {
  none: 0,
  sm: 0,  // pixel art: sem arredondamento
  md: 2,
  lg: 4,  // máximo permitido
  full: 4,
} as const;

export const Typography = {
  displaySm:  { fontFamily: 'VT323' as string, fontSize: 40, letterSpacing: 1 },
  headlineSm: { fontFamily: 'VT323' as string, fontSize: 28, letterSpacing: 0 },
  titleMd:    { fontFamily: 'VT323' as string, fontSize: 20 },
  titleSm:    { fontFamily: 'VT323' as string, fontSize: 16 },
  bodySm:     { fontFamily: 'VT323' as string, fontSize: 14, lineHeight: 18 },
  labelSm:    { fontFamily: 'VT323' as string, fontSize: 12, textTransform: 'uppercase' as const },
  labelXs:    { fontFamily: 'VT323' as string, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  monoSm:     { fontFamily: 'VT323' as string, fontSize: 14, fontVariant: ['tabular-nums'] as ('tabular-nums')[] },
} as const;

/** Gradiente dourado para CTAs e hero cards */
export const PrimaryGradient = {
  colors: ['#FFE16D', '#B8860B'] as [string, string],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
} as const;

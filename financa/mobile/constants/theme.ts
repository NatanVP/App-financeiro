/**
 * Design tokens extracted from the Finança Ledger design system (DESIGN.md).
 * All colors are the authoritative source for the React Native app.
 */

export const Colors = {
  // Surface layers (dark → light)
  surfaceLowest: '#0E0E10',
  surfaceLow: '#1B1B1D',
  surface: '#201F21',
  surfaceHigh: '#2A2A2C',
  surfaceHighest: '#353437',
  background: '#131315',

  // Brand accents
  primary: '#C0C1FF',
  primaryContainer: '#8083FF',
  onPrimary: '#1000A9',
  onPrimaryContainer: '#0D0096',

  // Positive / income
  secondary: '#69DC99',
  secondaryFixed: '#86F9B3',
  secondaryContainer: '#29A467',
  onSecondary: '#00391E',
  onSecondaryFixedVariant: '#00522E',

  // Negative / alerts
  tertiary: '#FFB3AE',
  tertiaryFixed: '#FFDAD7',
  tertiaryContainer: '#EF635E',
  onTertiary: '#68000B',
  onTertiaryFixed: '#410004',

  // Text
  onSurface: '#E5E1E4',
  onSurfaceVariant: '#C7C4D7',
  primaryText: '#F2F2F5',  // Use instead of pure white

  // Outline
  outline: '#908FA0',
  outlineVariant: '#464554',

  // Error
  error: '#FFB4AB',
  errorContainer: '#93000A',
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
  sm: 2,   // DEFAULT
  md: 4,   // lg
  lg: 8,   // xl
  full: 12, // full
} as const;

export const Typography = {
  displaySm: { fontSize: 36, fontWeight: '900' as const, letterSpacing: -1.5 },
  headlineSm: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.5 },
  titleMd: { fontSize: 16, fontWeight: '600' as const },
  titleSm: { fontSize: 14, fontWeight: '600' as const },
  bodySm: { fontSize: 12, lineHeight: 16 },
  labelSm: { fontSize: 11, lineHeight: 16 },
  labelXs: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  monoSm: { fontSize: 12, fontVariant: ['tabular-nums'] as const[] },
} as const;

/** Gradient for primary CTAs and hero cards */
export const PrimaryGradient = {
  colors: [Colors.primary, Colors.primaryContainer] as [string, string],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
} as const;

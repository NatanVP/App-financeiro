/**
 * Money type: branded integer in cents.
 * Prevents accidental mixing of float/Money/arbitrary numbers.
 *
 * NEVER use float for money — always convert to cents first.
 */
export type Money = number & { readonly __brand: 'Money' };

/** Cast a raw cents integer to Money. Use only at system boundaries. */
export function money(cents: number): Money {
  if (!Number.isInteger(cents)) {
    throw new Error(`money() requires an integer; got ${cents}`);
  }
  return cents as Money;
}

/** Símbolo de moeda de ouro usado no display */
export const GOLD_SYMBOL = 'G';

/** Format Money (cents) to Gold display, e.g. "1.234,56 G" */
export function formatBRL(cents: Money | number, showSign = false): string {
  const reais = cents / 100;
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais);
  const result = `${formatted} G`;
  if (showSign && cents > 0) return `+${result}`;
  return result;
}

/** Alias semântico para o tema RPG */
export const formatGold = formatBRL;

/** Format compact, e.g. 1234567 → "12.345,67 G" */
export function formatBRLShort(cents: Money): string {
  if (Math.abs(cents) >= 1_000_000_00) {
    return `${(cents / 1_000_000_00).toFixed(1)}M G`;
  }
  if (Math.abs(cents) >= 1_000_00) {
    return `${(cents / 1_000_00).toFixed(1)}k G`;
  }
  return formatBRL(cents);
}

/**
 * Parse a BRL string to Money (cents).
 * Handles: "R$ 1.234,56", "🪙 1.234,56", "1234,56", "1234.56"
 */
export function parseBRL(input: string): Money {
  const cleaned = input
    .replace(/🪙\s?/, '')
    .replace(/R\$\s?/, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const value = parseFloat(cleaned);
  if (isNaN(value)) throw new Error(`Cannot parse value: "${input}"`);
  return money(Math.round(value * 100));
}

/** Add two Money values */
export function addMoney(a: Money, b: Money): Money {
  return money(a + b);
}

/** Subtract b from a */
export function subtractMoney(a: Money, b: Money): Money {
  return money(a - b);
}

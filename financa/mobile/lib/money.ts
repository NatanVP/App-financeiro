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

/** Format Money (cents) to Brazilian Real string, e.g. "R$ 1.234,56" */
export function formatBRL(cents: Money, showSign = false): string {
  const reais = cents / 100;
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(reais);
  if (showSign && cents > 0) return `+${formatted}`;
  return formatted;
}

/** Format compact, e.g. 1234567 → "R$ 12.345,67" */
export function formatBRLShort(cents: Money): string {
  if (Math.abs(cents) >= 1_000_000_00) {
    return `R$ ${(cents / 1_000_000_00).toFixed(1)}M`;
  }
  if (Math.abs(cents) >= 1_000_00) {
    return `R$ ${(cents / 1_000_00).toFixed(1)}k`;
  }
  return formatBRL(cents);
}

/**
 * Parse a BRL string to Money (cents).
 * Handles: "R$ 1.234,56", "1234,56", "1234.56"
 */
export function parseBRL(input: string): Money {
  const cleaned = input
    .replace(/R\$\s?/, '')
    .replace(/\./g, '')     // remove thousands dots
    .replace(',', '.')       // decimal comma → dot
    .trim();
  const value = parseFloat(cleaned);
  if (isNaN(value)) throw new Error(`Cannot parse BRL: "${input}"`);
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

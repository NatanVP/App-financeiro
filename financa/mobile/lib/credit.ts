/**
 * Credit card invoice utilities.
 *
 * Terminology:
 *   invoiceMonthKey — 'YYYY-MM' string that identifies the invoice a purchase belongs to.
 *   closingDay      — day of month when the invoice closes (e.g. 5).
 *   dueDay          — day of month when the bill must be paid (e.g. 15).
 *
 * Assignment rule:
 *   purchase on day D with closingDay C:
 *     D <= C  →  invoice month = purchase's own month
 *     D > C   →  invoice month = purchase's month + 1
 *
 * Closing date of invoice 'YYYY-MM' = closingDay of the NEXT calendar month.
 */

/** Returns the invoice month key ('YYYY-MM') for a given purchase date. */
export function getInvoiceMonthKey(dateStr: string, closingDay: number): string {
  // Parse without timezone shift
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  if (d <= closingDay) {
    return `${y}-${String(m).padStart(2, '0')}`;
  }
  // next month
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear  = m === 12 ? y + 1 : y;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

/** Returns the Date object when a given invoice month closes. */
export function getInvoiceClosingDate(invoiceMonthKey: string, closingDay: number): Date {
  const [y, m] = invoiceMonthKey.split('-').map(Number);
  const closingMonth = m === 12 ? 1 : m + 1;
  const closingYear  = m === 12 ? y + 1 : y;
  return new Date(closingYear, closingMonth - 1, closingDay);
}

/** Returns the Date object when a given invoice is due. */
export function getInvoiceDueDate(invoiceMonthKey: string, dueDay: number): Date {
  const [y, m] = invoiceMonthKey.split('-').map(Number);
  const dueMonth = m === 12 ? 1 : m + 1;
  const dueYear  = m === 12 ? y + 1 : y;
  return new Date(dueYear, dueMonth - 1, dueDay);
}

/** Returns the invoice month key for the currently open invoice (based on today). */
export function getCurrentInvoiceMonthKey(closingDay: number): string {
  return getInvoiceMonthKey(new Date().toISOString().slice(0, 10), closingDay);
}

/**
 * Returns how many days remain until the current invoice closes.
 * Negative means it has already closed.
 */
export function getDaysUntilClosing(closingDay: number): number {
  const key     = getCurrentInvoiceMonthKey(closingDay);
  const closing = getInvoiceClosingDate(key, closingDay);
  const today   = new Date();
  today.setHours(0, 0, 0, 0);
  closing.setHours(0, 0, 0, 0);
  return Math.round((closing.getTime() - today.getTime()) / 86_400_000);
}

/** Returns true if the given invoice month has already closed. */
export function isInvoiceClosed(invoiceMonthKey: string, closingDay: number): boolean {
  const closing = getInvoiceClosingDate(invoiceMonthKey, closingDay);
  const today   = new Date();
  today.setHours(0, 0, 0, 0);
  closing.setHours(0, 0, 0, 0);
  return today >= closing;
}

/**
 * Label urgency based on days until closing:
 *  > 10  → 'normal'
 *  7–10  → 'warning'
 *  ≤ 6   → 'danger'
 */
export type InvoiceUrgency = 'normal' | 'warning' | 'danger';

export function getInvoiceUrgency(closingDay: number): InvoiceUrgency {
  const days = getDaysUntilClosing(closingDay);
  if (days <= 0)  return 'danger';   // already closed / overdue
  if (days <= 7)  return 'danger';
  if (days <= 10) return 'warning';
  return 'normal';
}

/** Pretty label for an invoice month key, e.g. '2026-04' → 'ABR/26' */
export function formatInvoiceLabel(invoiceMonthKey: string): string {
  const MONTHS = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const [y, m] = invoiceMonthKey.split('-').map(Number);
  return `${MONTHS[m - 1]}/${String(y).slice(2)}`;
}

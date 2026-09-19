const audFmt = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a value as Australian dollars with cents (e.g. $1,234.56). */
export function aud(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0.00';
  return audFmt.format(n);
}

/** Format a value with thousands separators and 2 decimals, no currency symbol (e.g. 1,234.56). */
export function grouped(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Parse a currency-formatted string (e.g. "1,234.56") back to a number. */
export function rawNumber(text: string): number {
  return Number(String(text ?? '').replace(/[^0-9.\-]/g, ''));
}

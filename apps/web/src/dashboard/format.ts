import type { Money } from './types';

// Whole currency units, en-US symbol and separators: 1234560 USD minor units -> "$12,346".
export function formatEarnings({ amountMinor, currency }: Money): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const digits = new Intl.NumberFormat('en-US', { style: 'currency', currency }).resolvedOptions()
    .maximumFractionDigits;
  return formatter.format(amountMinor / 10 ** (digits ?? 2));
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

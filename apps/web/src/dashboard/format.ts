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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ISO yyyy-mm-dd dates -> "2 – 9 June", or "30 June – 2 July" across months.
export function formatDateRange(start: string, end: string): string {
  const [, startMonth, startDay] = start.split('-').map(Number);
  const [, endMonth, endDay] = end.split('-').map(Number);
  if (startMonth === endMonth) return `${startDay} – ${endDay} ${MONTHS[endMonth - 1]}`;
  return `${startDay} ${MONTHS[startMonth - 1]} – ${endDay} ${MONTHS[endMonth - 1]}`;
}

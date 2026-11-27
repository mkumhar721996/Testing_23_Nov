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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseIso(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month: MONTHS[month - 1], day };
}

// "2028-06-03" -> "3 June 2028"
export function formatDay(iso: string): string {
  const { year, month, day } = parseIso(iso);
  return `${day} ${month} ${year}`;
}

// "2028-07-05", "2028-07-10" -> "5 – 10 July 2028"
export function formatDateRange(startIso: string, endIso: string): string {
  const start = parseIso(startIso);
  const end = parseIso(endIso);
  if (start.year !== end.year) return `${formatDay(startIso)} – ${formatDay(endIso)}`;
  if (start.month !== end.month) return `${start.day} ${start.month} – ${end.day} ${end.month} ${end.year}`;
  return `${start.day} – ${end.day} ${end.month} ${end.year}`;
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

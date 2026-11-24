import type { Money } from './types';

export function formatMoney({ amountMinor, currency }: Money): string {
  const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amountMinor / 10 ** digits);
}

export function formatMask(last4: string): string {
  return `•••• ${last4}`;
}

// Dates arrive as YYYY-MM-DD; format them as that calendar day, whatever the time zone.
// The design shows day-month-year ("14 Mar 2027"), so the locale is fixed to en-GB.
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

// Signed with a true minus (U+2212) for money out and a plus for money in, in the product's currency.
export function formatTransactionAmount(money: Money): string {
  const sign = money.amountMinor < 0 ? '−' : '+';
  return `${sign}${formatMoney({ ...money, amountMinor: Math.abs(money.amountMinor) })}`;
}

// "22 Nov": the calendar day of a YYYY-MM-DD date, whatever the time zone.
export function formatShortDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

export function formatRate(percent: number): string {
  return `${percent}%`;
}

import type { Trip } from './types';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Trip dates are calendar dates (YYYY-MM-DD) with no time zone, so they are split, never
// passed through Date parsing (which would read them as UTC and can shift the day).
const parts = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month0: month - 1, day };
};

export function monthGrid(year: number, month0: number): { lead: number; days: number; trailing: number } {
  const lead = new Date(year, month0, 1).getDay();
  const days = new Date(year, month0 + 1, 0).getDate();
  return { lead, days, trailing: Math.ceil((lead + days) / 7) * 7 - lead - days };
}

export function tripsOn(trips: Trip[], isoDate: string): Trip[] {
  return trips.filter((t) => t.start <= isoDate && isoDate <= t.end);
}

export function shiftMonth(ym: string, delta: -1 | 1): string {
  const { year, month0 } = parts(`${ym}-01`);
  const d = new Date(year, month0 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthTitle(ym: string): string {
  const { year, month0 } = parts(`${ym}-01`);
  return `${MONTH_NAMES[month0]} ${year}`;
}

export function formatDate(isoDate: string): string {
  const { year, month0, day } = parts(isoDate);
  return `${day} ${MONTH_NAMES[month0]} ${year}`;
}

export function formatTripRange(trip: Trip): string {
  const s = parts(trip.start);
  const e = parts(trip.end);
  if (s.year === e.year && s.month0 === e.month0) return `${s.day} – ${e.day} ${MONTH_NAMES[e.month0]}`;
  return `${s.day} ${MONTH_NAMES[s.month0]} – ${e.day} ${MONTH_NAMES[e.month0]}`;
}

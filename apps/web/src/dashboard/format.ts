export function formatMoney(n: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
}

export function formatSigned(n: number, currency: string): string {
  return `${n < 0 ? '−' : '+'}${formatMoney(Math.abs(n), currency)}`;
}

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function relativeDay(iso: string, now: Date): string {
  const date = new Date(iso);
  const days = Math.round((dayStart(now) - dayStart(date)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date);
}

export function greeting(hour: number, customerName: string): string {
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  return `Good ${part}, ${customerName.split(' ')[0]}`;
}

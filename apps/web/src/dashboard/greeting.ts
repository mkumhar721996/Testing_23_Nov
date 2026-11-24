export type Period = 'morning' | 'afternoon' | 'evening';

// Uses the device's local time.
export function periodFor(now: Date): Period {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

export function greetingText(now: Date, name: string | null): string {
  const greeting = `Good ${periodFor(now)}`;
  const trimmed = name?.trim();
  return trimmed ? `${greeting}, ${trimmed}` : greeting;
}

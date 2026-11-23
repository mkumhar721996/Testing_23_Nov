import { createContext, useContext } from 'react';
import type { Me, RecordStatus } from '../api/onboarding';

export const STATUS: Record<RecordStatus, { label: string; badge: string }> = {
  not_started: { label: 'Not started', badge: 'badge-info' },
  in_progress: { label: 'In progress', badge: 'badge-primary' },
  complete: { label: 'Complete', badge: 'badge-success' },
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

/** "2026-12-01" as "1 Dec 2026". */
export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export const MeContext = createContext<Me | null>(null);

export function useMe(): Me {
  const me = useContext(MeContext);
  if (!me) throw new Error('useMe needs a signed-in person');
  return me;
}

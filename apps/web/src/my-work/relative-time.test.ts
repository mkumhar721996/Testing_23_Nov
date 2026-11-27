import { describe, expect, it } from 'vitest';
import { relativeTime } from './relative-time';

const now = new Date('2026-11-27T12:00:00Z');
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60000).toISOString();

describe('relativeTime', () => {
  it('shows minutes within the hour', () => {
    expect(relativeTime(ago(5), now)).toBe('5 min ago');
  });

  it('shows hours within a day', () => {
    expect(relativeTime(ago(60), now)).toBe('1 hour ago');
    expect(relativeTime(ago(200), now)).toBe('3 hours ago');
  });

  it('shows a short date after a day', () => {
    expect(relativeTime('2026-11-24T14:12:00Z', now)).toBe('24 Nov');
  });
});

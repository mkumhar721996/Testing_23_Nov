import { describe, expect, it } from 'vitest';
import { formatUpdated } from './relativeTime';

const now = new Date('2026-11-23T12:00:00Z');

describe('formatUpdated', () => {
  it('uses relative time inside a day', () => {
    expect(formatUpdated('2026-11-23T11:59:30Z', now)).toBe('just now');
    expect(formatUpdated('2026-11-23T11:30:00Z', now)).toBe('30 minutes ago');
    expect(formatUpdated('2026-11-23T10:00:00Z', now)).toBe('2 hours ago');
    expect(formatUpdated('2026-11-23T11:00:00Z', now)).toBe('1 hour ago');
  });

  it('uses a date after a day', () => {
    expect(formatUpdated('2026-11-20T12:00:00Z', now)).toBe('20 Nov 2026');
  });
});

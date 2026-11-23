import { describe, it, expect } from 'vitest';
import { formatMoney, formatSigned, relativeDay, greeting } from './format';

describe('format', () => {
  it('formats money', () => {
    expect(formatMoney(34723.35, 'USD')).toBe('$34,723.35');
  });
  it('formats signed amounts', () => {
    expect(formatSigned(-6.4, 'USD')).toBe('−$6.40');
    expect(formatSigned(3200, 'USD')).toBe('+$3,200.00');
  });
  it('names the day', () => {
    const now = new Date('2026-11-23T12:00:00Z');
    expect(relativeDay('2026-11-23T09:00:00Z', now)).toBe('Today');
    expect(relativeDay('2026-11-22T09:00:00Z', now)).toBe('Yesterday');
    expect(relativeDay('2026-11-21T09:00:00Z', now)).toBe('21 Nov');
  });
  it('greets by first name', () => {
    expect(greeting(9, 'Alex Morgan')).toBe('Good morning, Alex');
    expect(greeting(14, 'Alex Morgan')).toBe('Good afternoon, Alex');
    expect(greeting(20, 'Alex Morgan')).toBe('Good evening, Alex');
  });
});

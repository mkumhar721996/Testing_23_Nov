import { describe, expect, it } from 'vitest';
import { formatCount, formatDateRange, formatEarnings } from './format';

describe('formatEarnings', () => {
  it('shows a currency symbol, thousands separators and no decimals', () => {
    expect(formatEarnings({ amountMinor: 1234560, currency: 'USD' })).toBe('$12,346');
    expect(formatEarnings({ amountMinor: 100, currency: 'USD' })).toBe('$1');
  });
});

describe('formatCount', () => {
  it('adds thousands separators', () => {
    expect(formatCount(2845)).toBe('2,845');
  });
});

describe('formatDateRange', () => {
  it('shares the month when both dates fall in it', () => {
    expect(formatDateRange('2026-06-02', '2026-06-09')).toBe('2 – 9 June');
  });

  it('names both months when the range crosses a month', () => {
    expect(formatDateRange('2026-06-30', '2026-07-02')).toBe('30 June – 2 July');
  });
});

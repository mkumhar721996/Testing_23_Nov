import { describe, expect, it } from 'vitest';
import { formatCount, formatDateRange, formatDay, formatEarnings, formatShortDateRange } from './format';

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

describe('formatDateRange and formatDay', () => {
  it('formats ISO dates for display', () => {
    expect(formatDateRange('2028-07-05', '2028-07-10')).toBe('5 – 10 July 2028');
    expect(formatDay('2028-06-03')).toBe('3 June 2028');
  });

  it('names both months when the range crosses a month', () => {
    expect(formatDateRange('2028-06-28', '2028-07-03')).toBe('28 June – 3 July 2028');
  });
});

describe('formatShortDateRange', () => {
  it('shares the month when both dates fall in it', () => {
    expect(formatShortDateRange('2026-06-02', '2026-06-09')).toBe('2 – 9 June');
  });

  it('names both months when the range crosses a month', () => {
    expect(formatShortDateRange('2026-06-30', '2026-07-02')).toBe('30 June – 2 July');
  });
});

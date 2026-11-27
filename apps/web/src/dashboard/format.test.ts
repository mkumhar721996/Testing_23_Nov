import { describe, expect, it } from 'vitest';
import { formatCount, formatEarnings } from './format';

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

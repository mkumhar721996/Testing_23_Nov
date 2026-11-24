import { describe, expect, it } from 'vitest';
import { formatDate, formatMask, formatMoney, formatRate } from './format';

describe('format', () => {
  it('masks to the last 4 digits', () => {
    expect(formatMask('2291')).toBe('•••• 2291');
  });
  it('formats money in its own currency', () => {
    expect(formatMoney({ amountMinor: 421580, currency: 'GBP' })).toContain('£4,215.80');
    expect(formatMoney({ amountMinor: 421580, currency: 'USD' })).toContain('$4,215.80');
  });
  it('does not divide zero-decimal currencies', () => {
    expect(formatMoney({ amountMinor: 5000, currency: 'JPY' })).toContain('5,000');
  });
  it('formats a date and a rate', () => {
    expect(formatDate('2027-03-14')).toMatch(/14/);
    expect(formatDate('2027-03-14')).toMatch(/2027/);
    expect(formatRate(4.6)).toBe('4.6%');
  });
});

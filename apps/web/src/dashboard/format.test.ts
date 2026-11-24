import { describe, expect, it } from 'vitest';
import { formatDate, formatMask, formatMoney, formatRate, formatShortDate, formatTransactionAmount } from './format';

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

describe('transaction formatting', () => {
  it('signs amounts by direction in their own currency', () => {
    expect(formatTransactionAmount({ amountMinor: -6219, currency: 'GBP' })).toBe('−£62.19');
    expect(formatTransactionAmount({ amountMinor: 314000, currency: 'GBP' })).toBe('+£3,140.00');
    expect(formatTransactionAmount({ amountMinor: -1200, currency: 'USD' })).toBe('−$12.00');
  });
  it('formats a short day and month', () => {
    expect(formatShortDate('2026-11-22')).toBe('22 Nov');
  });
});

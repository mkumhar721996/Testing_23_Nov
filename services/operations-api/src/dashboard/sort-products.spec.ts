import { describe, expect, it } from 'vitest';
import type { Product } from './dashboard.types';
import { sortProducts } from './sort-products';

const m = { amountMinor: 100, currency: 'GBP' };
const base = { name: 'n', last4: '1234', currency: 'GBP' };
const account = (id: string): Product => ({ ...base, id, type: 'account', currentBalance: m });
const card: Product = { ...base, id: 'c', type: 'credit_card', amountOwed: m, availableCredit: m };
const loan: Product = { ...base, id: 'l', type: 'loan', outstandingBalance: m };
const fd: Product = {
  ...base,
  id: 'f',
  type: 'fixed_deposit',
  depositedAmount: m,
  maturityDate: '2027-03-14',
  interestRatePercent: 4.6,
};

describe('sortProducts', () => {
  it('orders accounts, credit cards, loans, fixed deposits', () => {
    expect(sortProducts([fd, loan, card, account('a')]).map((p) => p.type)).toEqual([
      'account',
      'credit_card',
      'loan',
      'fixed_deposit',
    ]);
  });

  it('is stable within a type and does not mutate the input', () => {
    const input = [account('a2'), card, account('a1')];
    expect(sortProducts(input).map((p) => p.id)).toEqual(['a2', 'a1', 'c']);
    expect(input.map((p) => p.id)).toEqual(['a2', 'c', 'a1']);
  });
});

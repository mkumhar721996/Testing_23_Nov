import { describe, expect, it } from 'vitest';
import type { Product, Transaction } from './dashboard.types';
import { selectRecentTransactions } from './recent-transactions';

const m = { amountMinor: 100, currency: 'GBP' };
const base = { name: 'n', last4: '1234', currency: 'GBP' };
const account: Product = { ...base, id: 'a', type: 'account', currentBalance: m };
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
const products = [account, card, loan, fd];

const txn = (id: string, productId: string, date = '2026-11-01'): Transaction => ({
  id,
  productId,
  description: id,
  category: 'Other',
  date,
  amount: m,
});

const day = (n: number) => `2026-11-${String(n).padStart(2, '0')}`;
const twelve = Array.from({ length: 12 }, (_, i) => txn(`t${i}`, i % 2 ? 'a' : 'c', day(i + 1)));

describe('selectRecentTransactions', () => {
  it('includes transactions from accounts and credit cards', () => {
    const out = selectRecentTransactions(products, [txn('t1', 'a'), txn('t2', 'c')]);
    expect(new Set(out.map((t) => t.productId))).toEqual(new Set(['a', 'c']));
  });

  it('keeps exactly eight', () => {
    expect(selectRecentTransactions(products, twelve)).toHaveLength(8);
  });

  it('keeps the newest eight, newest first', () => {
    const shuffled = [...twelve].reverse().sort((x, y) => (x.id < y.id ? 1 : -1));
    const dates = selectRecentTransactions(products, shuffled).map((t) => t.date);
    expect(dates).toEqual([12, 11, 10, 9, 8, 7, 6, 5].map(day));
  });

  it('breaks same-date ties by id descending', () => {
    const out = selectRecentTransactions(products, [txn('a1', 'a'), txn('a3', 'c'), txn('a2', 'a')]);
    expect(out.map((t) => t.id)).toEqual(['a3', 'a2', 'a1']);
  });

  it('drops loan and fixed deposit transactions', () => {
    const out = selectRecentTransactions(products, [txn('x', 'l'), txn('y', 'f'), txn('z', 'a')]);
    expect(out.map((t) => t.id)).toEqual(['z']);
  });

  it('drops transactions of products the customer does not hold', () => {
    expect(selectRecentTransactions(products, [txn('x', 'foreign')])).toEqual([]);
  });

  it('returns only existing transactions when fewer than eight', () => {
    expect(selectRecentTransactions(products, [txn('t1', 'a'), txn('t2', 'c')])).toHaveLength(2);
  });
});

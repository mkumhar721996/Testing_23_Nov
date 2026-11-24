import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RecentTransactions from './RecentTransactions';
import type { Product, Transaction } from './types';

const money = (amountMinor: number, currency: string) => ({ amountMinor, currency });
const usdAccount: Product = { id: 'a1', type: 'account', name: 'Checking account', last4: '2291', currency: 'USD', currentBalance: money(1, 'USD') };
const gbpCard: Product = { id: 'c1', type: 'credit_card', name: 'Credit card', last4: '0952', currency: 'GBP', amountOwed: money(1, 'GBP'), availableCredit: money(1, 'GBP') };
const products = [usdAccount, gbpCard];

const txn = (id: string, description: string, productId: string, amount: Transaction['amount']): Transaction => ({
  id, productId, description, category: 'Groceries', date: '2026-11-22', amount,
});
const list = () => screen.getByRole('list', { name: 'Recent transactions, newest first' });

describe('RecentTransactions', () => {
  it('shows a View all link and calls onViewAll without navigating', () => {
    const onViewAll = vi.fn();
    render(<RecentTransactions transactions={[]} products={products} onViewAll={onViewAll} />);
    fireEvent.click(screen.getByRole('link', { name: 'View all' }));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it('shows description, date and amount on each row', () => {
    const t = txn('t1', 'Tesco Stores', 'a1', money(-6219, 'USD'));
    render(<RecentTransactions transactions={[t]} products={products} onViewAll={() => undefined} />);
    const row = screen.getByText('Tesco Stores').closest('[role="listitem"]') as HTMLElement;
    expect(within(row).getByText(/22 Nov/)).toBeInTheDocument();
    expect(within(row).getByText(/Checking account •••• 2291/)).toBeInTheDocument();
    expect(within(row).getByText('−$62.19')).toBeInTheDocument();
  });

  it("shows each amount in its own product's currency, credits marked", () => {
    const ts = [txn('t1', 'TfL', 'c1', money(-780, 'GBP')), txn('t2', 'Cafe', 'a1', money(-1200, 'USD')), txn('t3', 'Salary', 'a1', money(314000, 'USD'))];
    render(<RecentTransactions transactions={ts} products={products} onViewAll={() => undefined} />);
    expect(within(list()).getByText('−£7.80')).toBeInTheDocument();
    expect(within(list()).getByText('−$12.00')).toBeInTheDocument();
    expect(within(list()).getByText('+$3,140.00')).toHaveClass('in');
  });

  it('lists only the given transactions, in the given order, with no placeholder rows', () => {
    const ts = ['x', 'y', 'z'].map((d) => txn(d, `Shop ${d}`, 'a1', money(-100, 'USD')));
    render(<RecentTransactions transactions={ts} products={products} onViewAll={() => undefined} />);
    const rows = within(list()).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Shop x'),
      expect.stringContaining('Shop y'),
      expect.stringContaining('Shop z'),
    ]);
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './DashboardPage';
import { fetchDashboard } from './dashboard-api';
import type { DashboardResponse, Product, Transaction } from './types';

vi.mock('./dashboard-api', () => ({ fetchDashboard: vi.fn() }));

const gbp = (amountMinor: number) => ({ amountMinor, currency: 'GBP' });
const usd = (amountMinor: number) => ({ amountMinor, currency: 'USD' });
const base = { currency: 'GBP' };

const account: Product = { ...base, id: 'a1', type: 'account', name: 'Checking account', last4: '2291', currentBalance: gbp(421580) };
const card = (id: string, name: string): Product => ({ ...base, id, type: 'credit_card', name, last4: '0952', amountOwed: gbp(38642), availableCredit: gbp(461358) });
const loan: Product = { ...base, id: 'l1', type: 'loan', name: 'Personal loan', last4: '4406', outstandingBalance: gbp(685000) };
const fd: Product = { ...base, id: 'f1', type: 'fixed_deposit', name: 'Term deposit', last4: '7710', depositedAmount: gbp(500000), maturityDate: '2027-03-14', interestRatePercent: 4.6 };

function respond(response: Omit<DashboardResponse, 'recentTransactions'> & Partial<DashboardResponse>) {
  vi.mocked(fetchDashboard).mockResolvedValue({ recentTransactions: [], ...response });
}

const txn = (id: string, description: string, productId = 'a1'): Transaction => ({
  id, productId, description, category: 'Groceries', date: '2026-11-22', amount: gbp(-6219),
});

describe('DashboardPage', () => {
  afterEach(() => vi.clearAllMocks());

  it('shows a top bar above the greeting with the customer name', async () => {
    respond({ customer: { name: 'Maya' }, products: [account] });
    render(<DashboardPage />);
    const header = await screen.findByRole('banner');
    expect(within(header).getAllByRole('button')).toHaveLength(1);
    expect(within(header).getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    const h1 = await screen.findByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/^Good (morning|afternoon|evening), Maya$/);
    expect(header.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('lists the transactions the service returns, between credit cards and loans', async () => {
    respond({ customer: { name: 'Maya' }, products: [account, card('c1', 'Credit card'), loan], recentTransactions: [txn('t1', 'Tesco Stores')] });
    render(<DashboardPage />);
    const list = await screen.findByRole('list', { name: 'Recent transactions, newest first' });
    expect(within(list).getByText('Tesco Stores')).toBeInTheDocument();
    const cards = screen.getByRole('region', { name: 'Credit cards' });
    const loans = screen.getByRole('region', { name: 'Loans' });
    expect(cards.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(list.compareDocumentPosition(loans) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the coming-soon message when View all is selected', async () => {
    respond({ customer: { name: 'Maya' }, products: [account], recentTransactions: [txn('t1', 'Tesco Stores')] });
    render(<DashboardPage />);
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(await screen.findByRole('link', { name: 'View all' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Transaction history is coming soon.');
  });

  it('omits the name when the profile has none', async () => {
    respond({ customer: { name: null }, products: [] });
    render(<DashboardPage />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/^Good (morning|afternoon|evening)$/);
  });

  it('shows one card per credit card and no fixed deposit section when none held', async () => {
    respond({ customer: { name: 'Maya' }, products: [card('c1', 'Rewards credit card'), card('c2', 'Travel credit card')] });
    render(<DashboardPage />);
    expect(await screen.findAllByRole('article', { name: /credit card/i })).toHaveLength(2);
    expect(screen.queryByText(/fixed deposit/i)).toBeNull();
  });

  it('masks the product number to its last 4 digits', async () => {
    respond({ customer: { name: 'Maya' }, products: [account] });
    render(<DashboardPage />);
    const cardEl = (await screen.findByText('Checking account')).closest('article')!;
    expect(within(cardEl).getByText('•••• 2291')).toBeInTheDocument();
    expect(cardEl.textContent).not.toMatch(/\d{5,}/);
  });

  it('shows each product type with its own figures', async () => {
    respond({ customer: { name: 'Maya' }, products: [account, card('c1', 'Credit card'), loan, fd] });
    render(<DashboardPage />);
    const accountCard = (await screen.findByText('Checking account')).closest('article')!;
    expect(within(accountCard).getByText('£4,215.80')).toBeInTheDocument();
    const creditCard = screen.getByText('Credit card').closest('article')!;
    expect(within(creditCard).getByText('£386.42')).toBeInTheDocument();
    expect(within(creditCard).getByText(/£4,613\.58 available credit/)).toBeInTheDocument();
    const loanCard = screen.getByText('Personal loan').closest('article')!;
    expect(within(loanCard).getByText('£6,850.00')).toBeInTheDocument();
    const fdCard = screen.getByText('Term deposit').closest('article')!;
    expect(within(fdCard).getByText('£5,000.00')).toBeInTheDocument();
    expect(within(fdCard).getByText(/matures 14 Mar 2027/)).toBeInTheDocument();
    expect(within(fdCard).getByText(/4\.6% a year/)).toBeInTheDocument();
  });

  it('formats each card in its own currency', async () => {
    const usdAccount: Product = { ...account, id: 'a2', name: 'Dollar account', currency: 'USD', currentBalance: usd(100000) };
    respond({ customer: { name: 'Maya' }, products: [account, usdAccount] });
    render(<DashboardPage />);
    const gbpCard = (await screen.findByText('Checking account')).closest('article')!;
    const usdCard = screen.getByText('Dollar account').closest('article')!;
    expect(within(gbpCard).getByText('£4,215.80')).toBeInTheDocument();
    expect(within(usdCard).getByText('$1,000.00')).toBeInTheDocument();
  });

  it('orders sections accounts, credit cards, loans, fixed deposits', async () => {
    respond({ customer: { name: 'Maya' }, products: [fd, loan, card('c1', 'Credit card'), account] });
    render(<DashboardPage />);
    const headings = (await screen.findAllByRole('heading', { level: 2 })).map((h) => h.textContent);
    expect(headings).toEqual(['Accounts', 'Credit cards', 'Recent transactions', 'Loans', 'Fixed deposits']);
  });
});

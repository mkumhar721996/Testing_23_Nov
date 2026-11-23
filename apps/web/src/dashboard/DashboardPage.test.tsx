import { render, screen, within, fireEvent } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';
import { makeDashboard } from './fixtures';
import type { DashboardData } from './types';

afterEach(() => vi.unstubAllGlobals());

const okResponse = (d: DashboardData) => ({ ok: true, status: 200, json: async () => d });
const mockFetchOk = (d: DashboardData) => {
  const m = vi.fn().mockResolvedValue(okResponse(d));
  vi.stubGlobal('fetch', m);
  return m;
};
const renderLoaded = async (d = makeDashboard()) => {
  mockFetchOk(d);
  const onTransfer = vi.fn();
  const onPayBill = vi.fn();
  render(<DashboardPage onTransfer={onTransfer} onPayBill={onPayBill} />);
  await screen.findByRole('heading', { name: 'Your accounts' });
  return { onTransfer, onPayBill };
};

describe('DashboardPage loaded', () => {
  it('shows the balance summary with money in and out (AC 1, 18, 19)', async () => {
    await renderLoaded();
    const summary = within(screen.getByLabelText('Balance summary'));
    expect(summary.getByText('$34,723.35')).toBeInTheDocument();
    const inCard = screen.getByText('Money in, this month').closest('.stat') as HTMLElement;
    expect(within(inCard).getByText('$5,120.00')).toBeInTheDocument();
    const outCard = screen.getByText('Money out, this month').closest('.stat') as HTMLElement;
    expect(within(outCard).getByText('$3,482.17')).toBeInTheDocument();
  });

  it('lists every account (AC 2)', async () => {
    const d = makeDashboard();
    await renderLoaded(d);
    const list = within(screen.getByRole('region', { name: 'Your accounts' }));
    expect(list.getAllByRole('listitem')).toHaveLength(d.accounts.length);
    expect(list.getByText(/Everyday Current/)).toBeInTheDocument();
    expect(list.getByText('−$500.00 owed')).toBeInTheDocument();
  });

  it('lists recent transactions (AC 3)', async () => {
    await renderLoaded();
    const region = within(screen.getByRole('region', { name: 'Recent transactions' }));
    expect(region.getAllByRole('listitem')).toHaveLength(3);
    expect(region.getByText('−$6.40')).toBeInTheDocument();
    expect(region.getByText('+$3,200.00')).toBeInTheDocument();
  });

  it('shows savings, cards and loans sections (AC 4, 5, 6)', async () => {
    await renderLoaded();
    expect(
      within(screen.getByRole('region', { name: 'Savings' })).getByText(/Savings Plus/),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Cards' })).getByText(/Debit card/),
    ).toBeInTheDocument();
    const loans = within(screen.getByRole('region', { name: 'Loans' }));
    expect(loans.getByText(/Home loan/)).toBeInTheDocument();
    expect(loans.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '24');
  });

  it('shows spending by category for the month (AC 7, 20)', async () => {
    await renderLoaded();
    const spend = screen.getByRole('region', { name: 'Spending by category, this month' });
    expect(within(spend).getByText('Housing')).toBeInTheDocument();
    expect(within(spend).getByText('$1,450.00')).toBeInTheDocument();
    expect(within(spend).getByRole('img')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Housing'),
    );
  });

  it('still shows spending with no categories (AC 7)', async () => {
    await renderLoaded(makeDashboard({ spendingByCategory: [] }));
    expect(
      screen.getByRole('heading', { name: 'Spending by category, this month' }),
    ).toBeInTheDocument();
  });

  it('hides the empty state and Open an account with accounts (AC 10, 25)', async () => {
    await renderLoaded();
    expect(screen.queryByText('No accounts yet')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open an account/ })).not.toBeInTheDocument();
  });

  it('enables Transfer money and Pay a bill and opens flows (AC 12-15)', async () => {
    const { onTransfer, onPayBill } = await renderLoaded();
    const transfer = screen.getByRole('button', { name: 'Transfer money' });
    const pay = screen.getByRole('button', { name: 'Pay a bill' });
    expect(transfer).toBeEnabled();
    expect(pay).toBeEnabled();
    expect(transfer).not.toHaveAttribute('aria-disabled', 'true');
    expect(pay).not.toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(transfer);
    expect(onTransfer).toHaveBeenCalledOnce();
    expect(onPayBill).not.toHaveBeenCalled();
    fireEvent.click(pay);
    expect(onPayBill).toHaveBeenCalledOnce();
  });

  it('shows deferred controls as disabled with a coming soon label (AC 16)', async () => {
    const { onTransfer, onPayBill } = await renderLoaded();
    const deferred: [string, string][] = [
      ['link', 'View all accounts'],
      ['link', 'See all'],
      ['button', 'Freeze card'],
      ['button', 'Set limits'],
      ['button', 'View repayment schedule'],
      ['button', 'Prepay loan'],
    ];
    for (const [role, name] of deferred) {
      const el = screen.getByRole(role, { name: new RegExp(name) });
      expect(el).toHaveAttribute('aria-disabled', 'true');
      expect(el).toHaveTextContent('Coming soon');
      fireEvent.click(el);
    }
    fireEvent.click(screen.getByRole('button', { name: /Alex Morgan/ }));
    const profile = screen.getByRole('menuitem', { name: /Profile/ });
    expect(profile).toHaveAttribute('aria-disabled', 'true');
    expect(profile).toHaveTextContent('Coming soon');
    expect(onTransfer).not.toHaveBeenCalled();
    expect(onPayBill).not.toHaveBeenCalled();
  });

  it('shows the per-kind deferred actions (AC 16)', async () => {
    await renderLoaded(
      makeDashboard({
        savings: [
          { id: 'f', kind: 'fixed-deposit', title: 'Fixed deposit', details: [] },
          { id: 'n', kind: 'nps', title: 'NPS Tier I', details: [] },
        ],
        cards: [{ id: 'cc', kind: 'credit-card', title: 'Platinum Credit', details: [] }],
      }),
    );
    for (const name of ['Manage deposit', 'Contribute', 'Pay card bill']) {
      const el = screen.getByRole('button', { name: new RegExp(name) });
      expect(el).toHaveAttribute('aria-disabled', 'true');
      expect(el).toHaveTextContent('Coming soon');
    }
  });

  it('shows the navigation and user menu (AC 17, 26, 27, 28)', async () => {
    await renderLoaded();
    const nav = within(screen.getByRole('navigation', { name: 'Main' }));
    expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    for (const n of ['Accounts', 'Transactions', 'Payments', 'Settings']) {
      const b = nav.getByRole('button', { name: new RegExp(n) });
      expect(b).toHaveAttribute('aria-disabled', 'true');
      expect(b).toHaveTextContent('Coming soon');
    }
    expect(screen.getByRole('button', { name: /Alex Morgan/ })).toBeInTheDocument();
  });

  it('opens and closes the user menu with Escape', async () => {
    await renderLoaded();
    const trigger = screen.getByRole('button', { name: /Alex Morgan/ });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('has no spending period control (AC 21)', async () => {
    await renderLoaded();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByText(/period|last 30|this year/i)).not.toBeInTheDocument();
  });

  it.each([
    ['savings', 'Savings'],
    ['cards', 'Cards'],
    ['loans', 'Loans'],
  ] as const)('hides the %s section when none held (AC 29)', async (key, label) => {
    await renderLoaded(makeDashboard({ [key]: [] }));
    expect(screen.queryByRole('region', { name: label })).not.toBeInTheDocument();
    for (const other of ['Savings', 'Cards', 'Loans'].filter((l) => l !== label)) {
      expect(screen.getByRole('region', { name: other })).toBeInTheDocument();
    }
  });

  it('hides all product sections when none held (AC 29)', async () => {
    await renderLoaded(makeDashboard({ savings: [], cards: [], loans: [] }));
    for (const l of ['Savings', 'Cards', 'Loans']) {
      expect(screen.queryByRole('region', { name: l })).not.toBeInTheDocument();
    }
    expect(
      screen.getByRole('heading', { name: 'Spending by category, this month' }),
    ).toBeInTheDocument();
  });
});

describe('DashboardPage states', () => {
  it('shows placeholders while loading (AC 8)', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const { container } = render(<DashboardPage />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByText('$34,723.35')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your accounts' })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Account' })).toBeInTheDocument();
  });

  it('shows the empty state with a disabled Open an account (AC 9, 24)', async () => {
    const { onTransfer, onPayBill } = (() => {
      mockFetchOk(makeDashboard({ accounts: [] }));
      return { onTransfer: vi.fn(), onPayBill: vi.fn() };
    })();
    render(<DashboardPage onTransfer={onTransfer} onPayBill={onPayBill} />);
    expect(await screen.findByText('No accounts yet')).toBeInTheDocument();
    const open = screen.getByRole('button', { name: /Open an account/ });
    expect(open).toHaveAttribute('aria-disabled', 'true');
    expect(within(open).getByText('Coming soon')).toBeInTheDocument();
    fireEvent.click(open);
    expect(onTransfer).not.toHaveBeenCalled();
    expect(onPayBill).not.toHaveBeenCalled();
  });

  it('shows the error state on failure (AC 11)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    render(<DashboardPage />);
    expect(
      await screen.findByRole('heading', { name: 'Dashboard unavailable' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });

  it('shows the error state on a non-2xx response (AC 11)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(<DashboardPage />);
    expect(
      await screen.findByRole('heading', { name: 'Dashboard unavailable' }),
    ).toBeInTheDocument();
  });

  it('returns to placeholders on Try again (AC 22)', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    render(<DashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.queryByRole('heading', { name: 'Dashboard unavailable' }),
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows the dashboard when the reload succeeds (AC 22)', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue(okResponse(makeDashboard()));
    vi.stubGlobal('fetch', fetchMock);
    render(<DashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Your accounts' })).toBeInTheDocument();
    expect(screen.getByText('$34,723.35')).toBeInTheDocument();
    expect(screen.getByText('Harbour Coffee Co.')).toBeInTheDocument();
  });

  it('shows the error again when the reload fails (AC 23)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    render(<DashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { name: 'Dashboard unavailable' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/We still could not load/)).toBeInTheDocument();
  });
});

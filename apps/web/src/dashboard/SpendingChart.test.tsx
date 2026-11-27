import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SpendingChart from './SpendingChart';
import { fetchMonthlySpending } from './spending-api';
import type { MonthlySpendingResponse } from './spending-types';

vi.mock('./spending-api', () => ({ fetchMonthlySpending: vi.fn() }));
const fetchMock = vi.mocked(fetchMonthlySpending);

const response = (overrides: Partial<MonthlySpendingResponse> = {}): MonthlySpendingResponse => ({
  month: '2026-11',
  currency: 'GBP',
  totalMinor: 35100,
  categories: [
    { category: 'Groceries', totalMinor: 24000 },
    { category: 'Dining', totalMinor: 9600 },
    { category: null, totalMinor: 1100 },
  ],
  ...overrides,
});

beforeEach(() => {
  fetchMock.mockReset();
});

describe('SpendingChart', () => {
  it('draws one bar per category and lists the same figures as text', async () => {
    fetchMock.mockResolvedValue(response());
    render(<SpendingChart />);
    expect(await screen.findAllByTestId('spending-bar')).toHaveLength(3);
    expect(
      screen.getByRole('img', { name: /spending by category, november 2026/i }),
    ).toBeInTheDocument();
    const table = screen.getByRole('table', { name: /same figures as text/i });
    expect(within(table).getByRole('row', { name: /Groceries.*£240\.00/ })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /Dining.*£96\.00/ })).toBeInTheDocument();
  });

  it('labels spending with no category Uncategorised in the bars and the table', async () => {
    fetchMock.mockResolvedValue(response());
    render(<SpendingChart />);
    const table = await screen.findByRole('table', { name: /same figures as text/i });
    expect(within(table).getByRole('row', { name: /Uncategorised.*£11\.00/ })).toBeInTheDocument();
    expect(screen.getAllByText('Uncategorised').length).toBeGreaterThanOrEqual(2);
  });

  it('shows No spending this month in place of the chart', async () => {
    fetchMock.mockResolvedValue(response({ categories: [], totalMinor: 0 }));
    render(<SpendingChart />);
    expect(await screen.findByText('No spending this month')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /spending by category/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('is busy while loading', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<SpendingChart />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('shows an error and refetches on Try again', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'));
    render(<SpendingChart />);
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load your spending");
    fetchMock.mockResolvedValueOnce(response());
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findAllByTestId('spending-bar')).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('asks for the time zone of the browser', async () => {
    fetchMock.mockResolvedValue(response());
    render(<SpendingChart />);
    await screen.findAllByTestId('spending-bar');
    expect(fetchMock).toHaveBeenCalledWith(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      expect.any(AbortSignal),
    );
  });
});

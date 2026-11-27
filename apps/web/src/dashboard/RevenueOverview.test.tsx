import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchRevenue } from './dashboard-api';
import { revenueByPeriod } from './fixtures';
import RevenueOverview from './RevenueOverview';
import type { Period } from './types';

vi.mock('./dashboard-api', () => ({ fetchRevenue: vi.fn() }));

const periods: Period[] = ['weekly', 'monthly', 'yearly'];
const label = (p: Period) => p[0].toUpperCase() + p.slice(1);
const pointCount = () =>
  screen.getByRole('img', { name: /line chart/i }).querySelectorAll('circle.point').length;

async function choose(p: Period) {
  fireEvent.click(screen.getByRole('button', { name: 'Revenue period' }));
  fireEvent.click(screen.getByRole('menuitemradio', { name: label(p) }));
}

describe('RevenueOverview', () => {
  afterEach(() => vi.resetAllMocks());

  it('draws the revenue as a line chart', async () => {
    vi.mocked(fetchRevenue).mockImplementation(async (p) => revenueByPeriod[p]);
    render(<RevenueOverview />);
    expect(await screen.findByRole('heading', { level: 2, name: 'Revenue overview' })).toBeInTheDocument();
    const chart = await screen.findByRole('img', { name: /line chart/i });
    expect(chart.querySelector('polyline.series')).not.toBeNull();
    expect(chart.querySelectorAll('circle.point')).toHaveLength(7);
    expect(chart).toHaveAccessibleName(/Peak of \$635 on Wednesday/);
  });

  it('offers Weekly, Monthly and Yearly with Weekly checked', async () => {
    vi.mocked(fetchRevenue).mockImplementation(async (p) => revenueByPeriod[p]);
    render(<RevenueOverview />);
    fireEvent.click(await screen.findByRole('button', { name: 'Revenue period' }));
    expect(screen.getAllByRole('menuitemradio').map((i) => i.textContent)).toEqual([
      'Weekly',
      'Monthly',
      'Yearly',
    ]);
    expect(screen.getByRole('menuitemradio', { name: 'Weekly' })).toHaveAttribute('aria-checked', 'true');
  });

  const pairs = periods.flatMap((from) => periods.filter((to) => to !== from).map((to) => [from, to] as const));
  it.each(pairs)('changes the chart data from %s to %s', async (from, to) => {
    vi.mocked(fetchRevenue).mockImplementation(async (p) => revenueByPeriod[p]);
    render(<RevenueOverview />);
    await screen.findByRole('img', { name: /line chart/i });
    if (from !== 'weekly') {
      await choose(from);
      await waitFor(() => expect(pointCount()).toBe(revenueByPeriod[from].points.length));
    }
    await choose(to);
    expect(fetchRevenue).toHaveBeenLastCalledWith(to, expect.anything());
    await waitFor(() => expect(pointCount()).toBe(revenueByPeriod[to].points.length));
    expect(screen.getByRole('button', { name: 'Revenue period' })).toHaveTextContent(label(to));
  });

  it('shows a busy skeleton while the new period loads', async () => {
    vi.mocked(fetchRevenue).mockResolvedValueOnce(revenueByPeriod.weekly);
    render(<RevenueOverview />);
    await screen.findByRole('img', { name: /line chart/i });
    vi.mocked(fetchRevenue).mockImplementation(() => new Promise(() => {}));
    await choose('monthly');
    expect(document.querySelector('[aria-busy="true"] .chart-skel')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Revenue period' })).toBeEnabled();
  });

  it('shows an alert with a working Try again when the fetch fails', async () => {
    vi.mocked(fetchRevenue).mockRejectedValueOnce(new Error('x'));
    vi.mocked(fetchRevenue).mockImplementation(async (p) => revenueByPeriod[p]);
    render(<RevenueOverview />);
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load revenue.");
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('img', { name: /line chart/i })).toBeInTheDocument();
  });

  it('shows the empty state when there is no revenue', async () => {
    vi.mocked(fetchRevenue).mockResolvedValue({
      ...revenueByPeriod.weekly,
      points: revenueByPeriod.weekly.points.map((p) => ({ ...p, amountMinor: 0 })),
    });
    render(<RevenueOverview />);
    expect(await screen.findByText('No revenue in this period')).toBeInTheDocument();
  });
});

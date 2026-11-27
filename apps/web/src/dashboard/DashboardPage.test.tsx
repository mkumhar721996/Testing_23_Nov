import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './DashboardPage';
import { fetchDashboardStats, fetchRevenue, fetchTopDestinations } from './dashboard-api';
import { destinationsByPeriod, revenueByPeriod } from './fixtures';

vi.mock('./dashboard-api', () => ({
  fetchDashboardStats: vi.fn(),
  fetchRevenue: vi.fn(),
  fetchTopDestinations: vi.fn(),
}));

const stats = { bookings: 1200, customers: 2845, earnings: { amountMinor: 1234560, currency: 'USD' } };

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(fetchRevenue).mockImplementation(async (p) => revenueByPeriod[p]);
    vi.mocked(fetchTopDestinations).mockImplementation(async (p) => destinationsByPeriod[p]);
  });
  afterEach(() => vi.resetAllMocks());

  function choose(button: string, period: string) {
    fireEvent.click(screen.getByRole('button', { name: button }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: period }));
  }

  it('changing the revenue period leaves the tiles and the donut alone', async () => {
    vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
    render(<DashboardPage />);
    await screen.findByText('Total bookings');
    const tilesBefore = screen.getByText('Total bookings').closest('.grid')!.innerHTML;
    const donutBefore = (await screen.findByRole('img', { name: /donut chart/i })).outerHTML;
    await choose('Revenue period', 'Yearly');
    await screen.findByRole('img', { name: /revenue by year/i });
    expect(screen.getByText('Total bookings').closest('.grid')!.innerHTML).toBe(tilesBefore);
    expect(screen.getByRole('img', { name: /donut chart/i }).outerHTML).toBe(donutBefore);
    expect(fetchDashboardStats).toHaveBeenCalledTimes(1);
    expect(fetchTopDestinations).toHaveBeenCalledTimes(1);
  });

  it('changing the destinations period leaves the tiles and the revenue chart alone', async () => {
    vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
    render(<DashboardPage />);
    await screen.findByText('Total bookings');
    const tilesBefore = screen.getByText('Total bookings').closest('.grid')!.innerHTML;
    const revenueBefore = (await screen.findByRole('img', { name: /line chart/i })).outerHTML;
    await choose('Destinations period', 'Yearly');
    await screen.findByText('Tokyo, Japan (38%)');
    expect(screen.getByText('Total bookings').closest('.grid')!.innerHTML).toBe(tilesBefore);
    expect(screen.getByRole('img', { name: /line chart/i }).outerHTML).toBe(revenueBefore);
    expect(fetchDashboardStats).toHaveBeenCalledTimes(1);
    expect(fetchRevenue).toHaveBeenCalledTimes(1);
  });

  it('keeps the other widgets when the revenue fetch fails', async () => {
    vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
    vi.mocked(fetchRevenue).mockRejectedValue(new Error('x'));
    render(<DashboardPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load revenue.");
    expect(await screen.findByText('Total bookings')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: /donut chart/i })).toBeInTheDocument();
  });

  it('shows the travel dashboard with no banking content', async () => {
    vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
    render(<DashboardPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    await screen.findByText('Total bookings');
    expect(
      screen.queryByText(/account|credit card|loan|fixed deposit|transaction|good (morning|afternoon|evening)/i),
    ).toBeNull();
  });

  it('puts the three stat tiles first in the page body', async () => {
    vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
    render(<DashboardPage />);
    const tiles = (await screen.findByText('Total bookings')).closest('.grid') as HTMLElement;
    expect(within(tiles).getAllByText(/^Total /)).toHaveLength(3);
    expect(screen.getByRole('main').querySelector('.page-body')!.firstElementChild).toBe(tiles);
  });

  it('keeps the page when the stats fetch fails', async () => {
    vi.mocked(fetchDashboardStats).mockRejectedValue(new Error('x'));
    render(<DashboardPage />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});

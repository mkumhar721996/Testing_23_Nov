import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './DashboardPage';
import { fetchDashboardStats } from './dashboard-api';
import { fetchMonthTrips } from './trips-api';

vi.mock('./dashboard-api', () => ({ fetchDashboardStats: vi.fn() }));
vi.mock('./trips-api', () => ({ fetchMonthTrips: vi.fn() }));

const stats = { bookings: 1200, customers: 2845, earnings: { amountMinor: 1234560, currency: 'USD' } };

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(fetchMonthTrips).mockImplementation(async (month) => ({ month, trips: [] }));
  });
  afterEach(() => vi.resetAllMocks());

  it('keeps the stat tiles when the trips fetch fails', async () => {
    vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
    vi.mocked(fetchMonthTrips).mockRejectedValue(new Error('x'));
    render(<DashboardPage />);
    expect(await screen.findByText('Total bookings')).toBeInTheDocument();
    expect(await screen.findByText("We couldn't load your trips.")).toBeInTheDocument();
  });

  it('keeps the calendar when the stats fetch fails', async () => {
    vi.mocked(fetchDashboardStats).mockRejectedValue(new Error('x'));
    render(<DashboardPage />);
    expect(await screen.findByText("We couldn't load your totals.")).toBeInTheDocument();
    expect(await screen.findByText('No trips this month')).toBeInTheDocument();
  });

  it('shows the calendar as busy while trips load', () => {
    vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
    vi.mocked(fetchMonthTrips).mockReturnValue(new Promise(() => {}));
    const { container } = render(<DashboardPage />);
    expect(container.querySelector('.dash [aria-busy="true"]')).not.toBeNull();
  });

  it('retries the trips request from Try again', async () => {
    vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
    vi.mocked(fetchMonthTrips).mockRejectedValue(new Error('x'));
    render(<DashboardPage />);
    await screen.findByText("We couldn't load your trips.");
    fireEvent.click(screen.getAllByRole('button', { name: 'Try again' })[0]);
    await waitFor(() => expect(fetchMonthTrips).toHaveBeenCalledTimes(2));
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

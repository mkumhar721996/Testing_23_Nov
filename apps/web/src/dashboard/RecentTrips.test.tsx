import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RecentTrips from './RecentTrips';
import { fetchRecentTrips } from './dashboard-api';

vi.mock('./dashboard-api', () => ({ fetchRecentTrips: vi.fn() }));

const trips = [
  { id: 'a', destination: 'Sydney, Australia', startDate: '2026-06-02', endDate: '2026-06-09', travelers: 2458, expenses: { amountMinor: 218000, currency: 'USD' } },
  { id: 'b', destination: 'Venice, Italy', startDate: '2026-05-14', endDate: '2026-05-20', travelers: 1020, expenses: { amountMinor: 176000, currency: 'USD' } },
  { id: 'c', destination: 'Paris, France', startDate: '2026-04-22', endDate: '2026-04-28', travelers: 845, expenses: { amountMinor: 154000, currency: 'USD' } },
];

describe('RecentTrips', () => {
  afterEach(() => vi.clearAllMocks());

  it('shows the trips with dates, travelers, expenses and a total', async () => {
    vi.mocked(fetchRecentTrips).mockResolvedValue(trips);
    render(<RecentTrips onComingSoon={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'Recent trips' })).toBeInTheDocument();
    expect(await screen.findByText('2 – 9 June')).toBeInTheDocument();
    expect(screen.getByText('2,458')).toBeInTheDocument();
    expect(screen.getByText('Total expenses, last 3 trips')).toBeInTheDocument();
    expect(screen.getByText('$5,480')).toBeInTheDocument();
  });

  it('shows a skeleton while loading', () => {
    vi.mocked(fetchRecentTrips).mockReturnValue(new Promise(() => {}));
    const { container } = render(<RecentTrips onComingSoon={vi.fn()} />);
    expect(container.querySelector('[aria-busy="true"] .skeleton')).not.toBeNull();
  });

  it('shows the empty copy', async () => {
    vi.mocked(fetchRecentTrips).mockResolvedValue([]);
    render(<RecentTrips onComingSoon={vi.fn()} />);
    expect(await screen.findByText('No recent trips')).toBeInTheDocument();
    expect(screen.getByText('Completed trips and their expenses will show here.')).toBeInTheDocument();
  });

  it('shows an error and refetches on Try again', async () => {
    vi.mocked(fetchRecentTrips).mockRejectedValueOnce(new Error('x')).mockResolvedValue(trips);
    render(<RecentTrips onComingSoon={vi.fn()} />);
    expect(await screen.findByText("We couldn't load recent trips.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Sydney, Australia')).toBeInTheDocument();
    expect(fetchRecentTrips).toHaveBeenCalledTimes(2);
  });

  it('reports View all as coming soon', async () => {
    const onComingSoon = vi.fn();
    vi.mocked(fetchRecentTrips).mockResolvedValue(trips);
    render(<RecentTrips onComingSoon={onComingSoon} />);
    fireEvent.click(await screen.findByRole('button', { name: 'View all' }));
    expect(onComingSoon).toHaveBeenCalledWith('Recent trips');
  });
});

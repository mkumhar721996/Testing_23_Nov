import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSearch } from '../search/search-api';
import DashboardPage from './DashboardPage';
import { fetchDashboardStats } from './dashboard-api';

vi.mock('./dashboard-api', () => ({ fetchDashboardStats: vi.fn() }));
vi.mock('../search/search-api', () => ({ fetchSearch: vi.fn() }));

const paris = { id: 'T-101', name: 'Paris, France – Romantic getaway', startDate: '2028-07-05', endDate: '2028-07-10' };
const laurent = {
  id: 'B-2041',
  name: 'Laurent family – Paris romantic getaway',
  tripId: 'T-101',
  status: 'Confirmed' as const,
  bookedOn: '2028-06-03',
};

function search(term: string) {
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: term } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
}

const stats = { bookings: 1200, customers: 2845, earnings: { amountMinor: 1234560, currency: 'USD' } };

describe('DashboardPage', () => {
  afterEach(() => vi.clearAllMocks());

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

  describe('top-bar search', () => {
    it('shows a matching trip in the results (AC1)', async () => {
      vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
      vi.mocked(fetchSearch).mockResolvedValue({ trips: [paris], bookings: [] });
      render(<DashboardPage />);
      search('Paris');
      expect(fetchSearch).toHaveBeenCalledWith('Paris', expect.anything());
      const results = await screen.findByRole('region', { name: 'Search results' });
      expect(within(results).getByRole('heading', { name: /^Trips/ })).toBeInTheDocument();
      expect(within(results).getByText('Paris', { selector: 'mark' })).toBeInTheDocument();
      expect(within(results).getByText(/T-101/)).toBeInTheDocument();
      expect(screen.queryByText('Total bookings')).toBeNull();
    });

    it('shows a matching booking in the results (AC2)', async () => {
      vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
      vi.mocked(fetchSearch).mockResolvedValue({ trips: [], bookings: [laurent] });
      render(<DashboardPage />);
      search('Laurent');
      const results = await screen.findByRole('region', { name: 'Search results' });
      expect(within(results).getByRole('heading', { name: /Bookings/ })).toBeInTheDocument();
      expect(within(results).getByText('Confirmed')).toBeInTheDocument();
      expect(within(results).getByText(/B-2041/)).toBeInTheDocument();
      expect(within(results).getByText(/booked 3 June 2028/)).toBeInTheDocument();
    });

    it('shows a skeleton while searching', () => {
      vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
      vi.mocked(fetchSearch).mockReturnValue(new Promise(() => {}));
      const { container } = render(<DashboardPage />);
      search('Paris');
      expect(screen.getByRole('heading', { name: 'Searching trips and bookings…' })).toBeInTheDocument();
      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    });

    it('says when nothing matches', async () => {
      vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
      vi.mocked(fetchSearch).mockResolvedValue({ trips: [], bookings: [] });
      render(<DashboardPage />);
      search('Lisbon');
      expect(await screen.findByText('No trips or bookings match “Lisbon”')).toBeInTheDocument();
    });

    it('shows an error and retries', async () => {
      vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
      vi.mocked(fetchSearch).mockRejectedValueOnce(new Error('x'));
      render(<DashboardPage />);
      search('Paris');
      const alert = await screen.findByRole('alert');
      expect(within(alert).getByText("We couldn't run your search.")).toBeInTheDocument();
      vi.mocked(fetchSearch).mockResolvedValue({ trips: [paris], bookings: [] });
      fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
      expect(fetchSearch).toHaveBeenCalledTimes(2);
      expect(await screen.findByRole('region', { name: 'Search results' })).toBeInTheDocument();
    });

    it('clears the search and brings the dashboard back', async () => {
      vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
      vi.mocked(fetchSearch).mockResolvedValue({ trips: [paris], bookings: [] });
      render(<DashboardPage />);
      search('Paris');
      await screen.findByRole('region', { name: 'Search results' });
      fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
      expect(await screen.findByText('Total bookings')).toBeInTheDocument();
      expect(screen.getByRole('searchbox')).toHaveValue('');
    });

    it('shows the coming-soon toast for a result row', async () => {
      vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
      vi.mocked(fetchSearch).mockResolvedValue({ trips: [paris], bookings: [] });
      render(<DashboardPage />);
      search('Paris');
      const results = await screen.findByRole('region', { name: 'Search results' });
      fireEvent.click(within(results).getByText(/T-101/));
      expect(screen.getByText('Details for Trip T-101 is coming soon.')).toBeInTheDocument();
    });
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './DashboardPage';
import {
  fetchDashboardStats,
  fetchMessages,
  fetchRecentTrips,
  fetchTravelPackages,
  fetchUpcomingTrips,
} from './dashboard-api';

vi.mock('./dashboard-api', () => ({
  fetchDashboardStats: vi.fn(),
  fetchRecentTrips: vi.fn(),
  fetchUpcomingTrips: vi.fn(),
  fetchTravelPackages: vi.fn(),
  fetchMessages: vi.fn(),
}));

const stats = { bookings: 1200, customers: 2845, earnings: { amountMinor: 1234560, currency: 'USD' } };
const usd = (amountMinor: number) => ({ amountMinor, currency: 'USD' });

function mockAll() {
  vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
  vi.mocked(fetchRecentTrips).mockResolvedValue([
    { id: 'a', destination: 'Sydney, Australia', startDate: '2026-06-02', endDate: '2026-06-09', travelers: 2458, expenses: usd(218000) },
  ]);
  vi.mocked(fetchUpcomingTrips).mockResolvedValue([
    { id: 'p', kind: 'Romantic getaway', destination: 'Paris, France', startDate: '2028-07-05', endDate: '2028-07-10' },
  ]);
  vi.mocked(fetchTravelPackages).mockResolvedValue([
    { id: 'p', destination: 'Paris, France', bookings: 320, createdAt: '2026-05-30' },
  ]);
  vi.mocked(fetchMessages).mockResolvedValue([
    { id: 'e', from: 'Europia Hotel', initials: 'EH', preview: 'We are pleased…', unread: 1 },
  ]);
}

const areas = ['Packages', 'Bookings', 'Calendar', 'Travelers', 'Guides', 'Gallery', 'Messages', 'Deals', 'Feedback'];
const card = (name: string) => screen.getByRole('heading', { name }).closest('.card') as HTMLElement;

describe('DashboardPage', () => {
  beforeEach(mockAll);
  afterEach(() => vi.clearAllMocks());

  it('shows the travel dashboard with no banking content', async () => {
    render(<DashboardPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    await screen.findByText('Total bookings');
    expect(
      screen.queryByText(/account|credit card|loan|fixed deposit|transaction|good (morning|afternoon|evening)/i),
    ).toBeNull();
  });

  it('puts the three stat tiles first in the page body content', async () => {
    render(<DashboardPage />);
    const tiles = (await screen.findByText('Total bookings')).closest('.grid') as HTMLElement;
    expect(within(tiles).getAllByText(/^Total /)).toHaveLength(3);
    expect(screen.getByRole('main').querySelector('.dash-main')!.firstElementChild).toBe(tiles);
  });

  it('shows all four widgets', async () => {
    render(<DashboardPage />);
    for (const name of ['Recent trips', 'Upcoming trips', 'Travel packages', 'Messages']) {
      expect(await screen.findByRole('heading', { name })).toBeInTheDocument();
    }
  });

  it('keeps the page when the stats fetch fails', async () => {
    vi.mocked(fetchDashboardStats).mockRejectedValue(new Error('x'));
    render(<DashboardPage />);
    expect(await screen.findByText("We couldn't load your totals.")).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(await screen.findByText('Europia Hotel')).toBeInTheDocument();
  });

  it('isolates a failing widget from the stats and the other widgets', async () => {
    vi.mocked(fetchRecentTrips).mockRejectedValue(new Error('x'));
    render(<DashboardPage />);
    expect(await screen.findByText("We couldn't load recent trips.")).toBeInTheDocument();
    expect(await screen.findByText('Total bookings')).toBeInTheDocument();
    expect(await screen.findByText('Europia Hotel')).toBeInTheDocument();
    expect(await screen.findByText('Romantic getaway')).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it.each(areas)('%s shows coming soon', (label) => {
    render(<DashboardPage />);
    const nav = screen.getByRole('navigation', { name: 'Travel areas' });
    fireEvent.click(within(nav).getByRole('button', { name: label }));
    expect(screen.getByRole('status')).toHaveTextContent(`${label} is coming soon.`);
  });

  it('shows coming soon for Recent trips View all', async () => {
    render(<DashboardPage />);
    await screen.findByText('Sydney, Australia');
    fireEvent.click(within(card('Recent trips')).getByRole('button', { name: 'View all' }));
    expect(screen.getByRole('status')).toHaveTextContent('Recent trips is coming soon.');
  });

  it('shows coming soon for Travel packages View all', async () => {
    render(<DashboardPage />);
    await screen.findByRole('img', { name: 'Package image: Paris' });
    fireEvent.click(within(card('Travel packages')).getByRole('button', { name: 'View all' }));
    expect(screen.getByRole('status')).toHaveTextContent('Travel packages is coming soon.');
  });

  it('shows coming soon for the Add trip button', async () => {
    render(<DashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add trip' }));
    expect(screen.getByRole('status')).toHaveTextContent('Adding a trip is coming soon.');
  });

  it('shows coming soon for the Message options menu', async () => {
    render(<DashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Message options' }));
    expect(screen.getByRole('status')).toHaveTextContent('Message options is coming soon.');
  });
});

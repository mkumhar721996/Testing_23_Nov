import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './DashboardPage';
import { fetchDashboardStats } from './dashboard-api';

vi.mock('./dashboard-api', () => ({ fetchDashboardStats: vi.fn() }));

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

  it('shows coming soon for Notifications', async () => {
    vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
    render(<DashboardPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Notifications is coming soon.');
  });

  it('shows coming soon for Profile from the account menu', async () => {
    vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
    render(<DashboardPage />);
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Profile' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Profile is coming soon.');
  });

  it('keeps the page when the stats fetch fails', async () => {
    vi.mocked(fetchDashboardStats).mockRejectedValue(new Error('x'));
    render(<DashboardPage />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});

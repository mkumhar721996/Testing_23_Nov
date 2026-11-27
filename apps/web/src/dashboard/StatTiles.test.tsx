import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StatTiles from './StatTiles';
import { fetchDashboardStats } from './dashboard-api';

vi.mock('./dashboard-api', () => ({ fetchDashboardStats: vi.fn() }));

const stats = { bookings: 1200, customers: 2845, earnings: { amountMinor: 1234560, currency: 'USD' } };
const tile = (label: string) => screen.getByText(label).closest('.stat') as HTMLElement;

describe('StatTiles', () => {
  afterEach(() => vi.clearAllMocks());

  it('shows one total per tile', async () => {
    vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
    render(<StatTiles />);
    const bookings = (await screen.findByText('Total bookings')).closest('.stat') as HTMLElement;
    expect(within(bookings).getByText('1,200')).toBeInTheDocument();
    expect(within(tile('Total customers')).getByText('2,845')).toBeInTheDocument();
    expect(within(tile('Total earnings')).getByText('$12,346')).toBeInTheDocument();
    expect(document.querySelectorAll('.stat-value')).toHaveLength(3);
  });

  it('shows no change indicator', async () => {
    vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
    render(<StatTiles />);
    await screen.findByText('Total bookings');
    expect(document.querySelector('.stat-delta')).toBeNull();
    expect(document.body.textContent).not.toMatch(/[+−-]\s?\d+(\.\d+)?%|▲|▼|↑|↓/);
  });

  it('fetches once with no period argument', async () => {
    vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
    render(<StatTiles />);
    await screen.findByText('Total bookings');
    expect(fetchDashboardStats).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchDashboardStats).mock.calls[0].length).toBeLessThanOrEqual(1);
  });

  it('shows skeletons while loading', () => {
    vi.mocked(fetchDashboardStats).mockReturnValue(new Promise(() => undefined));
    const { container } = render(<StatTiles />);
    expect(container.querySelector('[aria-busy="true"] .skeleton')).not.toBeNull();
  });

  it('shows an error with a retry that refetches', async () => {
    vi.mocked(fetchDashboardStats).mockRejectedValueOnce(new Error('x')).mockResolvedValue(stats);
    render(<StatTiles />);
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load your totals.");
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('$12,346')).toBeInTheDocument();
    expect(fetchDashboardStats).toHaveBeenCalledTimes(2);
  });

  it('shows an empty state when every total is zero', async () => {
    vi.mocked(fetchDashboardStats).mockResolvedValue({
      bookings: 0,
      customers: 0,
      earnings: { amountMinor: 0, currency: 'USD' },
    });
    render(<StatTiles />);
    expect(await screen.findByText('No travel totals yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload data' })).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TravelPackages from './TravelPackages';
import { fetchTravelPackages } from './dashboard-api';

vi.mock('./dashboard-api', () => ({ fetchTravelPackages: vi.fn() }));

const packages = [
  { id: 'p', destination: 'Paris, France', bookings: 320, createdAt: '2026-05-30' },
  { id: 't', destination: 'Tokyo, Japan', bookings: 410, createdAt: '2026-05-12' },
];

describe('TravelPackages', () => {
  afterEach(() => vi.clearAllMocks());

  it('shows a placeholder image per package', async () => {
    vi.mocked(fetchTravelPackages).mockResolvedValue(packages);
    render(<TravelPackages onComingSoon={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'Travel packages' })).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Package image: Paris' })).toBeInTheDocument();
    expect(fetchTravelPackages).toHaveBeenCalledWith('latest', expect.anything());
  });

  it('refetches with the chosen sort', async () => {
    vi.mocked(fetchTravelPackages).mockResolvedValue(packages);
    render(<TravelPackages onComingSoon={vi.fn()} />);
    await screen.findByRole('img', { name: 'Package image: Paris' });
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'most-booked' } });
    expect(fetchTravelPackages).toHaveBeenLastCalledWith('most-booked', expect.anything());
  });

  it('shows a skeleton while loading', () => {
    vi.mocked(fetchTravelPackages).mockReturnValue(new Promise(() => {}));
    const { container } = render(<TravelPackages onComingSoon={vi.fn()} />);
    expect(container.querySelector('[aria-busy="true"] .skeleton')).not.toBeNull();
  });

  it('shows the empty copy', async () => {
    vi.mocked(fetchTravelPackages).mockResolvedValue([]);
    render(<TravelPackages onComingSoon={vi.fn()} />);
    expect(await screen.findByText('No travel packages yet')).toBeInTheDocument();
    expect(screen.getByText('Packages you offer will show here, newest first.')).toBeInTheDocument();
  });

  it('shows an error and refetches on Try again', async () => {
    vi.mocked(fetchTravelPackages).mockRejectedValueOnce(new Error('x')).mockResolvedValue(packages);
    render(<TravelPackages onComingSoon={vi.fn()} />);
    expect(await screen.findByText("We couldn't load travel packages.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('img', { name: 'Package image: Tokyo' })).toBeInTheDocument();
    expect(fetchTravelPackages).toHaveBeenCalledTimes(2);
  });

  it('reports View all as coming soon', async () => {
    const onComingSoon = vi.fn();
    vi.mocked(fetchTravelPackages).mockResolvedValue(packages);
    render(<TravelPackages onComingSoon={onComingSoon} />);
    fireEvent.click(await screen.findByRole('button', { name: 'View all' }));
    expect(onComingSoon).toHaveBeenCalledWith('Travel packages');
  });
});

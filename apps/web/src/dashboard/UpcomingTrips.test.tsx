import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UpcomingTrips from './UpcomingTrips';
import { fetchUpcomingTrips } from './dashboard-api';

vi.mock('./dashboard-api', () => ({ fetchUpcomingTrips: vi.fn() }));

const trips = [
  { id: 'p', kind: 'Romantic getaway', destination: 'Paris, France', startDate: '2028-07-05', endDate: '2028-07-10' },
  { id: 't', kind: 'Cultural exploration', destination: 'Tokyo, Japan', startDate: '2028-07-12', endDate: '2028-07-19' },
];

describe('UpcomingTrips', () => {
  afterEach(() => vi.clearAllMocks());

  it('shows the trips and the add button', async () => {
    vi.mocked(fetchUpcomingTrips).mockResolvedValue(trips);
    render(<UpcomingTrips onComingSoon={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'Upcoming trips' })).toBeInTheDocument();
    expect(await screen.findByText('Romantic getaway')).toBeInTheDocument();
    expect(screen.getByText('12 – 19 July')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Tokyo, Japan trip image' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add trip' })).toBeInTheDocument();
  });

  it('shows a skeleton while loading', () => {
    vi.mocked(fetchUpcomingTrips).mockReturnValue(new Promise(() => {}));
    const { container } = render(<UpcomingTrips onComingSoon={vi.fn()} />);
    expect(container.querySelector('[aria-busy="true"] .skeleton')).not.toBeNull();
  });

  it('shows the empty copy', async () => {
    vi.mocked(fetchUpcomingTrips).mockResolvedValue([]);
    render(<UpcomingTrips onComingSoon={vi.fn()} />);
    expect(await screen.findByText('No upcoming trips. Add one with the plus button.')).toBeInTheDocument();
  });

  it('shows an error and refetches on Try again', async () => {
    vi.mocked(fetchUpcomingTrips).mockRejectedValueOnce(new Error('x')).mockResolvedValue(trips);
    render(<UpcomingTrips onComingSoon={vi.fn()} />);
    expect(await screen.findByText("We couldn't load upcoming trips.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Paris, France')).toBeInTheDocument();
    expect(fetchUpcomingTrips).toHaveBeenCalledTimes(2);
  });

  it('reports the plus button as coming soon', async () => {
    const onComingSoon = vi.fn();
    vi.mocked(fetchUpcomingTrips).mockResolvedValue(trips);
    render(<UpcomingTrips onComingSoon={onComingSoon} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add trip' }));
    expect(onComingSoon).toHaveBeenCalledWith('Adding a trip');
  });
});

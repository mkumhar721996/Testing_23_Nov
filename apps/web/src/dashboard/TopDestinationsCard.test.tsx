import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchTopDestinations } from './dashboard-api';
import { destinationsByPeriod } from './fixtures';
import TopDestinationsCard from './TopDestinationsCard';
import type { Period } from './types';

vi.mock('./dashboard-api', () => ({ fetchTopDestinations: vi.fn() }));

const periods: Period[] = ['weekly', 'monthly', 'yearly'];
const label = (p: Period) => p[0].toUpperCase() + p.slice(1);
const tokyo = (p: Period) => `Tokyo, Japan (${destinationsByPeriod[p].destinations[0].percent}%)`;

async function choose(p: Period) {
  fireEvent.click(screen.getByRole('button', { name: 'Destinations period' }));
  fireEvent.click(screen.getByRole('menuitemradio', { name: label(p) }));
}

describe('TopDestinationsCard', () => {
  afterEach(() => vi.resetAllMocks());

  it('draws the destinations as a donut with a legend', async () => {
    vi.mocked(fetchTopDestinations).mockImplementation(async (p) => destinationsByPeriod[p]);
    render(<TopDestinationsCard />);
    expect(await screen.findByRole('heading', { level: 2, name: 'Top destinations' })).toBeInTheDocument();
    const chart = await screen.findByRole('img', { name: /donut chart/i });
    expect(chart.querySelectorAll('circle.seg')).toHaveLength(4);
    expect(screen.getByText('Tokyo, Japan (35%)')).toBeInTheDocument();
    expect(screen.getByText('1,000 participants')).toBeInTheDocument();
  });

  it('offers Weekly, Monthly and Yearly with Monthly checked', async () => {
    vi.mocked(fetchTopDestinations).mockImplementation(async (p) => destinationsByPeriod[p]);
    render(<TopDestinationsCard />);
    fireEvent.click(await screen.findByRole('button', { name: 'Destinations period' }));
    expect(screen.getAllByRole('menuitemradio').map((i) => i.textContent)).toEqual([
      'Weekly',
      'Monthly',
      'Yearly',
    ]);
    expect(screen.getByRole('menuitemradio', { name: 'Monthly' })).toHaveAttribute('aria-checked', 'true');
  });

  const pairs = periods.flatMap((from) => periods.filter((to) => to !== from).map((to) => [from, to] as const));
  it.each(pairs)('changes the donut data from %s to %s', async (from, to) => {
    vi.mocked(fetchTopDestinations).mockImplementation(async (p) => destinationsByPeriod[p]);
    render(<TopDestinationsCard />);
    await screen.findByText(tokyo('monthly'));
    if (from !== 'monthly') {
      await choose(from);
      await screen.findByText(tokyo(from));
    }
    await choose(to);
    expect(fetchTopDestinations).toHaveBeenLastCalledWith(to, expect.anything());
    expect(await screen.findByText(tokyo(to))).toBeInTheDocument();
    expect(screen.queryByText(tokyo(from))).toBeNull();
  });

  it('shows the empty state for an empty response', async () => {
    vi.mocked(fetchTopDestinations).mockResolvedValue({ period: 'monthly', destinations: [] });
    render(<TopDestinationsCard />);
    expect(await screen.findByText('No trips in this period')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Destinations period' })).toBeEnabled();
  });

  it('shows an alert with a working Try again when the fetch fails', async () => {
    vi.mocked(fetchTopDestinations).mockRejectedValueOnce(new Error('x'));
    vi.mocked(fetchTopDestinations).mockImplementation(async (p) => destinationsByPeriod[p]);
    render(<TopDestinationsCard />);
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load destinations.");
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('img', { name: /donut chart/i })).toBeInTheDocument();
  });
});

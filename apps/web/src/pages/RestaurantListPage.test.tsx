import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RestaurantSummary } from '../api/restaurants';
import { listRestaurants } from '../api/restaurants';
import RestaurantListPage from './RestaurantListPage';

vi.mock('../api/restaurants', () => ({ listRestaurants: vi.fn() }));
const mocked = vi.mocked(listRestaurants);

const green: RestaurantSummary = {
  id: 'r2',
  name: 'Green Bowl Kitchen',
  cuisine: 'Vegetarian',
  isOpen: false,
  hoursLabel: 'Opens 11:00 tomorrow',
  deliveryFeeCents: 350,
  etaLabel: '25–35 min',
};
const noodles: RestaurantSummary = {
  ...green,
  id: 'r1',
  name: 'Harbour Street Noodles',
  isOpen: true,
};

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <RestaurantListPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocked.mockReset();
});

describe('RestaurantListPage', () => {
  it('lists every restaurant with no location (AC1)', async () => {
    mocked.mockResolvedValue({ restaurants: [noodles, green] });
    renderAt('/restaurants');
    expect(await screen.findByRole('link', { name: /Harbour Street Noodles/ })).toHaveAttribute(
      'href',
      '/restaurants/r1',
    );
    expect(mocked).toHaveBeenCalledWith(undefined);
    expect(screen.getByText('2 restaurants')).toBeInTheDocument();
  });

  it('asks for the location in the URL and shows matches (AC5, AC6)', async () => {
    mocked.mockResolvedValue({ restaurants: [green] });
    renderAt('/restaurants?location=2040');
    expect(await screen.findByRole('link', { name: /Green Bowl Kitchen/ })).toBeInTheDocument();
    expect(mocked).toHaveBeenCalledWith('2040');
    expect(screen.getByText('Showing only restaurants that serve this location.')).toBeInTheDocument();
  });

  it('marks a closed restaurant Closed and keeps it listed (AC7)', async () => {
    mocked.mockResolvedValue({ restaurants: [green] });
    renderAt('/restaurants?location=2040');
    const card = await screen.findByRole('link', { name: /Green Bowl Kitchen/ });
    expect(within(card).getByText('Closed')).toBeInTheDocument();
    expect(within(card).queryByText('Open')).not.toBeInTheDocument();
    expect(within(card).getByText('Delivery $3.50, 25–35 min')).toBeInTheDocument();
  });

  it('says no restaurant serves the location and lists none (AC9, AC10)', async () => {
    mocked.mockResolvedValue({ restaurants: [] });
    renderAt('/restaurants?location=9999');
    expect(await screen.findByRole('heading', { name: 'No restaurant serves 9999' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /restaurants/i })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('link', { name: /Delivery/ })).toHaveLength(0);
  });

  it('shows an empty state when there are no restaurants at all', async () => {
    mocked.mockResolvedValue({ restaurants: [] });
    renderAt('/restaurants');
    expect(await screen.findByRole('heading', { name: 'No restaurants yet' })).toBeInTheDocument();
  });

  it('shows a loading state while pending', () => {
    mocked.mockReturnValue(new Promise(() => undefined));
    renderAt('/restaurants');
    expect(screen.getByRole('status', { name: 'Loading restaurants' })).toBeInTheDocument();
  });

  it('shows an error and retries with the same location', async () => {
    mocked.mockRejectedValueOnce(new Error('boom'));
    renderAt('/restaurants?location=2040');
    expect(await screen.findByText("We couldn't load the restaurants.")).toBeInTheDocument();
    mocked.mockResolvedValue({ restaurants: [green] });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: /Green Bowl Kitchen/ })).toBeInTheDocument();
    expect(mocked).toHaveBeenLastCalledWith('2040');
  });

  it('submitting the form puts the location in the query', async () => {
    mocked.mockResolvedValue({ restaurants: [noodles] });
    renderAt('/restaurants');
    await screen.findByRole('link', { name: /Harbour/ });
    fireEvent.change(screen.getByLabelText('Delivery location (optional)'), { target: { value: ' 2000 ' } });
    fireEvent.click(screen.getByRole('button', { name: /Show restaurants for this location/ }));
    expect(mocked).toHaveBeenLastCalledWith('2000');
  });
});

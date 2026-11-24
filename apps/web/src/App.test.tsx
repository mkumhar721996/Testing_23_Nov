import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import App from './App';
import * as api from './orders/api';

vi.mock('./orders/api');

const order = {
  id: '4821',
  restaurantId: 'r1',
  restaurantName: 'Harbor Noodle House',
  status: 'placed' as const,
  placedAt: '2026-11-21T12:00:00.000Z',
  itemCount: 3,
  totalMinor: 1950,
  currency: 'GBP',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.fetchOrders).mockResolvedValue({
    active: [order],
    past: [{ ...order, id: '4755', status: 'completed' }],
  });
});

describe('App', () => {
  it('opens on the past orders screen', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Your orders' })).toBeInTheDocument();
  });

  it('shows the order status for the tracked order', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Track order' }));
    expect(screen.getByRole('heading', { name: 'Order status' })).toBeInTheDocument();
    expect(screen.getByText('Order 4821')).toBeInTheDocument();
  });

  it('opens the cart after a reorder', async () => {
    vi.mocked(api.reorder).mockResolvedValue({ cartId: 'cart1' });
    render(<App />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Past' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }));
    expect(await screen.findByRole('heading', { name: 'Your cart' })).toBeInTheDocument();
  });

  it('opens the restaurant list from the empty state', async () => {
    vi.mocked(api.fetchOrders).mockResolvedValue({ active: [], past: [] });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Browse restaurants' }));
    expect(screen.getByRole('heading', { name: 'Restaurants' })).toBeInTheDocument();
  });
});

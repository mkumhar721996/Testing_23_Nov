import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import { PastOrdersPage } from './PastOrdersPage';
import type { OrderLists, OrderSummary } from './types';

vi.mock('./api');

const order = (o: Partial<OrderSummary> & { id: string }): OrderSummary => ({
  restaurantId: 'r1',
  restaurantName: 'Harbor Noodle House',
  status: 'placed',
  placedAt: '2026-11-21T12:00:00.000Z',
  itemCount: 3,
  totalMinor: 1950,
  currency: 'GBP',
  ...o,
});

const active = order({ id: '4821', status: 'placed' });
const past = [
  order({ id: '4755', restaurantName: 'Pizza Lane', status: 'completed' }),
  order({ id: '4700', restaurantName: 'Green Table Café', status: 'rejected' }),
  order({ id: '4650', restaurantName: 'Sushi Dock', status: 'cancelled' }),
];

const handlers = () => ({
  onTrackOrder: vi.fn(),
  onOpenCart: vi.fn(),
  onBrowseRestaurants: vi.fn(),
});

const show = (lists: OrderLists) => {
  vi.mocked(api.fetchOrders).mockResolvedValue(lists);
  const h = handlers();
  render(<PastOrdersPage {...h} />);
  return h;
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('PastOrdersPage', () => {
  it('shows two tabs, the first selected (AC1)', async () => {
    show({ active: [active], past });
    expect(await screen.findAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: 'Active' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Past' })).toHaveAttribute('aria-selected', 'false');
  });

  it('lists active orders with Track order and no finished ones on the first tab (AC2, AC4)', async () => {
    show({ active: [active], past });
    const panel = await screen.findByRole('tabpanel');
    expect(within(panel).getByText('Harbor Noodle House')).toBeInTheDocument();
    expect(within(panel).getByText('Placed')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Track order' })).toBeInTheDocument();
    expect(within(panel).queryByText('Pizza Lane')).not.toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Reorder' })).not.toBeInTheDocument();
  });

  it('formats the date, item count and total in the order currency', async () => {
    show({ active: [active], past });
    const panel = await screen.findByRole('tabpanel');
    expect(within(panel).getByText(/3 items/)).toHaveTextContent(/£19\.50/);
  });

  it('lists finished orders with Reorder on the second tab (AC3)', async () => {
    show({ active: [active], past });
    fireEvent.click(await screen.findByRole('tab', { name: 'Past' }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getAllByRole('button', { name: 'Reorder' })).toHaveLength(3);
    expect(within(panel).queryByRole('button', { name: 'Track order' })).not.toBeInTheDocument();
    expect(within(panel).getByText('Completed')).toBeInTheDocument();
    expect(within(panel).getByText('Rejected')).toBeInTheDocument();
    expect(within(panel).getByText('Cancelled')).toBeInTheDocument();
  });

  it('moves between tabs with the arrow keys', async () => {
    show({ active: [active], past });
    const first = await screen.findByRole('tab', { name: 'Active' });
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Past' })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens the order status for the tracked order (AC5)', async () => {
    const h = show({ active: [active], past });
    fireEvent.click(await screen.findByRole('button', { name: 'Track order' }));
    expect(h.onTrackOrder).toHaveBeenCalledWith('4821');
  });

  it('adds the items, then opens the cart (AC6, AC7)', async () => {
    vi.mocked(api.reorder).mockResolvedValue({ cartId: 'cart1' });
    const h = show({ active: [], past });
    fireEvent.click(await screen.findByRole('tab', { name: 'Past' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Reorder' })[0]);
    await waitFor(() => expect(api.reorder).toHaveBeenCalledWith('4755'));
    await waitFor(() => expect(h.onOpenCart).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.reorder).mock.invocationCallOrder[0]).toBeLessThan(
      h.onOpenCart.mock.invocationCallOrder[0],
    );
  });

  it('keeps the cart closed and says so when the reorder fails', async () => {
    vi.mocked(api.reorder).mockRejectedValue(new Error('boom'));
    const h = show({ active: [], past });
    fireEvent.click(await screen.findByRole('tab', { name: 'Past' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Reorder' })[0]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Your cart is unchanged');
    expect(h.onOpenCart).not.toHaveBeenCalled();
  });

  it('shows an empty message with Browse restaurants when there are no orders (AC9, AC10)', async () => {
    const h = show({ active: [], past: [] });
    expect(await screen.findByText('You have no orders yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Browse restaurants' }));
    expect(h.onBrowseRestaurants).toHaveBeenCalledTimes(1);
  });

  it('says there are no active orders when only finished ones exist', async () => {
    show({ active: [], past });
    expect(await screen.findByText('No active orders right now')).toBeInTheDocument();
    expect(screen.queryByText('You have no orders yet')).not.toBeInTheDocument();
  });

  it('shows busy skeleton rows while loading', () => {
    vi.mocked(api.fetchOrders).mockReturnValue(new Promise(() => {}));
    const { container } = render(<PastOrdersPage {...handlers()} />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('shows an error and refetches on Try again', async () => {
    vi.mocked(api.fetchOrders).mockRejectedValueOnce(new Error('boom'));
    vi.mocked(api.fetchOrders).mockResolvedValueOnce({ active: [active], past: [] });
    render(<PastOrdersPage {...handlers()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load your orders');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Track order' })).toBeInTheDocument();
    expect(api.fetchOrders).toHaveBeenCalledTimes(2);
  });
});

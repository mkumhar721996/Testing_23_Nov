import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OrderStatusPage from './OrderStatusPage';
import { cancelOrder, getOrder, type Order } from './orders-api';

vi.mock('./orders-api', () => ({ getOrder: vi.fn(), cancelOrder: vi.fn() }));

const order = (status: Order['status'], canCancel = status === 'placed'): Order => ({
  id: '4821',
  status,
  canCancel,
  restaurant: 'Harbor Noodle House',
  placedAt: '2026-11-23T12:14:00Z',
  items: [
    { name: 'Beef pho', quantity: 1, price: 12.5 },
    { name: 'Spring rolls', quantity: 2, price: 3.5 },
  ],
  total: 19.5,
  currency: 'GBP',
});

const cancelButton = () => screen.queryByRole('button', { name: 'Cancel order' });

async function openConfirm() {
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));
}

beforeEach(() => {
  vi.mocked(getOrder).mockReset();
  vi.mocked(cancelOrder).mockReset();
});
afterEach(cleanup);

describe('OrderStatusPage cancel button', () => {
  it('is shown for a placed order', async () => {
    vi.mocked(getOrder).mockResolvedValue(order('placed'));
    render(<OrderStatusPage orderId="4821" />);
    expect(await screen.findByRole('button', { name: 'Cancel order' })).toBeInTheDocument();
  });

  it.each(['accepted', 'rejected'] as const)('is not shown for a %s order', async (status) => {
    vi.mocked(getOrder).mockResolvedValue(order(status));
    render(<OrderStatusPage orderId="4821" />);
    // Only present once the order has loaded (the h1 is also rendered while loading).
    await screen.findByText(/From Harbor Noodle House/);
    expect(cancelButton()).not.toBeInTheDocument();
  });
});

describe('OrderStatusPage confirm step', () => {
  beforeEach(() => {
    vi.mocked(getOrder).mockResolvedValue(order('placed'));
  });

  it('shows Keep order and Confirm cancellation', async () => {
    render(<OrderStatusPage orderId="4821" />);
    await openConfirm();
    expect(screen.getByRole('button', { name: 'Keep order' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Confirm cancellation' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('refunds the full £19.50');
  });

  it('keeps the order when Keep order is tapped', async () => {
    render(<OrderStatusPage orderId="4821" />);
    await openConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'Keep order' }));
    expect(cancelOrder).not.toHaveBeenCalled();
    expect(screen.queryByText('Order cancelled')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel order' })).toBeVisible();
  });

  it('shows the cancelled message when cancellation is confirmed', async () => {
    vi.mocked(cancelOrder).mockResolvedValue({ kind: 'cancelled' });
    render(<OrderStatusPage orderId="4821" />);
    await openConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Order cancelled');
    expect(status).toHaveTextContent('A full refund of £19.50 has been started to your card.');
    expect(cancelOrder).toHaveBeenCalledWith('4821');
  });

  it('says the order can no longer be cancelled when the restaurant accepted first', async () => {
    vi.mocked(cancelOrder).mockResolvedValue({ kind: 'not-cancellable', status: 'accepted' });
    vi.mocked(getOrder).mockResolvedValueOnce(order('placed')).mockResolvedValue(order('accepted'));
    render(<OrderStatusPage orderId="4821" />);
    await openConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('can no longer be cancelled');
    expect(screen.queryByText('Order cancelled')).not.toBeInTheDocument();
    expect(screen.getByText('Accepted')).toHaveAttribute('aria-current', 'step');
    expect(cancelButton()).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm cancellation' })).not.toBeInTheDocument();
  });

  it('shows the cancelled state, not the accepted message, when the server says it is already cancelled', async () => {
    vi.mocked(cancelOrder).mockResolvedValue({ kind: 'not-cancellable', status: 'cancelled' });
    vi.mocked(getOrder).mockResolvedValueOnce(order('placed')).mockResolvedValue(order('cancelled'));
    render(<OrderStatusPage orderId="4821" />);
    await openConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Order cancelled');
    expect(screen.queryByText(/restaurant has accepted it/)).not.toBeInTheDocument();
  });

  it('keeps the confirm open and says what went wrong when cancelling fails', async () => {
    vi.mocked(cancelOrder).mockRejectedValue(new Error('network'));
    render(<OrderStatusPage orderId="4821" />);
    await openConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    expect(await screen.findByText(/could not cancel/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm cancellation' })).toBeVisible();
  });
});

describe('OrderStatusPage load states', () => {
  it('is busy while loading', () => {
    vi.mocked(getOrder).mockReturnValue(new Promise(() => {}));
    const { container } = render(<OrderStatusPage orderId="4821" />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('offers Try again when loading fails', async () => {
    vi.mocked(getOrder).mockRejectedValueOnce(new Error('down')).mockResolvedValue(order('placed'));
    render(<OrderStatusPage orderId="4821" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Cancel order' })).toBeInTheDocument();
  });
});

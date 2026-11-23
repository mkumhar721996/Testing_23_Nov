import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { makeOrder } from './orderFixtures';
import { SelectedOrderProvider } from './SelectedOrderContext';

const api = vi.hoisted(() => ({ fetchOrder: vi.fn(), fetchOrders: vi.fn() }));
vi.mock('../api/orders', () => ({
  ...api,
  OrderNotFoundError: class OrderNotFoundError extends Error {},
}));

function renderOrders() {
  return render(
    <MemoryRouter initialEntries={['/orders']}>
      <SelectedOrderProvider>
        <App />
      </SelectedOrderProvider>
    </MemoryRouter>,
  );
}

describe('OrdersPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    api.fetchOrder.mockReset();
    api.fetchOrders.mockReset();
    api.fetchOrder.mockImplementation((id: string) =>
      Promise.resolve(id === 'o1' ? makeOrder('o1', 'placed') : makeOrder('o2', 'preparing', 'pickup', 'Pizza Lane')),
    );
  });

  it('opens the tapped order, showing that order step and not another', async () => {
    api.fetchOrders.mockResolvedValue([makeOrder('o1', 'placed'), makeOrder('o2', 'preparing', 'pickup', 'Pizza Lane')]);
    renderOrders();
    const rows = await screen.findAllByRole('link', { name: 'Track order' });
    expect(rows).toHaveLength(2);
    fireEvent.click(within(rows[1].closest('.order-row') as HTMLElement).getByRole('link', { name: 'Track order' }));
    expect(await screen.findByRole('heading', { name: 'Order #o2' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Preparing', { selector: 'li' })).toHaveAttribute('aria-current', 'step'));
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(sessionStorage.getItem('selectedOrderId')).toBe('o2');
  });

  it('shows each order with its current step label', async () => {
    api.fetchOrders.mockResolvedValue([makeOrder('o1', 'ready', 'delivery')]);
    renderOrders();
    expect(await screen.findByText('Out for delivery')).toHaveClass('badge');
  });

  it('shows the empty state', async () => {
    api.fetchOrders.mockResolvedValue([]);
    renderOrders();
    expect(await screen.findByText('You have no orders yet')).toBeInTheDocument();
  });

  it('shows an error with a retry', async () => {
    api.fetchOrders.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    renderOrders();
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load your orders');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('You have no orders yet')).toBeInTheDocument();
  });

  it('reserves space while loading', () => {
    api.fetchOrders.mockReturnValue(new Promise(() => {}));
    const { container } = renderOrders();
    expect(container.querySelector('[aria-busy="true"] .skeleton')).not.toBeNull();
  });
});

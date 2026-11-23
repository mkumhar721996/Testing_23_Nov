import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { makeOrder } from '../orders/orderFixtures';
import { SelectedOrderProvider } from '../orders/SelectedOrderContext';

const api = vi.hoisted(() => ({ fetchOrder: vi.fn(), fetchOrders: vi.fn() }));
vi.mock('../api/orders', () => ({
  ...api,
  OrderNotFoundError: class OrderNotFoundError extends Error {},
}));

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/orders']}>
      <SelectedOrderProvider>
        <App />
      </SelectedOrderProvider>
    </MemoryRouter>,
  );
}

describe('AppShell Orders navigation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    api.fetchOrders.mockResolvedValue([]);
    api.fetchOrder.mockImplementation((id: string) => Promise.resolve(makeOrder(id, 'preparing')));
  });

  it('opens the selected order status from the Orders entry', async () => {
    sessionStorage.setItem('selectedOrderId', 'o2');
    renderApp();
    fireEvent.click(screen.getByRole('link', { name: 'Orders' }));
    expect(await screen.findByRole('heading', { name: 'Order #o2' })).toBeInTheDocument();
    expect(await screen.findByText('Preparing', { selector: 'li' })).toHaveAttribute('aria-current', 'step');
  });

  it('opens the Orders list when no order is selected', async () => {
    renderApp();
    fireEvent.click(screen.getByRole('link', { name: 'Orders' }));
    expect(await screen.findByRole('heading', { name: 'Your orders' })).toBeInTheDocument();
  });

  it('marks Orders as the current section', () => {
    renderApp();
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute('aria-current', 'page');
  });
});

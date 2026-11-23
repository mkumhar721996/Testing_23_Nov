import { fireEvent, render, screen } from '@testing-library/react';
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

describe('OrderConfirmationPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    api.fetchOrder.mockResolvedValue(makeOrder('o7', 'accepted'));
  });

  it('opens the status of the order when Track order is tapped and selects it', async () => {
    render(
      <MemoryRouter initialEntries={['/orders/o7/confirmation']}>
        <SelectedOrderProvider>
          <App />
        </SelectedOrderProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('link', { name: 'Track order' }));
    expect(await screen.findByRole('heading', { name: 'Order #o7' })).toBeInTheDocument();
    expect(sessionStorage.getItem('selectedOrderId')).toBe('o7');
    expect(await screen.findByText('Accepted', { selector: 'li' })).toHaveAttribute('aria-current', 'step');
  });
});

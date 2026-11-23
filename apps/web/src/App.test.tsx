import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { SelectedOrderProvider } from './orders/SelectedOrderContext';

vi.mock('./api/orders', () => ({
  fetchOrder: vi.fn(),
  fetchOrders: vi.fn().mockResolvedValue([]),
  OrderNotFoundError: class OrderNotFoundError extends Error {},
}));

describe('App', () => {
  it('lands on the Orders list for an unknown path', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <SelectedOrderProvider>
          <App />
        </SelectedOrderProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Your orders' })).toBeInTheDocument();
  });
});

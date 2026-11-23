import { render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import App from './App';

vi.mock('./orders/OrderStatusPage', () => ({
  default: ({ orderId }: { orderId: string }) => <p>Order page {orderId}</p>,
}));

afterEach(() => window.history.pushState({}, '', '/'));

describe('App', () => {
  it('renders the heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Web App' })).toBeInTheDocument();
  });

  it('renders the Order status page at /orders/:id', () => {
    window.history.pushState({}, '', '/orders/4821');
    render(<App />);
    expect(screen.getByText('Order page 4821')).toBeInTheDocument();
  });
});

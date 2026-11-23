import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { makeOrder } from './orderFixtures';
import { SelectedOrderProvider } from './SelectedOrderContext';

const api = vi.hoisted(() => ({ fetchOrder: vi.fn(), fetchOrders: vi.fn() }));
vi.mock('../api/orders', () => ({
  ...api,
  OrderNotFoundError: class OrderNotFoundError extends Error {},
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SelectedOrderProvider>
        <App />
      </SelectedOrderProvider>
    </MemoryRouter>,
  );
}

describe('OrderStatusPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    api.fetchOrder.mockReset();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
  afterEach(() => vi.useRealTimers());

  it('shows the tracker with the stored step as the only current step', async () => {
    api.fetchOrder.mockResolvedValue(makeOrder('o1', 'preparing'));
    renderAt('/orders/o1');
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByRole('heading', { name: 'Order #o1' })).toBeInTheDocument();
    expect(screen.getByText('Preparing')).toHaveAttribute('aria-current', 'step');
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
  });

  it('moves the current step when staff move the order, without reopening the screen', async () => {
    api.fetchOrder
      .mockResolvedValueOnce(makeOrder('o1', 'accepted'))
      .mockResolvedValueOnce(makeOrder('o1', 'preparing'));
    renderAt('/orders/o1');
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText('Accepted')).toHaveAttribute('aria-current', 'step');
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(screen.getByText('Preparing')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Accepted')).not.toHaveAttribute('aria-current');
  });

  it('reads Ready as Out for delivery for a delivery order', async () => {
    api.fetchOrder.mockResolvedValue(makeOrder('o1', 'ready', 'delivery'));
    renderAt('/orders/o1');
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText('Out for delivery')).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByText('Ready')).toBeNull();
  });

  it('reserves the tracker space while loading', () => {
    api.fetchOrder.mockReturnValue(new Promise(() => {}));
    const { container } = renderAt('/orders/o1');
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });

  it('shows an error with Try again when the first fetch fails', async () => {
    api.fetchOrder.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(makeOrder('o1', 'placed'));
    renderAt('/orders/o1');
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByRole('alert')).toHaveTextContent('We could not load the latest status');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(api.fetchOrder).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Placed')).toHaveAttribute('aria-current', 'step');
  });

  it('shows the not-found wording for an unknown order', async () => {
    const { OrderNotFoundError } = await import('../api/orders');
    api.fetchOrder.mockRejectedValue(new OrderNotFoundError());
    renderAt('/orders/nope');
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByRole('alert')).toHaveTextContent('We could not find this order');
  });

  it('shows the new order step, not the previous order, when the order changes', async () => {
    api.fetchOrder.mockImplementation((id: string) =>
      Promise.resolve(makeOrder(id, id === 'o1' ? 'placed' : 'ready')),
    );
    sessionStorage.setItem('selectedOrderId', 'o2');
    renderAt('/orders/o1');
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText('Placed')).toHaveAttribute('aria-current', 'step');
    // The Orders entry moves from o1 to the selected o2 within the same page.
    fireEvent.click(screen.getByRole('link', { name: 'Orders' }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByRole('heading', { name: 'Order #o2' })).toBeInTheDocument();
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(screen.getByText('Ready', { selector: 'li' })).toHaveAttribute('aria-current', 'step');
  });

  it('uses no push channel while polling', async () => {
    const notification = vi.fn();
    vi.stubGlobal('Notification', notification);
    const eventSource = vi.fn();
    vi.stubGlobal('EventSource', eventSource);
    api.fetchOrder.mockResolvedValue(makeOrder('o1', 'placed'));
    renderAt('/orders/o1');
    await act(() => vi.advanceTimersByTimeAsync(10000));
    expect(notification).not.toHaveBeenCalled();
    expect(eventSource).not.toHaveBeenCalled();
    expect('serviceWorker' in navigator).toBe(false);
    vi.unstubAllGlobals();
  });
});

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeOrder } from './orderFixtures';
import { useOrderStatus } from './useOrderStatus';

const fetchOrder = vi.hoisted(() => vi.fn());
vi.mock('../api/orders', () => ({
  fetchOrder,
  OrderNotFoundError: class OrderNotFoundError extends Error {},
}));

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
}

describe('useOrderStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchOrder.mockReset();
    setHidden(false);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads, then re-fetches every interval', async () => {
    fetchOrder
      .mockResolvedValueOnce(makeOrder('o1', 'accepted'))
      .mockResolvedValueOnce(makeOrder('o1', 'preparing'));
    const { result } = renderHook(() => useOrderStatus('o1'));
    expect(result.current.state).toBe('loading');
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.state).toBe('ready');
    expect(result.current.order?.status).toBe('accepted');
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(result.current.order?.status).toBe('preparing');
  });

  it('stops polling after completed', async () => {
    fetchOrder.mockResolvedValue(makeOrder('o1', 'completed'));
    renderHook(() => useOrderStatus('o1'));
    await act(() => vi.advanceTimersByTimeAsync(20000));
    expect(fetchOrder).toHaveBeenCalledTimes(1);
  });

  it('skips ticks while the document is hidden', async () => {
    fetchOrder.mockResolvedValue(makeOrder('o1', 'placed'));
    renderHook(() => useOrderStatus('o1'));
    await act(() => vi.advanceTimersByTimeAsync(0));
    setHidden(true);
    await act(() => vi.advanceTimersByTimeAsync(15000));
    expect(fetchOrder).toHaveBeenCalledTimes(1);
    setHidden(false);
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(fetchOrder).toHaveBeenCalledTimes(2);
  });

  it('keeps the last order when a refresh fails', async () => {
    fetchOrder.mockResolvedValueOnce(makeOrder('o1', 'accepted')).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useOrderStatus('o1'));
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(result.current.state).toBe('ready');
    expect(result.current.order?.status).toBe('accepted');
  });

  it('reports an error when the first fetch fails, and retry fetches again', async () => {
    fetchOrder.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(makeOrder('o1', 'placed'));
    const { result } = renderHook(() => useOrderStatus('o1'));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.state).toBe('error');
    act(() => result.current.retry());
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.state).toBe('ready');
  });

  it('aborts the first order request when the order id changes', async () => {
    const signals: AbortSignal[] = [];
    fetchOrder.mockImplementation((id: string, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise((resolve) => setTimeout(() => resolve(makeOrder(id, id === 'o1' ? 'placed' : 'ready')), id === 'o1' ? 1000 : 10));
    });
    const { result, rerender } = renderHook(({ id }) => useOrderStatus(id), { initialProps: { id: 'o1' } });
    rerender({ id: 'o2' });
    expect(signals[0].aborted).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(result.current.order?.id).toBe('o2');
    expect(result.current.order?.status).toBe('ready');
  });

  it('stops polling on unmount', async () => {
    fetchOrder.mockResolvedValue(makeOrder('o1', 'placed'));
    const { unmount } = renderHook(() => useOrderStatus('o1'));
    await act(() => vi.advanceTimersByTimeAsync(0));
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(20000));
    expect(fetchOrder).toHaveBeenCalledTimes(1);
  });
});

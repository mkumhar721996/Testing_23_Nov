import { useCallback, useEffect, useState } from 'react';
import { OrderNotFoundError, fetchOrder } from '../api/orders';
import type { OrderStatusView } from './types';

type Snapshot = { orderId: string; order: OrderStatusView | null; failed: boolean; notFound: boolean };

// Polls the Operations API so the tracker follows the order without a reload (no push channel is used).
export function useOrderStatus(orderId: string, intervalMs = 5000) {
  const [snapshot, setSnapshot] = useState<Snapshot>({ orderId, order: null, failed: false, notFound: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastOrder: OrderStatusView | null = null;

    setSnapshot({ orderId, order: null, failed: false, notFound: false });

    const schedule = () => {
      timer = setTimeout(tick, intervalMs);
    };

    const tick = async () => {
      if (document.hidden) return schedule();
      try {
        const order = await fetchOrder(orderId, controller.signal);
        if (controller.signal.aborted) return;
        lastOrder = order;
        setSnapshot({ orderId, order, failed: false, notFound: false });
        if (order.status === 'completed') return;
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof OrderNotFoundError) {
          setSnapshot({ orderId, order: null, failed: true, notFound: true });
          return;
        }
        if (!lastOrder) setSnapshot({ orderId, order: null, failed: true, notFound: false });
      }
      schedule();
    };

    void tick();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [orderId, intervalMs, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // A snapshot of another order (the id has just changed) is never shown.
  const current = snapshot.orderId === orderId ? snapshot : null;
  const order = current?.order ?? null;
  const state: 'loading' | 'ready' | 'error' = order ? 'ready' : current?.failed ? 'error' : 'loading';
  return { state, order, notFound: current?.notFound ?? false, retry };
}

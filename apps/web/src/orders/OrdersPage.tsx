import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchOrders } from '../api/orders';
import { formatDay } from './format';
import { useSelectedOrder } from './SelectedOrderContext';
import type { OrderStatusView } from './types';

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; orders: OrderStatusView[] };

export default function OrdersPage() {
  const { selectOrder } = useSelectedOrder();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });
    fetchOrders(controller.signal)
      .then((orders) => setState({ kind: 'ready', orders }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ kind: 'error' });
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return (
    <div className="page" data-layout="table">
      <header className="page-header">
        <h1 className="page-title">Your orders</h1>
      </header>
      <div className="page-body stack">
        {state.kind === 'loading' && (
          <div aria-busy="true">
            <div className="card card-flush">
              <div className="list-row">
                <span className="skeleton" style={{ width: '60%' }} />
              </div>
              <div className="list-row">
                <span className="skeleton" style={{ width: '50%' }} />
              </div>
              <div className="list-row">
                <span className="skeleton" style={{ width: '70%' }} />
              </div>
            </div>
          </div>
        )}
        {state.kind === 'error' && (
          <div className="alert alert-danger stack" role="alert">
            <span>We could not load your orders. Check your connection and try again.</span>
            <button type="button" className="btn" onClick={retry}>
              Try again
            </button>
          </div>
        )}
        {state.kind === 'ready' && state.orders.length === 0 && (
          <div className="empty-state card">
            <h2 style={{ fontSize: 'var(--font-size-xl)' }}>You have no orders yet</h2>
            <p>Orders you place show up here, so you can track them.</p>
          </div>
        )}
        {state.kind === 'ready' && state.orders.length > 0 && (
          <div className="card card-flush">
            {state.orders.map((order) => (
              <div className="list-row order-row" key={order.id}>
                <div className="info">
                  <strong>{order.restaurantName}</strong>
                  <span className="meta">{formatDay(order.placedAt)}</span>
                </div>
                <div className="side">
                  <span className="badge badge-primary">
                    {order.steps.find((s) => s.key === order.status)?.label}
                  </span>
                  <Link className="btn" to={`/orders/${order.id}`} onClick={() => selectOrder(order.id)}>
                    Track order
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { Link, useParams } from 'react-router-dom';
import { StatusTracker } from './StatusTracker';
import { formatPlaced } from './format';
import type { OrderStatusView } from './types';
import { useOrderStatus } from './useOrderStatus';

function statusSentence(order: OrderStatusView): string {
  const restaurant = order.restaurantName;
  switch (order.status) {
    case 'placed':
      return `We have sent your order to ${restaurant}.`;
    case 'accepted':
      return `${restaurant} has accepted your order.`;
    case 'preparing':
      return `${restaurant} is preparing your order.`;
    case 'ready':
      return order.fulfilment === 'delivery' ? 'Your order is out for delivery.' : 'Your order is ready to collect.';
    case 'completed':
      return 'Your order is complete.';
  }
}

function Loading() {
  return (
    <div className="stack" aria-busy="true">
      <div className="card stack">
        <span className="skeleton" style={{ width: '30%' }} />
        <span className="skeleton" style={{ width: '100%' }} />
        <span className="skeleton" style={{ width: '60%' }} />
      </div>
      <div className="card stack">
        <span className="skeleton" style={{ width: '40%' }} />
        <span className="skeleton" style={{ width: '70%' }} />
      </div>
    </div>
  );
}

export default function OrderStatusPage() {
  const { orderId = '' } = useParams();
  const { state, order, notFound, retry } = useOrderStatus(orderId);

  return (
    <div className="page" data-layout="form">
      <header className="page-header">
        <div>
          <h1 className="page-title">Order #{orderId}</h1>
          {order && (
            <p className="meta">
              From {order.restaurantName} · Placed {formatPlaced(order.placedAt)}
            </p>
          )}
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" to="/orders">
            Your orders
          </Link>
        </div>
      </header>
      <div className="page-body stack">
        {state === 'loading' && <Loading />}
        {state === 'error' && (
          <div className="alert alert-danger stack" role="alert">
            {notFound ? (
              <>
                <span>We could not find this order. Check your orders for the one you are looking for.</span>
                <Link className="btn" to="/orders">
                  Your orders
                </Link>
              </>
            ) : (
              <>
                <span>
                  We could not load the latest status of order #{orderId}. Your order is not affected. Check your
                  connection and try again.
                </span>
                <button type="button" className="btn" onClick={retry}>
                  Try again
                </button>
              </>
            )}
          </div>
        )}
        {state === 'ready' && order && (
          <div className="card">
            <h2 className="card-header" style={{ fontSize: 'var(--font-size-xl)' }}>
              Order status
            </h2>
            <StatusTracker steps={order.steps} status={order.status} />
            <p style={{ marginTop: 'var(--density-gap)' }}>{statusSentence(order)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

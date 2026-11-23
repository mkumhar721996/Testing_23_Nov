import { useCallback, useEffect, useRef, useState } from 'react';
import { cancelOrder, getOrder, type Order, type OrderStatus } from './orders-api';
import './order-status.css';

const STEPS: { id: OrderStatus; label: string }[] = [
  { id: 'placed', label: 'Placed' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
  { id: 'completed', label: 'Completed' },
];

const STATUS_TEXT: Partial<Record<OrderStatus, (restaurant: string) => string>> = {
  placed: (r) => `We have sent your order to ${r}. You can cancel until the restaurant accepts it.`,
  accepted: (r) => `${r} has accepted your order.`,
  preparing: (r) => `${r} is preparing your order.`,
  ready: (r) => `Your order from ${r} is ready.`,
  completed: () => 'Your order is complete.',
};

type Load = { state: 'loading' } | { state: 'error' } | { state: 'loaded'; order: Order };

export default function OrderStatusPage({ orderId }: { orderId: string }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [confirming, setConfirming] = useState(false);
  const [raced, setRaced] = useState(false);
  const [cancelFailed, setCancelFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const fetchOrder = useCallback(() => {
    setLoad({ state: 'loading' });
    getOrder(orderId).then(
      (order) => setLoad({ state: 'loaded', order }),
      () => setLoad({ state: 'error' }),
    );
  }, [orderId]);

  useEffect(fetchOrder, [fetchOrder]);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);

  const keepOrder = () => {
    setConfirming(false);
    setCancelFailed(false);
    // The button is re-created when the confirm closes, so focus it after that render.
    setTimeout(() => cancelButtonRef.current?.focus());
  };

  const confirmCancellation = async (order: Order) => {
    setBusy(true);
    setCancelFailed(false);
    try {
      const result = await cancelOrder(order.id);
      if (result.kind === 'cancelled') {
        setLoad({ state: 'loaded', order: { ...order, status: 'cancelled', canCancel: false } });
      } else {
        setRaced(true);
        setLoad({ state: 'loaded', order: await getOrder(order.id) });
      }
      setConfirming(false);
    } catch {
      setCancelFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const heading = (
    <header className="page-header">
      <div>
        <h1 className="page-title">Order #{orderId}</h1>
        {load.state === 'loaded' && (
          <p className="meta">
            From {load.order.restaurant} · Placed{' '}
            {new Date(load.order.placedAt).toLocaleString(undefined, {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </header>
  );

  if (load.state === 'loading') {
    return (
      <div className="page">
        {heading}
        <div className="page-body stack" aria-busy="true">
          <div className="card stack">
            <span className="skeleton" style={{ width: '30%' }} />
            <span className="skeleton" />
            <span className="skeleton" style={{ width: '70%' }} />
          </div>
          <div className="card stack">
            <span className="skeleton" style={{ width: '20%' }} />
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (load.state === 'error') {
    return (
      <div className="page">
        {heading}
        <div className="page-body stack">
          <div className="alert alert-danger" role="alert">
            <span>
              We could not load the latest status of order #{orderId}. Your order is not affected.
              Check your connection and try again.
            </span>
          </div>
          <div className="cluster">
            <button className="btn" onClick={fetchOrder}>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { order } = load;
  const total = money(order.total, order.currency);
  const stepIndex = STEPS.findIndex((s) => s.id === order.status);

  const itemsCard = (
    <div className="card">
      <h2 className="card-header" style={{ fontSize: 'var(--font-size-xl)' }}>
        Items
      </h2>
      {order.items.map((item) => (
        <div className="line" key={item.name}>
          <span>
            {item.name} × {item.quantity}
          </span>
          <span>{money(item.price * item.quantity, order.currency)}</span>
        </div>
      ))}
      <div className="line">
        <strong>Total charged</strong>
        <strong>{total}</strong>
      </div>
    </div>
  );

  let body;
  if (order.status === 'cancelled') {
    body = (
      <div className="empty-state card" role="status">
        <span className="badge badge-danger">Cancelled</span>
        <h2 style={{ fontSize: 'var(--font-size-xl)' }}>Order cancelled</h2>
        <p>A full refund of {total} has been started to your card.</p>
      </div>
    );
  } else if (order.status === 'rejected') {
    body = (
      <div className="card">
        <h2 className="card-header" style={{ fontSize: 'var(--font-size-xl)' }}>
          Order rejected <span className="badge badge-danger">Rejected</span>
        </h2>
        <p>{order.restaurant} could not accept this order.</p>
      </div>
    );
  } else if (confirming) {
    body = (
      <>
        <div className="alert alert-warning" role="alert" tabIndex={-1} ref={confirmRef}>
          <span>
            You can cancel until the restaurant accepts. Your order is not yet accepted, so
            cancelling refunds the full {total} to your card.
          </span>
        </div>
        {cancelFailed && (
          <div className="alert alert-danger" role="alert">
            <span>
              We could not cancel your order. Your order is not affected. Check your connection and
              try again.
            </span>
          </div>
        )}
        <div className="cluster" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={keepOrder} disabled={busy}>
            Keep order
          </button>
          <button
            className="btn btn-danger"
            onClick={() => confirmCancellation(order)}
            disabled={busy}
          >
            Confirm cancellation
          </button>
        </div>
      </>
    );
  } else {
    body = (
      <>
        {raced && (
          <div className="alert alert-warning" role="alert">
            <span>
              This order can no longer be cancelled because the restaurant has accepted it.
            </span>
          </div>
        )}
        <div className="card">
          <h2 className="card-header" style={{ fontSize: 'var(--font-size-xl)' }}>
            Order status
          </h2>
          <ol className="stepper" aria-label="Order progress">
            {STEPS.map((step, i) => (
              <li
                key={step.id}
                className={i < stepIndex ? 'step is-done' : 'step'}
                aria-current={i === stepIndex ? 'step' : undefined}
              >
                {step.label}
              </li>
            ))}
          </ol>
          <div
            className="progress"
            style={{ ['--progress' as string]: `${Math.round(((stepIndex + 1) / STEPS.length) * 100)}%` }}
            role="progressbar"
            aria-label="Order progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(((stepIndex + 1) / STEPS.length) * 100)}
          >
            <span />
          </div>
          <p style={{ marginTop: 'var(--density-gap)' }}>
            {STATUS_TEXT[order.status]?.(order.restaurant)}
          </p>
          {!order.canCancel && order.status !== 'placed' && (
            <p className="meta">
              Cancelling is no longer possible because the restaurant has accepted your order.
            </p>
          )}
        </div>
        {itemsCard}
        {order.canCancel && (
          <div className="cluster" style={{ justifyContent: 'flex-end' }}>
            <button
              className="btn"
              ref={cancelButtonRef}
              onClick={() => {
                setRaced(false);
                setConfirming(true);
              }}
            >
              Cancel order
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="page">
      {heading}
      <div className="page-body stack">{body}</div>
    </div>
  );
}

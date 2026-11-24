import type { OrderStatus, OrderSummary } from './types';

export type OrderActionId = 'track' | 'reorder';

const STATUS_BADGE: Record<OrderStatus, { label: string; className: string }> = {
  placed: { label: 'Placed', className: 'badge-primary' },
  accepted: { label: 'Accepted', className: 'badge-primary' },
  preparing: { label: 'Preparing', className: 'badge-primary' },
  ready: { label: 'Ready', className: 'badge-primary' },
  completed: { label: 'Completed', className: 'badge-success' },
  rejected: { label: 'Rejected', className: 'badge-danger' },
  cancelled: { label: 'Cancelled', className: 'badge-danger' },
};

const ACTION_LABEL: Record<OrderActionId, string> = {
  track: 'Track order',
  reorder: 'Reorder',
};

interface OrderRowProps {
  order: OrderSummary;
  action: OrderActionId;
  busy?: boolean;
  onAction: (actionId: OrderActionId, orderId: string) => void;
}

function describe(order: OrderSummary): string {
  const date = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(
    new Date(order.placedAt),
  );
  const total = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: order.currency,
  }).format(order.totalMinor / 100);
  const items = `${order.itemCount} ${order.itemCount === 1 ? 'item' : 'items'}`;
  return `${date} · ${items} · ${total}`;
}

export function OrderRow({ order, action, busy = false, onAction }: OrderRowProps) {
  const badge = STATUS_BADGE[order.status];
  return (
    <div className="list-row order-row">
      <div className="info">
        <strong>{order.restaurantName}</strong>
        <span className="meta">{describe(order)}</span>
      </div>
      <div className="side">
        <span className={`badge ${badge.className}`}>{badge.label}</span>
        <button
          type="button"
          className="btn"
          disabled={busy}
          aria-busy={busy || undefined}
          onClick={() => onAction(action, order.id)}
        >
          {ACTION_LABEL[action]}
        </button>
      </div>
    </div>
  );
}

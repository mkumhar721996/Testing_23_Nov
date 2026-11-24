import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { fetchOrders, reorder } from './api';
import { OrderRow, type OrderActionId } from './OrderRow';
import type { OrderLists } from './types';

export interface PastOrdersPageProps {
  onTrackOrder(orderId: string): void;
  onOpenCart(): void;
  onBrowseRestaurants(): void;
}

type TabId = 'active' | 'past';
type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; lists: OrderLists };

const TABS: { id: TabId; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'past', label: 'Past' },
];

const tabDomId = (id: TabId) => `orders-tab-${id}`;

export function PastOrdersPage({ onTrackOrder, onOpenCart, onBrowseRestaurants }: PastOrdersPageProps) {
  const [tab, setTab] = useState<TabId>('active');
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [reorderFailed, setReorderFailed] = useState(false);

  const refetch = useCallback(() => {
    setLoad({ state: 'loading' });
    fetchOrders().then(
      (lists) => setLoad({ state: 'ready', lists }),
      () => setLoad({ state: 'error' }),
    );
  }, []);

  useEffect(refetch, [refetch]);

  const handleAction = async (actionId: OrderActionId, orderId: string) => {
    if (actionId === 'track') {
      onTrackOrder(orderId);
      return;
    }
    setReorderFailed(false);
    setReorderingId(orderId);
    try {
      await reorder(orderId);
    } catch {
      setReorderFailed(true);
      setReorderingId(null);
      return;
    }
    setReorderingId(null);
    onOpenCart();
  };

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const step = e.key === 'ArrowRight' ? 1 : -1;
    const index = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(index + step + TABS.length) % TABS.length];
    setTab(next.id);
    document.getElementById(tabDomId(next.id))?.focus();
  };

  const renderBody = () => {
    if (load.state === 'loading') {
      return (
        <div aria-busy="true">
          <div className="card card-flush">
            {['60%', '50%', '70%'].map((width) => (
              <div className="list-row" key={width}>
                <span className="skeleton" style={{ width }} />
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (load.state === 'error') {
      return (
        <div className="stack">
          <div className="alert alert-danger" role="alert">
            <span>
              We could not load your orders. Nothing has changed on your orders. Try again in a
              moment.
            </span>
          </div>
          <div className="cluster">
            <button type="button" className="btn" onClick={refetch}>
              Try again
            </button>
          </div>
        </div>
      );
    }
    const { active, past } = load.lists;
    if (active.length === 0 && past.length === 0) {
      return (
        <div className="empty-state card">
          <h2 style={{ fontSize: 'var(--font-size-xl)' }}>You have no orders yet</h2>
          <p>Orders you place show up here, so you can track them and order again.</p>
          <button type="button" className="btn btn-primary" onClick={onBrowseRestaurants}>
            Browse restaurants
          </button>
        </div>
      );
    }
    const shown = tab === 'active' ? active : past;
    return (
      <div role="tabpanel" aria-labelledby={tabDomId(tab)} className="stack">
        {reorderFailed && (
          <div className="alert alert-danger" role="alert">
            <span>
              We could not add this order to your cart. Your cart is unchanged. Try again in a
              moment.
            </span>
          </div>
        )}
        {shown.length === 0 ? (
          <div className="empty-state card">
            <p>{tab === 'active' ? 'No active orders right now' : 'No past orders yet'}</p>
          </div>
        ) : (
          <div className="card card-flush">
            {shown.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                action={tab === 'active' ? 'track' : 'reorder'}
                busy={reorderingId === order.id}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Your orders</h1>
      </header>
      <div className="page-body stack">
        <div className="tabs" role="tablist" aria-label="Order lists">
          {TABS.map((t) => (
            <button
              key={t.id}
              id={tabDomId(t.id)}
              type="button"
              role="tab"
              className="tab"
              aria-selected={tab === t.id}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={onTabKeyDown}
            >
              {t.label}
            </button>
          ))}
        </div>
        {renderBody()}
      </div>
    </div>
  );
}

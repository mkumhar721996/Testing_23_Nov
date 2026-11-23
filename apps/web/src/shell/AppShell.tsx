import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useSelectedOrder } from '../orders/SelectedOrderContext';

export default function AppShell() {
  const { selectedOrderId } = useSelectedOrder();
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const ordersTarget = selectedOrderId ? `/orders/${encodeURIComponent(selectedOrderId)}` : '/orders';

  return (
    <div className="app-shell">
      <nav id="app-nav" className={navOpen ? 'app-nav is-open' : 'app-nav'} aria-label="Main">
        <span className="app-brand">
          <span className="app-brand-mark" aria-hidden="true">
            P
          </span>
          <span>Product</span>
        </span>
        <Link
          className="app-nav-item"
          to={ordersTarget}
          aria-current={pathname.startsWith('/orders') ? 'page' : undefined}
          onClick={() => setNavOpen(false)}
        >
          <svg className="icon" aria-hidden="true">
            <use href="/icons.svg#i-clock" />
          </svg>
          <span className="app-nav-label">Orders</span>
        </Link>
      </nav>
      <div className="app-main">
        <header className="app-header">
          <button
            type="button"
            className="btn btn-ghost app-menu"
            aria-controls="app-nav"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            Menu
          </button>
          <div className="app-header-spacer" />
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

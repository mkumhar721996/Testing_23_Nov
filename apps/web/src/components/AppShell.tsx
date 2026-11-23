import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { Icon } from './Icon';

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <div className="app-shell" data-shell="sidebar">
      <nav id="app-nav" className="app-nav" aria-label="Main" data-open={navOpen}>
        <Link className="app-brand" to="/">
          <span className="app-brand-mark" aria-hidden="true">
            P
          </span>
          <span>Product</span>
        </Link>
        <NavLink className="app-nav-item" to="/restaurants" onClick={() => setNavOpen(false)}>
          <Icon name="store" />
          <span className="app-nav-label">Restaurants</span>
        </NavLink>
      </nav>
      <div className="app-main">
        <header className="app-header">
          <button
            className="btn btn-ghost btn-icon app-menu"
            type="button"
            aria-controls="app-nav"
            aria-expanded={navOpen}
            aria-label="Menu"
            onClick={() => setNavOpen((open) => !open)}
          >
            Menu
          </button>
        </header>
        <main className="app-content">{children}</main>
        <footer className="app-footer">Product name · Help · Privacy</footer>
      </div>
    </div>
  );
}

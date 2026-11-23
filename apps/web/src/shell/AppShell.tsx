import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import spriteMarkup from '../../design/icons.svg?raw';
import { initials, useMe } from '../onboarding/status';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'home', to: null },
  { id: 'boards', label: 'Boards', icon: 'kanban', to: '/onboarding' },
  { id: 'my-tasks', label: 'My tasks', icon: 'check', to: null },
  { id: 'settings', label: 'Settings', icon: 'sliders', to: null },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const me = useMe();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app-shell" data-shell="sidebar">
      <div aria-hidden="true" style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: spriteMarkup }} />
      <nav id="app-nav" className="app-nav" aria-label="Main" hidden={!navOpen}>
        <Link className="app-brand" to="/onboarding">
          <span className="app-brand-mark" aria-hidden="true">P</span>
          <span>Product</span>
        </Link>
        {NAV_ITEMS.map((item) => {
          const content = (
            <>
              <svg className="icon" aria-hidden="true"><use href={`#i-${item.icon}`} /></svg>
              <span className="app-nav-label">{item.label}</span>
            </>
          );
          return item.to ? (
            <NavLink key={item.id} className="app-nav-item" to={item.to} data-nav-key={item.id}>
              {content}
            </NavLink>
          ) : (
            <a key={item.id} className="app-nav-item" aria-disabled="true" data-nav-key={item.id}>
              {content}
            </a>
          );
        })}
      </nav>
      <div className="app-main">
        <header className="app-header">
          <button
            className="btn btn-ghost app-menu"
            type="button"
            aria-controls="app-nav"
            aria-expanded={navOpen}
            aria-label="Menu"
            onClick={() => setNavOpen((open) => !open)}
          >
            Menu
          </button>
          <div className="app-header-spacer" />
          <span className="avatar" role="img" aria-label={me.displayName}>{initials(me.displayName)}</span>
        </header>
        <main className="app-content">{children}</main>
        <footer className="app-footer">Product name · Help · Privacy</footer>
      </div>
    </div>
  );
}

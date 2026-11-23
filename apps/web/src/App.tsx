import { useState } from 'react';
import iconsUrl from '../design/icons.svg';
import OrganizationsPage from './organizations/OrganizationsPage';

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

// "Settings" is the nearest nav home for Organizations: the shell has no Organizations entry.
const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: 'home' },
  { id: 'boards', label: 'Boards', icon: 'kanban' },
  { id: 'my-tasks', label: 'My tasks', icon: 'check' },
  { id: 'settings', label: 'Settings', icon: 'sliders' },
];
const CURRENT_NAV_ID = 'settings';

function Icon({ name }: { name: string }) {
  return (
    <svg className="icon" aria-hidden="true">
      <use href={`${iconsUrl}#i-${name}`} />
    </svg>
  );
}

export default function App() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app-shell" data-shell="sidebar">
      <nav id="app-nav" className="app-nav" aria-label="Main" hidden={!navOpen}>
        <a className="app-brand" href="/">
          <span className="app-brand-mark" aria-hidden="true">
            P
          </span>
          <span>Product</span>
        </a>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            className="app-nav-item"
            href="/"
            aria-current={item.id === CURRENT_NAV_ID ? 'page' : undefined}
          >
            <Icon name={item.icon} />
            <span className="app-nav-label">{item.label}</span>
          </a>
        ))}
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
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Search">
            <Icon name="search" />
          </button>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Alerts">
            <Icon name="bell" />
          </button>
        </header>
        <main className="app-content">
          <OrganizationsPage />
        </main>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

const NAV: { id: string; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Overview', icon: 'home' },
  { id: 'boards', label: 'Boards', icon: 'kanban' },
  { id: 'my-tasks', label: 'My tasks', icon: 'check' },
  { id: 'settings', label: 'Settings', icon: 'sliders' },
];

/** The design's sidebar shell. Below 820px the navigation sits behind the Menu button. */
export function AppShell({ current, children }: { current: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell" data-shell="sidebar">
      <nav id="app-nav" className="app-nav" aria-label="Main" hidden={!open}>
        <a className="app-brand" href="#">
          <span className="app-brand-mark" aria-hidden="true">
            P
          </span>
          <span>Product</span>
        </a>
        {NAV.map((item) => (
          <a
            key={item.id}
            className="app-nav-item"
            href="#"
            aria-current={item.id === current ? 'page' : undefined}
            onClick={() => setOpen(false)}
          >
            <Icon name={item.icon} />
            <span className="app-nav-label">{item.label}</span>
          </a>
        ))}
      </nav>
      <div className="app-main">
        <header className="app-header">
          <button
            className="btn btn-ghost app-menu"
            type="button"
            aria-controls="app-nav"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            Menu
          </button>
          <div className="app-header-spacer" />
          <button className="btn btn-ghost btn-icon" type="button" aria-label="Search">
            <Icon name="search" />
          </button>
          <button className="btn btn-ghost btn-icon" type="button" aria-label="Alerts">
            <Icon name="bell" />
          </button>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { ComingSoon } from './ComingSoon';

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

function UserMenu({ customerName }: { customerName?: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    };
    const onPointerDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  return (
    <div className="dropdown user-menu" ref={root}>
      <button
        type="button"
        ref={trigger}
        className="btn btn-ghost user-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {customerName && (
          <span className="avatar" aria-hidden="true">
            {initials(customerName)}
          </span>
        )}
        <span>{customerName ?? 'Account'}</span>
      </button>
      <div className="dropdown-menu" role="menu" hidden={!open}>
        <ComingSoon variant="menu">Profile</ComingSoon>
        <button type="button" className="dropdown-item" role="menuitem">
          Sign out
        </button>
      </div>
    </div>
  );
}

export function TopBar({ customerName }: { customerName?: string }) {
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <strong className="brand">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          SBI Bank
        </strong>
        <nav className="main-nav" aria-label="Main">
          <a className="nav-link" href="/" aria-current="page">
            Overview
          </a>
          <ComingSoon variant="nav">Accounts</ComingSoon>
          <ComingSoon variant="nav">Transactions</ComingSoon>
          <ComingSoon variant="nav">Payments</ComingSoon>
          <ComingSoon variant="nav">Settings</ComingSoon>
        </nav>
        <UserMenu customerName={customerName} />
      </div>
    </header>
  );
}

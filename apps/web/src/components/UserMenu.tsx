import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { signOut } from '../auth/session';
import type { SessionUser } from '../auth/session';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export default function UserMenu({
  user,
  onComingSoon,
  onError,
}: {
  user: SessionUser | null;
  onComingSoon: (featureName: string) => void;
  onError?: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onMouseDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []);
    if (items.length === 0) return;
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const at = items.indexOf(document.activeElement as HTMLElement);
    items[(at + step + items.length) % items.length].focus();
  };

  const onProfile = () => {
    setOpen(false);
    onComingSoon('Profile');
  };

  const onLogOut = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      setOpen(false);
    } catch {
      onError?.('Could not log out. Try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="dropdown" ref={wrapper} onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        className="btn btn-ghost user-btn"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user ? `Account menu for ${user.name}` : 'Account menu'}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="avatar" aria-hidden="true">
          {user ? initials(user.name) : ''}
        </span>
        {user && (
          <span className="user-text">
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </span>
        )}
      </button>
      {open && (
        <div className="dropdown-menu menu-end" role="menu" aria-label="Account" ref={menu}>
          {user && (
            <div className="menu-head">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          )}
          <button className="dropdown-item" type="button" role="menuitem" onClick={onProfile}>
            <svg className="icon" aria-hidden="true">
              <use href="#i-user" />
            </svg>{' '}
            Profile
          </button>
          <button className="dropdown-item" type="button" role="menuitem" disabled={loggingOut} onClick={onLogOut}>
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  );
}

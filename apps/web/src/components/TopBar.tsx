import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getCurrentUser } from '../auth/session';
import UserMenu from './UserMenu';

type TopBarProps = {
  onSearch: (term: string) => void;
  searching: boolean;
  clearSignal?: number;
  onComingSoon: (featureName: string) => void;
  onError?: (message: string) => void;
};

export default function TopBar({ onSearch, searching, clearSignal, onComingSoon, onError }: TopBarProps) {
  const [term, setTerm] = useState('');
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTerm('');
    setInvalid(false);
  }, [clearSignal]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = term.trim();
    if (trimmed === '') {
      setInvalid(true);
      input.current?.focus();
      return;
    }
    setInvalid(false);
    onSearch(trimmed);
  }

  return (
    <header className="top-bar">
      <button className="btn btn-ghost btn-icon" type="button" aria-label="Menu" title="Menu">
        <svg className="icon" aria-hidden="true">
          <use href="#i-menu" />
        </svg>
      </button>
      <span className="brand">
        <span className="brand-mark" aria-hidden="true">
          P
        </span>
        <span>Product</span>
      </span>
      <form className="search-form" role="search" data-component="TopBar" onSubmit={submit} noValidate>
        <div className="field search-field">
          <svg className="icon" aria-hidden="true">
            <use href="#i-search" />
          </svg>
          <input
            ref={input}
            className={`input${invalid ? ' is-invalid' : ''}`}
            type="search"
            name="q"
            aria-label="Search trips and bookings"
            placeholder="Search trips and bookings"
            autoComplete="off"
            value={term}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? 'search-error' : undefined}
            onChange={(event) => {
              setTerm(event.target.value);
              setInvalid(false);
            }}
          />
          {invalid && (
            <span className="field-error" id="search-error" role="alert">
              Enter part of a trip or booking name to search.
            </span>
          )}
        </div>
        <button className="btn btn-primary" type="submit" disabled={searching}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>
      <div className="top-bar-spacer" />
      <div className="top-actions">
        <button
          className="btn btn-ghost btn-icon"
          type="button"
          aria-label="Notifications"
          title="Notifications"
          onClick={() => onComingSoon('Notifications')}
        >
          <svg className="icon" aria-hidden="true">
            <use href="#i-bell" />
          </svg>
        </button>
        <UserMenu user={getCurrentUser()} onComingSoon={onComingSoon} onError={onError} />
      </div>
    </header>
  );
}

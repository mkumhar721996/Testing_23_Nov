import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Period } from './types';

const OPTIONS: { id: Period; label: string }[] = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];

type Props = { label: string; value: Period; onChange: (period: Period) => void };

export default function PeriodFilter({ label, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    items.current[OPTIONS.findIndex((o) => o.id === value)]?.focus();
    const onPointerDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, value]);

  const close = (focusTrigger: boolean) => {
    setOpen(false);
    if (focusTrigger) trigger.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close(true);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const at = items.current.findIndex((el) => el === document.activeElement);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      items.current[(at + step + OPTIONS.length) % OPTIONS.length]?.focus();
    }
  };

  const current = OPTIONS.find((o) => o.id === value)!;
  return (
    <div className="dropdown" ref={root} onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        className="btn btn-secondary"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
      >
        {current.label}
      </button>
      {open && (
        <div className="dropdown-menu" role="menu">
          {OPTIONS.map((option, i) => (
            <button
              key={option.id}
              ref={(el) => {
                items.current[i] = el;
              }}
              className="dropdown-item"
              type="button"
              role="menuitemradio"
              aria-checked={option.id === value}
              onClick={() => {
                onChange(option.id);
                close(true);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

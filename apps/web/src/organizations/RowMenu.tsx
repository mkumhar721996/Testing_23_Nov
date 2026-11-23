import { useEffect, useRef, useState } from 'react';

export interface RowMenuAction {
  id: string;
  label: string;
}

interface RowMenuProps {
  rowName: string;
  actions: RowMenuAction[];
  onSelect: (actionId: string) => void;
}

export default function RowMenu({ rowName, actions, onSelect }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="dropdown" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="btn btn-ghost btn-icon"
        aria-label={`Row menu for ${rowName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        ...
      </button>
      {open && (
        <div className="dropdown-menu org-row-menu" role="menu">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              className="dropdown-item"
              onClick={() => {
                setOpen(false);
                onSelect(action.id);
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

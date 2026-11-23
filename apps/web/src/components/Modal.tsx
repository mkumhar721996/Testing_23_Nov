import { useEffect, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

/** Dialog with a backdrop: traps focus, closes on Escape, and returns focus to whatever opened it. */
export function Modal({ titleId, onClose, children }: { titleId: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => trigger?.focus();
  }, []);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!items?.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div ref={ref} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown}>
        {children}
      </div>
    </>
  );
}

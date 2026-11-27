import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export const COMING_SOON_MESSAGE = 'This feature is coming soon.';

const ComingSoonContext = createContext<{ show: () => void } | null>(null);

export function useComingSoonDialog() {
  const value = useContext(ComingSoonContext);
  if (!value) throw new Error('useComingSoonDialog needs a ComingSoonProvider');
  return value;
}

export function ComingSoonProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  const show = useCallback(() => {
    opener.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    opener.current?.focus();
  }, []);
  const value = useMemo(() => ({ show }), [show]);

  useEffect(() => {
    if (open) closeButton.current?.focus();
  }, [open]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') close();
    // The dialog holds a single control, so Tab stays on it.
    if (event.key === 'Tab') {
      event.preventDefault();
      closeButton.current?.focus();
    }
  };

  return (
    <ComingSoonContext.Provider value={value}>
      {children}
      {open && (
        <>
          <div className="backdrop" data-backdrop onClick={close} />
          <div
            className="modal stack"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coming-soon-title"
            onKeyDown={onKeyDown}
          >
            <h2 id="coming-soon-title" className="section-title">
              {COMING_SOON_MESSAGE}
            </h2>
            <button ref={closeButton} type="button" className="btn btn-primary" onClick={close}>
              Back to dashboard
            </button>
          </div>
        </>
      )}
    </ComingSoonContext.Provider>
  );
}

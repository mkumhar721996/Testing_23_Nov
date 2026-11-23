import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'selectedOrderId';

type SelectedOrder = { selectedOrderId: string | null; selectOrder: (id: string) => void };

const SelectedOrderContext = createContext<SelectedOrder | null>(null);

export function SelectedOrderProvider({ children }: { children: ReactNode }) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(() =>
    sessionStorage.getItem(STORAGE_KEY),
  );
  const selectOrder = useCallback((id: string) => {
    sessionStorage.setItem(STORAGE_KEY, id);
    setSelectedOrderId(id);
  }, []);
  const value = useMemo(() => ({ selectedOrderId, selectOrder }), [selectedOrderId, selectOrder]);
  return <SelectedOrderContext.Provider value={value}>{children}</SelectedOrderContext.Provider>;
}

export function useSelectedOrder(): SelectedOrder {
  const ctx = useContext(SelectedOrderContext);
  if (!ctx) throw new Error('useSelectedOrder must be used inside SelectedOrderProvider');
  return ctx;
}

import { useCallback, useEffect, useState } from 'react';

const PARAM = 'org';

const readSelection = () => new URLSearchParams(window.location.search).get(PARAM);

// The selected organization is mirrored in the URL as ?org=<id> so a direct link opens its panel.
export function useSelectedOrganization(): [string | null, (id: string | null) => void] {
  const [selectedId, setSelectedId] = useState<string | null>(readSelection);

  useEffect(() => {
    const onPopState = () => setSelectedId(readSelection());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const select = useCallback((id: string | null) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set(PARAM, id);
    else url.searchParams.delete(PARAM);
    window.history.pushState({}, '', url);
    setSelectedId(id);
  }, []);

  return [selectedId, select];
}

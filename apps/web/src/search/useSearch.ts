import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchSearch } from './search-api';
import type { SearchResults } from './types';

type SearchState = {
  status: 'idle' | 'searching' | 'results' | 'no-results' | 'error';
  query: string;
  results: SearchResults | null;
};

const IDLE: SearchState = { status: 'idle', query: '', results: null };

export function useSearch() {
  const [state, setState] = useState<SearchState>(IDLE);
  const controller = useRef<AbortController | null>(null);
  const lastQuery = useRef('');

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback((q: string) => {
    const query = q.trim();
    lastQuery.current = query;
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setState({ status: 'searching', query, results: null });
    fetchSearch(query, next.signal)
      .then((results) => {
        const found = results.trips.length > 0 || results.bookings.length > 0;
        setState({ status: found ? 'results' : 'no-results', query, results });
      })
      .catch(() => {
        if (!next.signal.aborted) setState({ status: 'error', query, results: null });
      });
  }, []);

  const retry = useCallback(() => run(lastQuery.current), [run]);

  const clear = useCallback(() => {
    controller.current?.abort();
    setState(IDLE);
  }, []);

  return { ...state, run, retry, clear };
}

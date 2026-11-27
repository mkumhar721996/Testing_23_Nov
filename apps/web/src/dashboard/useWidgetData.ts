import { useCallback, useEffect, useState, type DependencyList } from 'react';

type State<T> = { status: 'loading' | 'ready' | 'empty' | 'error'; data: T[] };

// One instance per widget: each owns its own fetch, loading, error and retry.
export function useWidgetData<T>(load: (signal: AbortSignal) => Promise<T[]>, deps: DependencyList) {
  const [state, setState] = useState<State<T>>({ status: 'loading', data: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', data: [] });
    load(controller.signal)
      .then((data) => setState({ status: data.length === 0 ? 'empty' : 'ready', data }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error', data: [] });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

import { useCallback, useEffect, useState } from 'react';
import type { Period } from './types';

type State<T> = { status: 'loading' | 'ready' | 'empty' | 'error'; data: T | null };

// One widget's own period, request and state: nothing is shared between widgets.
export function usePeriodResource<T>(
  initialPeriod: Period,
  fetcher: (period: Period, signal: AbortSignal) => Promise<T>,
  isEmpty: (data: T) => boolean,
) {
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State<T>>({ status: 'loading', data: null });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', data: null });
    fetcher(period, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: isEmpty(data) ? 'empty' : 'ready', data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error', data: null });
      });
    return () => controller.abort();
    // fetcher and isEmpty are module-level functions; only the period or a retry refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { period, setPeriod, ...state, retry };
}

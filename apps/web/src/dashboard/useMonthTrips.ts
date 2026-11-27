import { useCallback, useEffect, useState } from 'react';
import { fetchMonthTrips } from './trips-api';
import type { Trip } from './types';

type State = { status: 'loading' | 'ready' | 'error'; trips: Trip[] };

export function useMonthTrips(month: string) {
  const [state, setState] = useState<State>({ status: 'loading', trips: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', trips: [] });
    fetchMonthTrips(month, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setState({ status: 'ready', trips: result.trips });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error', trips: [] });
      });
    return () => controller.abort();
  }, [month, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardStats } from './dashboard-api';
import type { DashboardStats } from './types';

type State = { status: 'loading' | 'ready' | 'empty' | 'error'; stats: DashboardStats | null };

export function useDashboardStats() {
  const [state, setState] = useState<State>({ status: 'loading', stats: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', stats: null });
    fetchDashboardStats(controller.signal)
      .then((stats) => {
        const empty = stats.bookings === 0 && stats.customers === 0 && stats.earnings.amountMinor === 0;
        setState({ status: empty ? 'empty' : 'ready', stats });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error', stats: null });
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

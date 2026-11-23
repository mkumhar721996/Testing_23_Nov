import { useCallback, useEffect, useState } from 'react';
import { fetchDashboard } from './api';
import type { DashboardData } from './types';

export type DashboardState =
  | { status: 'loading' }
  | { status: 'error'; retried: boolean }
  | { status: 'ready'; data: DashboardData };

export function useDashboard(): DashboardState & { retry: () => void } {
  const [state, setState] = useState<DashboardState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboard(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: 'ready', data });
      },
      () => {
        if (!controller.signal.aborted) setState({ status: 'error', retried: attempt > 0 });
      },
    );
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, retry };
}

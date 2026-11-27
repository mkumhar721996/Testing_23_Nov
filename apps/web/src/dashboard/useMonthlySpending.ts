import { useCallback, useEffect, useState } from 'react';
import { fetchMonthlySpending } from './spending-api';
import type { MonthlySpendingResponse } from './spending-types';

export type MonthlySpendingState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: MonthlySpendingResponse };

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function useMonthlySpending(): { state: MonthlySpendingState; retry: () => void } {
  const [state, setState] = useState<MonthlySpendingState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetchMonthlySpending(timeZone, controller.signal).then(
      (data) => setState({ status: 'ready', data }),
      () => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      },
    );
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}

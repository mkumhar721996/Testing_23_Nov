import { useCallback, useEffect, useState } from 'react';
import { fetchMyWork } from './my-work-api';
import type { MyWorkResponse } from './types';

export type MyWorkState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: MyWorkResponse };

export function useMyWork(): { state: MyWorkState; retry: () => void } {
  const [state, setState] = useState<MyWorkState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetchMyWork(controller.signal).then(
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

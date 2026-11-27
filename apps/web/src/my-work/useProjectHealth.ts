import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchProjectHealth, selectProject } from './project-health-api';
import type { ProjectHealth } from './types';

export type ProjectHealthState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: ProjectHealth };

export function useProjectHealth(): {
  state: ProjectHealthState;
  select: (projectId: string) => void;
  retry: () => void;
} {
  const [state, setState] = useState<ProjectHealthState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const controller = useRef<AbortController | undefined>(undefined);

  const run = useCallback((load: (signal: AbortSignal) => Promise<ProjectHealth>) => {
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setState({ status: 'loading' });
    load(next.signal).then(
      (data) => {
        if (!next.signal.aborted) setState({ status: 'ready', data });
      },
      () => {
        if (!next.signal.aborted) setState({ status: 'error' });
      },
    );
  }, []);

  useEffect(() => {
    run(fetchProjectHealth);
    return () => controller.current?.abort();
  }, [attempt, run]);

  const select = useCallback((projectId: string) => run((s) => selectProject(projectId, s)), [run]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, select, retry };
}

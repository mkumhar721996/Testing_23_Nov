import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchOrganization, fetchOrganizations } from './api';
import type { OrganizationDetail, OrganizationListItem } from './types';

export type RequestStatus = 'loading' | 'success' | 'error' | 'forbidden';

export interface RequestState<T> {
  status: RequestStatus;
  data: T | null;
  retry: () => void;
}

function useRequest<T>(load: () => Promise<T>, key: string): RequestState<T> {
  const [state, setState] = useState<{ status: RequestStatus; data: T | null }>({
    status: 'loading',
    data: null,
  });
  const [attempt, setAttempt] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null });
    loadRef.current().then(
      (data) => {
        if (!cancelled) setState({ status: 'success', data });
      },
      (error: unknown) => {
        if (cancelled) return;
        const forbidden = error instanceof ApiError && error.status === 403;
        setState({ status: forbidden ? 'forbidden' : 'error', data: null });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

export function useOrganizations(): RequestState<OrganizationListItem[]> {
  return useRequest(fetchOrganizations, 'list');
}

export function useOrganizationDetail(id: string): RequestState<OrganizationDetail> {
  return useRequest(() => fetchOrganization(id), id);
}

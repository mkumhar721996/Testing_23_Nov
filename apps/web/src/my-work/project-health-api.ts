import { getAccessToken } from '../auth/session';
import type { ProjectHealth } from './types';

async function request(path: string, init: RequestInit, signal?: AbortSignal): Promise<ProjectHealth> {
  const token = await getAccessToken();
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
    signal,
  });
  if (!response.ok) throw new Error(`Project health request failed: ${response.status}`);
  return (await response.json()) as ProjectHealth;
}

export const fetchProjectHealth = (signal?: AbortSignal) =>
  request('/project-health', {}, signal);

export const selectProject = (projectId: string, signal?: AbortSignal) =>
  request(
    '/project-health/selection',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    },
    signal,
  );

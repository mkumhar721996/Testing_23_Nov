import { getAccessToken } from '../auth/session';
import type { DashboardResponse } from './types';

export async function fetchDashboard(signal?: AbortSignal): Promise<DashboardResponse> {
  const token = await getAccessToken();
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) throw new Error(`Dashboard request failed: ${response.status}`);
  return (await response.json()) as DashboardResponse;
}

import { getAccessToken } from '../auth/session';
import type { DashboardStats } from './types';

export async function fetchDashboardStats(signal?: AbortSignal): Promise<DashboardStats> {
  const token = await getAccessToken();
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/dashboard/stats`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) throw new Error(`Dashboard stats request failed: ${response.status}`);
  return (await response.json()) as DashboardStats;
}

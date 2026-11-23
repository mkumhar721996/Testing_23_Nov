import type { DashboardData } from './types';

export async function fetchDashboard(signal?: AbortSignal): Promise<DashboardData> {
  const response = await fetch('/api/dashboard', { signal });
  if (!response.ok) throw new Error(`Dashboard request failed: ${response.status}`);
  return (await response.json()) as DashboardData;
}

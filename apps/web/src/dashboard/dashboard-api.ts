import { getAccessToken } from '../auth/session';
import type { DashboardStats, Period, RevenueSeries, TopDestinations } from './types';

async function getJson<T>(path: string, what: string, signal?: AbortSignal): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) throw new Error(`${what} request failed: ${response.status}`);
  return (await response.json()) as T;
}

export function fetchDashboardStats(signal?: AbortSignal): Promise<DashboardStats> {
  return getJson('/dashboard/stats', 'Dashboard stats', signal);
}

export function fetchRevenue(period: Period, signal?: AbortSignal): Promise<RevenueSeries> {
  return getJson(`/dashboard/revenue?period=${period}`, 'Revenue', signal);
}

export function fetchTopDestinations(period: Period, signal?: AbortSignal): Promise<TopDestinations> {
  return getJson(`/dashboard/destinations?period=${period}`, 'Top destinations', signal);
}

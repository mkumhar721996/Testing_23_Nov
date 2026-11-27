import { getAccessToken } from '../auth/session';
import type { MonthTrips } from './types';

export async function fetchMonthTrips(month: string, signal?: AbortSignal): Promise<MonthTrips> {
  const token = await getAccessToken();
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/dashboard/trips?month=${encodeURIComponent(month)}`,
    { headers: { Authorization: `Bearer ${token}` }, signal },
  );
  if (!response.ok) throw new Error(`Dashboard trips request failed: ${response.status}`);
  return (await response.json()) as MonthTrips;
}

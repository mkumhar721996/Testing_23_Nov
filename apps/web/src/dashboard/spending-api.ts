import { getAccessToken } from '../auth/session';
import type { MonthlySpendingResponse } from './spending-types';

export async function fetchMonthlySpending(
  timeZone: string,
  signal?: AbortSignal,
): Promise<MonthlySpendingResponse> {
  const token = await getAccessToken();
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/spending/monthly?timeZone=${encodeURIComponent(timeZone)}`,
    { headers: { Authorization: `Bearer ${token}` }, signal },
  );
  if (!response.ok) throw new Error(`Spending request failed: ${response.status}`);
  return (await response.json()) as MonthlySpendingResponse;
}

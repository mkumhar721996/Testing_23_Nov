import { getAccessToken } from '../auth/session';
import type { MyWorkResponse } from './types';

export async function fetchMyWork(signal?: AbortSignal): Promise<MyWorkResponse> {
  const token = await getAccessToken();
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/my-work`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) throw new Error(`My work request failed: ${response.status}`);
  return (await response.json()) as MyWorkResponse;
}

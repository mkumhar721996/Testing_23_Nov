import { getAccessToken } from '../auth/session';
import type { SearchResults } from './types';

export async function fetchSearch(q: string, signal?: AbortSignal): Promise<SearchResults> {
  const token = await getAccessToken();
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/search?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) throw new Error(`Search request failed: ${response.status}`);
  return (await response.json()) as SearchResults;
}

import type { AuthClient } from '../auth/AuthClient';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly fields: Record<string, string> = {},
  ) {
    super(`API request failed with ${status}`);
  }
}

let auth: AuthClient | null = null;

export function configureApi(client: AuthClient): void {
  auth = client;
}

/** Thin fetch wrapper: adds the Entra ID bearer token; a 401 sends the person back to sign in. */
export async function apiFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!auth) throw new Error('API client is not configured');
  const token = await auth.getAccessToken();
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (res.status === 401) await auth.signIn();
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.fields);
  }
  return (await res.json()) as T;
}

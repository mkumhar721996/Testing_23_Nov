export type Category = { id: string; name: string; retired: boolean };

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const base = () => `${import.meta.env.VITE_API_BASE_URL ?? ''}/expense-categories`;

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.code ?? 'error', res.status, body.message ?? 'Something went wrong.');
  return body as T;
}

const send = (url: string, method: string, body?: unknown) =>
  call<Category>(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export function listCategories(opts: { activeOnly?: boolean } = {}) {
  return call<{ categories: Category[]; canManage: boolean }>(base() + (opts.activeOnly ? '?active=true' : ''));
}

export const addCategory = (name: string) => send(base(), 'POST', { name });
export const renameCategory = (id: string, name: string) => send(`${base()}/${id}`, 'PATCH', { name });
export const retireCategory = (id: string) => send(`${base()}/${id}/retire`, 'POST');

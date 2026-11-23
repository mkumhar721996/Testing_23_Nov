import { getAccessToken } from '../auth/token';
import type { OrganizationDetail, OrganizationListItem } from './types';

export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`Request failed with status ${status}`);
    this.name = 'ApiError';
  }
}

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

async function getJson<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return (await response.json()) as T;
}

export function fetchOrganizations(): Promise<OrganizationListItem[]> {
  return getJson('/organizations');
}

export function fetchOrganization(id: string): Promise<OrganizationDetail> {
  return getJson(`/organizations/${encodeURIComponent(id)}`);
}

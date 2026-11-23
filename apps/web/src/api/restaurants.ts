export interface RestaurantSummary {
  id: string;
  name: string;
  cuisine: string;
  isOpen: boolean;
  hoursLabel: string;
  deliveryFeeCents: number;
  etaLabel: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  isAvailable: boolean;
}

export interface RestaurantMenu extends RestaurantSummary {
  serviceLocations: string[];
  menuUpdatedAt: string;
  categories: { name: string; items: MenuItem[] }[];
}

export class NotFoundError extends Error {}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

async function getJson<T>(path: string): Promise<T> {
  // Always ask the server: a menu updated by the restaurant must show at once.
  const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
  if (res.status === 404) throw new NotFoundError('Not found');
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  return (await res.json()) as T;
}

export function listRestaurants(location?: string): Promise<{ restaurants: RestaurantSummary[] }> {
  const query = location ? `?location=${encodeURIComponent(location)}` : '';
  return getJson(`/restaurants${query}`);
}

export function getMenu(id: string): Promise<RestaurantMenu> {
  return getJson(`/restaurants/${encodeURIComponent(id)}/menu`);
}

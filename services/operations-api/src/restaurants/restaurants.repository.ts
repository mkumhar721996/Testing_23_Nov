import type { RestaurantMenu, RestaurantSummary } from './restaurants.types';

export const RESTAURANT_REPOSITORY = Symbol('RESTAURANT_REPOSITORY');

export interface RestaurantRepository {
  /** `page` is reserved for later; it is not applied yet. */
  list(location?: string, page?: { limit: number; offset: number }): Promise<RestaurantSummary[]>;
  findMenu(id: string): Promise<RestaurantMenu | null>;
}

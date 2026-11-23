import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { RESTAURANT_REPOSITORY, type RestaurantRepository } from './restaurants.repository';
import type { RestaurantMenu, RestaurantSummary } from './restaurants.types';

@Injectable()
export class RestaurantsService {
  constructor(@Inject(RESTAURANT_REPOSITORY) private readonly repository: RestaurantRepository) {}

  /** A blank or absent location means no filter. */
  list(location?: string): Promise<RestaurantSummary[]> {
    const trimmed = location?.trim();
    return this.repository.list(trimmed ? trimmed : undefined);
  }

  async menu(id: string): Promise<RestaurantMenu> {
    const menu = await this.repository.findMenu(id);
    if (!menu) throw new NotFoundException('Restaurant not found');
    return menu;
  }
}

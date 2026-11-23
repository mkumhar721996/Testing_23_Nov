import { Controller, Get, Header, Inject, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import type { RestaurantMenu, RestaurantSummary } from './restaurants.types';

// Public, read-only endpoints. `no-store` keeps every menu request fresh (an updated menu shows at once).
const NO_STORE = 'no-store';

@Controller('restaurants')
export class RestaurantsController {
  constructor(@Inject(RestaurantsService) private readonly service: RestaurantsService) {}

  @Get()
  @Header('Cache-Control', NO_STORE)
  async list(@Query('location') location?: string): Promise<{ restaurants: RestaurantSummary[] }> {
    return { restaurants: await this.service.list(location) };
  }

  @Get(':id/menu')
  @Header('Cache-Control', NO_STORE)
  menu(@Param('id', ParseUUIDPipe) id: string): Promise<RestaurantMenu> {
    return this.service.menu(id);
  }
}

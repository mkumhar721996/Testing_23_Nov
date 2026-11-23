import { Module } from '@nestjs/common';
import { PgRestaurantsRepository } from './pg-restaurants.repository';
import { RESTAURANT_REPOSITORY } from './restaurants.repository';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';

@Module({
  controllers: [RestaurantsController],
  providers: [
    RestaurantsService,
    { provide: RESTAURANT_REPOSITORY, useClass: PgRestaurantsRepository },
  ],
})
export class RestaurantsModule {}

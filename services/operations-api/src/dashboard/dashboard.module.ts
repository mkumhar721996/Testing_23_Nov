import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { SampleStatsRepository } from './sample-stats.repository';
import { SampleTripsRepository } from './sample-trips.repository';
import { STATS_REPOSITORY } from './stats.repository';
import { TRIPS_REPOSITORY } from './trips.repository';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    { provide: STATS_REPOSITORY, useClass: SampleStatsRepository },
    { provide: TRIPS_REPOSITORY, useFactory: () => new SampleTripsRepository() },
  ],
})
export class DashboardModule {}

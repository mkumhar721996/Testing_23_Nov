import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { SampleStatsRepository } from './sample-stats.repository';
import { STATS_REPOSITORY } from './stats.repository';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [DashboardService, { provide: STATS_REPOSITORY, useClass: SampleStatsRepository }],
})
export class DashboardModule {}

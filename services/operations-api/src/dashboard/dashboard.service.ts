import { Inject, Injectable } from '@nestjs/common';
import type { DashboardStats, Period, RevenueSeries, TopDestinations } from './dashboard.types';
import { STATS_REPOSITORY, type StatsRepository } from './stats.repository';

@Injectable()
export class DashboardService {
  constructor(@Inject(STATS_REPOSITORY) private readonly stats: StatsRepository) {}

  getStats(): Promise<DashboardStats> {
    return this.stats.getStats();
  }

  getRevenue(period: Period): Promise<RevenueSeries> {
    return this.stats.getRevenue(period);
  }

  getTopDestinations(period: Period): Promise<TopDestinations> {
    return this.stats.getTopDestinations(period);
  }
}

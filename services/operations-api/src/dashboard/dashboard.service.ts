import { Inject, Injectable } from '@nestjs/common';
import type { DashboardStats } from './dashboard.types';
import { STATS_REPOSITORY, type StatsRepository } from './stats.repository';

@Injectable()
export class DashboardService {
  constructor(@Inject(STATS_REPOSITORY) private readonly stats: StatsRepository) {}

  getStats(): Promise<DashboardStats> {
    return this.stats.getStats();
  }
}

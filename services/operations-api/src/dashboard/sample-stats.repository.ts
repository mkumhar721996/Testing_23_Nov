import { Injectable } from '@nestjs/common';
import type { DashboardStats } from './dashboard.types';
import { SAMPLE_STATS } from './sample-data';
import type { StatsRepository } from './stats.repository';

@Injectable()
export class SampleStatsRepository implements StatsRepository {
  async getStats(): Promise<DashboardStats> {
    return { ...SAMPLE_STATS, earnings: { ...SAMPLE_STATS.earnings } };
  }
}

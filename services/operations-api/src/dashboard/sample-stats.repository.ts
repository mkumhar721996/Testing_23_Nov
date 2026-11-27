import { Injectable } from '@nestjs/common';
import type { DashboardStats, Period, RevenueSeries, TopDestinations } from './dashboard.types';
import { SAMPLE_CURRENCY, SAMPLE_DESTINATIONS, SAMPLE_REVENUE, SAMPLE_STATS } from './sample-data';
import type { StatsRepository } from './stats.repository';

@Injectable()
export class SampleStatsRepository implements StatsRepository {
  async getStats(): Promise<DashboardStats> {
    return { ...SAMPLE_STATS, earnings: { ...SAMPLE_STATS.earnings } };
  }

  async getRevenue(period: Period): Promise<RevenueSeries> {
    return {
      period,
      currency: SAMPLE_CURRENCY,
      points: SAMPLE_REVENUE[period].map((point) => ({ ...point })),
    };
  }

  async getTopDestinations(period: Period): Promise<TopDestinations> {
    return { period, destinations: SAMPLE_DESTINATIONS[period].map((d) => ({ ...d })) };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import type { DashboardStats, MonthTrips } from './dashboard.types';
import { STATS_REPOSITORY, type StatsRepository } from './stats.repository';
import { TRIPS_REPOSITORY, type TripsRepository } from './trips.repository';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(STATS_REPOSITORY) private readonly stats: StatsRepository,
    @Inject(TRIPS_REPOSITORY) private readonly trips: TripsRepository,
  ) {}

  getStats(): Promise<DashboardStats> {
    return this.stats.getStats();
  }

  async getTrips(month: string): Promise<MonthTrips> {
    return { month, trips: await this.trips.getTripsForMonth(month) };
  }
}

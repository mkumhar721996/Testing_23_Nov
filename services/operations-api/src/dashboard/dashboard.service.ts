import { Inject, Injectable } from '@nestjs/common';
import type {
  DashboardStats,
  Message,
  PackageSort,
  RecentTrip,
  TravelPackage,
  UpcomingTrip,
} from './dashboard.types';
import { STATS_REPOSITORY, type StatsRepository } from './stats.repository';
import { WIDGETS_REPOSITORY, type WidgetsRepository } from './widgets.repository';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(STATS_REPOSITORY) private readonly stats: StatsRepository,
    @Inject(WIDGETS_REPOSITORY) private readonly widgets: WidgetsRepository,
  ) {}

  getStats(): Promise<DashboardStats> {
    return this.stats.getStats();
  }

  getRecentTrips(): Promise<RecentTrip[]> {
    return this.widgets.getRecentTrips();
  }

  getUpcomingTrips(): Promise<UpcomingTrip[]> {
    return this.widgets.getUpcomingTrips();
  }

  getTravelPackages(sort: PackageSort): Promise<TravelPackage[]> {
    return this.widgets.getTravelPackages(sort);
  }

  getMessages(): Promise<Message[]> {
    return this.widgets.getMessages();
  }
}

import type { DashboardStats, Period, RevenueSeries, TopDestinations } from './dashboard.types';

export const STATS_REPOSITORY = Symbol('STATS_REPOSITORY');

export interface StatsRepository {
  getStats(): Promise<DashboardStats>;
  getRevenue(period: Period): Promise<RevenueSeries>;
  getTopDestinations(period: Period): Promise<TopDestinations>;
}

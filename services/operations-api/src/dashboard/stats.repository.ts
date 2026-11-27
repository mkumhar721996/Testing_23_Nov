import type { DashboardStats } from './dashboard.types';

export const STATS_REPOSITORY = Symbol('STATS_REPOSITORY');

export interface StatsRepository {
  getStats(): Promise<DashboardStats>;
}

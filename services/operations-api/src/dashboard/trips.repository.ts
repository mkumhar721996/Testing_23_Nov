import type { Trip } from './dashboard.types';

export const TRIPS_REPOSITORY = Symbol('TRIPS_REPOSITORY');

export interface TripsRepository {
  // Every trip whose start..end range overlaps the month (YYYY-MM), sorted by start then id.
  getTripsForMonth(month: string): Promise<Trip[]>;
}

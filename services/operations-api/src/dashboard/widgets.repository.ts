import type { Message, PackageSort, RecentTrip, TravelPackage, UpcomingTrip } from './dashboard.types';

export const WIDGETS_REPOSITORY = Symbol('WIDGETS_REPOSITORY');

export interface WidgetsRepository {
  getRecentTrips(): Promise<RecentTrip[]>;
  getUpcomingTrips(): Promise<UpcomingTrip[]>;
  getTravelPackages(sort: PackageSort): Promise<TravelPackage[]>;
  getMessages(): Promise<Message[]>;
}

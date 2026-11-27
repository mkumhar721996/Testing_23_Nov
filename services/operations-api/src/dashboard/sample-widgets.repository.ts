import { Injectable } from '@nestjs/common';
import type { Message, PackageSort, RecentTrip, TravelPackage, UpcomingTrip } from './dashboard.types';
import { SAMPLE_MESSAGES, SAMPLE_PACKAGES, SAMPLE_RECENT_TRIPS, SAMPLE_UPCOMING_TRIPS } from './sample-data';
import type { WidgetsRepository } from './widgets.repository';

@Injectable()
export class SampleWidgetsRepository implements WidgetsRepository {
  async getRecentTrips(): Promise<RecentTrip[]> {
    return SAMPLE_RECENT_TRIPS.map((trip) => ({ ...trip, expenses: { ...trip.expenses } }));
  }

  async getUpcomingTrips(): Promise<UpcomingTrip[]> {
    return SAMPLE_UPCOMING_TRIPS.map((trip) => ({ ...trip }));
  }

  async getTravelPackages(sort: PackageSort): Promise<TravelPackage[]> {
    const packages = SAMPLE_PACKAGES.map((pkg) => ({ ...pkg }));
    return sort === 'most-booked'
      ? packages.sort((a, b) => b.bookings - a.bookings)
      : packages.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getMessages(): Promise<Message[]> {
    return SAMPLE_MESSAGES.map((message) => ({ ...message }));
  }
}

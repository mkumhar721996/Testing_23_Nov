import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { DashboardService } from './dashboard.service';
import type {
  DashboardStats,
  Message,
  RecentTrip,
  TravelPackage,
  UpcomingTrip,
} from './dashboard.types';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboard: DashboardService) {}

  // Organisation-wide totals: no customer id is read.
  @Get('stats')
  getStats(): Promise<DashboardStats> {
    return this.dashboard.getStats();
  }

  @Get('recent-trips')
  getRecentTrips(): Promise<RecentTrip[]> {
    return this.dashboard.getRecentTrips();
  }

  @Get('upcoming-trips')
  getUpcomingTrips(): Promise<UpcomingTrip[]> {
    return this.dashboard.getUpcomingTrips();
  }

  // An unknown sort value falls back to 'latest'.
  @Get('travel-packages')
  getTravelPackages(@Query('sort') sort?: string): Promise<TravelPackage[]> {
    return this.dashboard.getTravelPackages(sort === 'most-booked' ? 'most-booked' : 'latest');
  }

  @Get('messages')
  getMessages(): Promise<Message[]> {
    return this.dashboard.getMessages();
  }
}

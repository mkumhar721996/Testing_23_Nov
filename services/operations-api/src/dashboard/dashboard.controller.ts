import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { DashboardService } from './dashboard.service';
import type { DashboardStats, RevenueSeries, TopDestinations } from './dashboard.types';
import { parsePeriod } from './period';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboard: DashboardService) {}

  // Organisation-wide totals: no customer id is read.
  @Get('stats')
  getStats(): Promise<DashboardStats> {
    return this.dashboard.getStats();
  }

  @Get('revenue')
  getRevenue(@Query('period') period?: string): Promise<RevenueSeries> {
    return this.dashboard.getRevenue(parsePeriod(period));
  }

  @Get('destinations')
  getDestinations(@Query('period') period?: string): Promise<TopDestinations> {
    return this.dashboard.getTopDestinations(parsePeriod(period));
  }
}

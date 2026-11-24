import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentCustomerId } from '../auth/current-customer.decorator';
import { DashboardService } from './dashboard.service';
import type { DashboardResponse } from './dashboard.types';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboard: DashboardService) {}

  // The customer comes only from the verified token, never from path, query or body.
  @Get()
  getDashboard(@CurrentCustomerId() customerId: string): Promise<DashboardResponse> {
    return this.dashboard.getOverview(customerId);
  }
}

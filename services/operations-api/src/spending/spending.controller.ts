import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentCustomerId } from '../auth/current-customer.decorator';
import { SpendingService } from './spending.service';
import type { MonthlySpendingResponse } from './spending.types';

@Controller('spending')
@UseGuards(AuthGuard)
export class SpendingController {
  constructor(@Inject(SpendingService) private readonly spending: SpendingService) {}

  // The customer comes only from the verified token, never from path, query or body.
  @Get('monthly')
  getMonthly(
    @CurrentCustomerId() customerId: string,
    @Query('timeZone') timeZone?: string,
  ): Promise<MonthlySpendingResponse> {
    return this.spending.getMonthly(customerId, typeof timeZone === 'string' ? timeZone : undefined);
  }
}

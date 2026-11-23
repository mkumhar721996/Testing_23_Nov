import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { CurrentPrincipal } from '../auth/auth.guard';
import type { Principal } from '../auth/principal';
import {
  addItemBody,
  createRecordBody,
  parseBody,
  updateItemBody,
  updateRecordBody,
} from './onboarding.dto';
import { OnboardingService } from './onboarding.service';

@Controller()
export class OnboardingController {
  constructor(@Inject(OnboardingService) private readonly service: OnboardingService) {}

  @Get('employees/without-onboarding')
  employeesWithoutOnboarding(@CurrentPrincipal() p: Principal) {
    return this.service.listEmployeesWithoutOnboarding(p);
  }

  @Get('onboarding-records')
  list(@CurrentPrincipal() p: Principal) {
    return this.service.listRecords(p);
  }

  @Post('onboarding-records')
  create(@CurrentPrincipal() p: Principal, @Body() body: unknown) {
    return this.service.createRecord(p, parseBody(createRecordBody, body));
  }

  @Get('onboarding-records/:id')
  get(@CurrentPrincipal() p: Principal, @Param('id') id: string) {
    return this.service.getRecord(p, id);
  }

  @Patch('onboarding-records/:id')
  update(@CurrentPrincipal() p: Principal, @Param('id') id: string, @Body() body: unknown) {
    return this.service.updateRecord(p, id, parseBody(updateRecordBody, body));
  }

  @Post('onboarding-records/:id/items')
  addItem(@CurrentPrincipal() p: Principal, @Param('id') id: string, @Body() body: unknown) {
    return this.service.addItem(p, id, parseBody(addItemBody, body));
  }

  @Patch('onboarding-records/:id/items/:itemId')
  updateItem(
    @CurrentPrincipal() p: Principal,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
  ) {
    return this.service.updateItem(p, id, itemId, parseBody(updateItemBody, body));
  }
}

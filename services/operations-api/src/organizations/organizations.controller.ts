import { Controller, Get, Inject, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import type { OrganizationDetail, OrganizationListItem, Principal } from './organization.types';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(@Inject(OrganizationsService) private readonly service: OrganizationsService) {}

  @Get()
  list(@CurrentPrincipal() principal: Principal): Promise<OrganizationListItem[]> {
    return this.service.list(principal);
  }

  @Get(':id')
  get(
    @CurrentPrincipal() principal: Principal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrganizationDetail> {
    return this.service.get(principal, id);
  }
}

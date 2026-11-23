import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { OrganizationDetail, OrganizationListItem, Principal } from './organization.types';
import { ORGANIZATIONS_REPOSITORY, type OrganizationsRepository } from './organizations.repository';

const isOrganizationScoped = (principal: Principal) =>
  principal.role === 'org_admin' || principal.role === 'org_staff';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(@Inject(ORGANIZATIONS_REPOSITORY) private readonly repository: OrganizationsRepository) {}

  async list(principal: Principal): Promise<OrganizationListItem[]> {
    if (!isOrganizationScoped(principal)) {
      return this.repository.list({ organizationId: null });
    }
    if (principal.organizationId === null) {
      return [];
    }
    return this.repository.list({ organizationId: principal.organizationId });
  }

  async get(principal: Principal, id: string): Promise<OrganizationDetail> {
    if (isOrganizationScoped(principal) && principal.organizationId !== id) {
      this.logger.warn(
        `Access denied: user ${principal.userId} (${principal.role}) requested organization ${id}`,
      );
      throw new ForbiddenException('access denied');
    }
    const organization = await this.repository.findById(id);
    if (!organization) {
      throw new NotFoundException('organization not found');
    }
    return organization;
  }
}

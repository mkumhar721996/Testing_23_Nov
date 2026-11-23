import type { OrganizationDetail, OrganizationListItem } from './organization.types';

export const ORGANIZATIONS_REPOSITORY = Symbol('ORGANIZATIONS_REPOSITORY');

export interface OrganizationsRepository {
  list(scope: { organizationId: string | null }): Promise<OrganizationListItem[]>;
  findById(id: string): Promise<OrganizationDetail | null>;
}

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type {
  OrganizationDetail,
  Principal,
  Role,
} from './organization.types';
import type { OrganizationsRepository } from './organizations.repository';
import { OrganizationsService } from './organizations.service';

const consultant = { fullName: 'Jane Doe', email: 'jane@example.org', phone: '+44 113 555 0142' };
const orgs: OrganizationDetail[] = ['A', 'B', 'C'].map((name) => ({
  id: `00000000-0000-4000-8000-00000000000${name.charCodeAt(0) - 64}`,
  name,
  address: `${name} Street`,
  admin: 'Sam Lee',
  createdBy: 'Sam Patel',
  consultant,
}));
const [A, B] = orgs;

const repo: OrganizationsRepository = {
  list: async ({ organizationId }) =>
    orgs.filter((o) => organizationId === null || o.id === organizationId),
  findById: async (id) => orgs.find((o) => o.id === id) ?? null,
};
const service = new OrganizationsService(repo);
const principal = (role: Role, organizationId: string | null): Principal => ({
  userId: 'u1',
  role,
  organizationId,
});

describe('OrganizationsService', () => {
  it.each(['wfc_admin', 'fundraising_consultant'] as Role[])('%s lists every organization', async (role) => {
    const list = await service.list(principal(role, null));
    expect(list.map((o) => o.name)).toEqual(['A', 'B', 'C']);
  });

  it.each(['org_admin', 'org_staff'] as Role[])('%s lists only their own organization', async (role) => {
    const list = await service.list(principal(role, A.id));
    expect(list.map((o) => o.name)).toEqual(['A']);
  });

  it.each(['org_admin', 'org_staff'] as Role[])('%s with no organization lists nothing', async (role) => {
    expect(await service.list(principal(role, null))).toEqual([]);
  });

  it.each(['wfc_admin', 'fundraising_consultant', 'org_admin', 'org_staff'] as Role[])(
    'returns the consultant for %s',
    async (role) => {
      const org = await service.get(principal(role, A.id), A.id);
      expect(org.consultant).toEqual(consultant);
    },
  );

  it.each(['org_admin', 'org_staff'] as Role[])('%s is denied another organization', async (role) => {
    await expect(service.get(principal(role, A.id), B.id)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets WFC Admin open any organization', async () => {
    expect((await service.get(principal('wfc_admin', null), B.id)).name).toBe('B');
  });

  it('throws not found for a missing organization', async () => {
    await expect(
      service.get(principal('wfc_admin', null), '00000000-0000-4000-8000-0000000000ff'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

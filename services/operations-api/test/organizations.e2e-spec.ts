import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import {
  PRINCIPAL_RESOLVER,
  TOKEN_VERIFIER,
  type PrincipalResolver,
  type TokenVerifier,
} from '../src/auth/principal-resolver';
import type { OrganizationDetail, Principal, Role } from '../src/organizations/organization.types';
import { ORGANIZATIONS_REPOSITORY } from '../src/organizations/organizations.repository';

const consultant = { fullName: 'Jane Doe', email: 'jane@example.org', phone: '+44 113 555 0142' };
const orgs: OrganizationDetail[] = ['A', 'B', 'C'].map((name, i) => ({
  id: `00000000-0000-4000-8000-00000000000${i + 1}`,
  name,
  address: `${name} Street`,
  admin: 'Sam Lee',
  createdBy: 'Sam Patel',
  consultant,
}));
const [A, B] = orgs;

// The bearer token is the role name, so each request picks its own caller.
const verifier: TokenVerifier = { verify: async (token) => (token === 'unknown' ? null : token) };
const resolver: PrincipalResolver = {
  resolve: async (objectId): Promise<Principal | null> =>
    objectId === 'wfc_admin' || objectId === 'fundraising_consultant'
      ? { userId: 'u', role: objectId as Role, organizationId: null }
      : objectId === 'org_admin' || objectId === 'org_staff'
        ? { userId: 'u', role: objectId as Role, organizationId: A.id }
        : null,
};

describe('Organizations API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER)
      .useValue(verifier)
      .overrideProvider(PRINCIPAL_RESOLVER)
      .useValue(resolver)
      .overrideProvider(ORGANIZATIONS_REPOSITORY)
      .useValue({
        list: async ({ organizationId }: { organizationId: string | null }) =>
          orgs.filter((o) => organizationId === null || o.id === organizationId),
        findById: async (id: string) => orgs.find((o) => o.id === id) ?? null,
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (path: string, token: string) =>
    request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`);

  it.each(['wfc_admin', 'fundraising_consultant'])('lists all organizations for %s', async (role) => {
    const res = await get('/organizations', role).expect(200);
    expect(res.body).toHaveLength(3);
  });

  it.each(['org_admin', 'org_staff'])('lists only their organization for %s', async (role) => {
    const res = await get('/organizations', role).expect(200);
    expect(res.body.map((o: { name: string }) => o.name)).toEqual(['A']);
  });

  it.each(['wfc_admin', 'fundraising_consultant', 'org_admin', 'org_staff'])(
    'returns the consultant for %s',
    async (role) => {
      const res = await get(`/organizations/${A.id}`, role).expect(200);
      expect(res.body.consultant).toEqual(consultant);
    },
  );

  it('answers 403 when an org user asks for another organization', async () => {
    await get(`/organizations/${B.id}`, 'org_admin').expect(403);
  });

  it('answers 400 for an id that is not a uuid', async () => {
    await get('/organizations/not-a-uuid', 'wfc_admin').expect(400);
  });

  it('answers 401 without a token and for an unknown user', async () => {
    await request(app.getHttpServer()).get('/organizations').expect(401);
    await get('/organizations', 'unknown').expect(401);
  });

  it('has no write routes', async () => {
    await request(app.getHttpServer()).delete(`/organizations/${A.id}`).expect(404);
    await request(app.getHttpServer()).post('/organizations').expect(404);
  });
});

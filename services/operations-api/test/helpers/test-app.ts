import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TOKEN_VERIFIER } from '../../src/auth/token-verifier';
import type { TokenVerifier } from '../../src/auth/token-verifier';
import { configureApp } from '../../src/configure-app';
import { InMemoryOnboardingRepository } from '../../src/onboarding/in-memory-onboarding.repository';
import { ONBOARDING_REPOSITORY } from '../../src/onboarding/onboarding.repository';
import type { Employee } from '../../src/onboarding/onboarding.repository';

export interface TestUser {
  token: string;
  oid: string;
  roles: string[];
  name: string;
}

const user = (token: string, roles: string[], name: string): TestUser => ({
  token,
  oid: `oid-${token}`,
  roles,
  name,
});

export const users = {
  admin: user('admin', ['administrator'], 'Hana Admin'),
  manager: user('manager', ['manager'], 'Maya Okafor'),
  otherManager: user('other-manager', ['manager'], 'Jon Albrecht'),
  a: user('a', ['employee'], 'Priya Raman'),
  b: user('b', ['employee'], 'Tomas Herrera'),
  c: user('c', ['employee'], 'Aisha Bello'),
  newHire: user('new-hire', ['employee'], 'Daniel Kwon'),
};

const employee = (
  id: string,
  u: TestUser,
  managerId: string | null,
  extra: Partial<Employee> = {},
): Employee => ({
  id,
  entraOid: u.oid,
  email: `${u.token}@example.com`,
  displayName: u.name,
  jobTitle: 'Designer',
  team: 'Design',
  managerId,
  ...extra,
});

export const employees: Employee[] = [
  employee('emp-m', users.manager, null),
  employee('emp-om', users.otherManager, null),
  employee('emp-a', users.a, 'emp-m'),
  employee('emp-b', users.b, 'emp-om'),
  employee('emp-c', users.c, null),
  employee('emp-new', users.newHire, 'emp-m'),
];

const verifier: TokenVerifier = {
  async verify(bearer) {
    const found = Object.values(users).find((u) => u.token === bearer);
    if (!found) throw new Error('invalid token');
    return { oid: found.oid, roles: found.roles, name: found.name };
  },
};

export async function createTestApp() {
  const repo = new InMemoryOnboardingRepository(employees.map((e) => ({ ...e })));
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ONBOARDING_REPOSITORY)
    .useValue(repo)
    .overrideProvider(TOKEN_VERIFIER)
    .useValue(verifier)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();

  const server = app.getHttpServer();
  /** A request signed in as `u`, arriving over HTTPS as the load balancer forwards it. */
  const as = (u: TestUser) => ({
    get: (url: string) =>
      request(server).get(url).set('Authorization', `Bearer ${u.token}`).set('X-Forwarded-Proto', 'https'),
    post: (url: string) =>
      request(server).post(url).set('Authorization', `Bearer ${u.token}`).set('X-Forwarded-Proto', 'https'),
    patch: (url: string) =>
      request(server).patch(url).set('Authorization', `Bearer ${u.token}`).set('X-Forwarded-Proto', 'https'),
  });
  return { app, repo, server, as };
}

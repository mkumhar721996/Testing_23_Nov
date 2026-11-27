import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { TOKEN_VERIFIER } from '../src/auth/token-verifier';
import { PG_POOL } from '../src/db/database.module';
import { DEFECT_REPOSITORY } from '../src/my-work/defect.repository';
import { defect } from '../src/my-work/defect.repository.contract';
import { InMemoryDefectRepository } from '../src/my-work/in-memory-defect.repository';

const subjects: Record<string, string> = {
  'token-me': 'me',
  'token-nobody': 'nobody',
};

describe('/project-health', () => {
  let app: INestApplication;
  const get = (token: string) =>
    request(app.getHttpServer()).get('/project-health').set('Authorization', `Bearer ${token}`);
  const put = (token: string, body: object) =>
    request(app.getHttpServer())
      .put('/project-health/selection')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  beforeAll(async () => {
    const repo = new InMemoryDefectRepository();
    await repo.seed({
      projects: [
        { id: 'A', name: 'Alpha', members: ['me'] },
        { id: 'B', name: 'Bravo', members: ['me'] },
        { id: 'C', name: 'Charlie', members: ['other'] },
      ],
      defects: [
        ...Array.from({ length: 5 }, (_, i) => defect({ id: `a${i}`, projectId: 'A' })),
        ...Array.from({ length: 3 }, (_, i) => defect({ id: `b${i}`, projectId: 'B' })),
      ],
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PG_POOL)
      .useValue({ end: async () => undefined })
      .overrideProvider(DEFECT_REPOSITORY)
      .useValue(repo)
      .overrideProvider(TOKEN_VERIFIER)
      .useValue({
        verify: async (token: string) => {
          if (!subjects[token]) throw new Error('invalid');
          return { subject: subjects[token] };
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists only the person’s projects and selects the first by name', async () => {
    const res = await get('token-me').expect(200);
    expect(res.body.projects.map((p: { id: string }) => p.id)).toEqual(['A', 'B']);
    expect(res.body.selectedProjectId).toBe('A');
    expect(res.body.total).toBe(5);
  });

  it('returns no projects and no selection for a person with no role', async () => {
    const res = await get('token-nobody').expect(200);
    expect(res.body.projects).toEqual([]);
    expect(res.body.selectedProjectId).toBeNull();
  });

  it('refuses a project without a role and keeps the stored selection', async () => {
    await put('token-me', { projectId: 'C' }).expect(403);
    await put('token-me', {}).expect(400);
    expect((await get('token-me')).body.selectedProjectId).toBe('A');
  });

  it('switches to project B, remembers it for the next GET', async () => {
    const res = await put('token-me', { projectId: 'B' }).expect(200);
    expect(res.body.total).toBe(3);
    expect((await get('token-me')).body.selectedProjectId).toBe('B');
  });

  it('rejects a missing token', async () => {
    await request(app.getHttpServer()).get('/project-health').expect(401);
  });
});

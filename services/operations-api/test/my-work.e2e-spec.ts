import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { TOKEN_VERIFIER } from '../src/auth/token-verifier';
import { PG_POOL } from '../src/db/database.module';
import { DEFECT_REPOSITORY } from '../src/my-work/defect.repository';
import { InMemoryDefectRepository } from '../src/my-work/in-memory-defect.repository';
import { defect } from '../src/my-work/defect.repository.contract';
import type { DefectSummary } from '../src/my-work/my-work.types';

const subjects: Record<string, string> = { 'token-me': 'me', 'token-other': 'other' };

describe('GET /my-work', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const repo = new InMemoryDefectRepository();
    await repo.seed({
      projects: [
        { id: 'p1', name: 'Payments portal', members: ['me'] },
        { id: 'p2', name: 'Other project', members: ['other'] },
      ],
      defects: [
        defect({ id: 'mine', projectId: 'p1', assigneeId: 'me' }),
        defect({ id: 'theirs', projectId: 'p2', assigneeId: 'other' }),
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

  it("returns the signed-in person's open defects and recently updated defects", async () => {
    const res = await request(app.getHttpServer())
      .get('/my-work')
      .set('Authorization', 'Bearer token-me')
      .expect(200);
    expect(res.body.openDefects.items.map((d: DefectSummary) => d.id)).toEqual(['mine']);
    expect(res.body.openDefects.total).toBe(1);
    expect(res.body.recentlyUpdated.map((d: DefectSummary) => d.id)).toEqual(['mine']);
    expect(res.body.hasAnyDefects).toBe(true);
    expect(res.body.projects).toEqual([{ id: 'p1', name: 'Payments portal' }]);
  });

  it('takes the person from the token even when a personId is sent', async () => {
    const res = await request(app.getHttpServer())
      .get('/my-work?personId=other')
      .set('Authorization', 'Bearer token-me')
      .expect(200);
    expect(res.body.recentlyUpdated.map((d: DefectSummary) => d.id)).toEqual(['mine']);
  });

  it('rejects a missing or invalid token', async () => {
    await request(app.getHttpServer()).get('/my-work').expect(401);
    await request(app.getHttpServer())
      .get('/my-work')
      .set('Authorization', 'Bearer bogus')
      .expect(401);
  });
});

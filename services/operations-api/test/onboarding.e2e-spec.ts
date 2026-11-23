import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { RecordDetail } from '../src/onboarding/onboarding.repository';
import { createTestApp, users } from './helpers/test-app';

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

const actor = { oid: users.admin.oid, name: users.admin.name };

describe('onboarding API', () => {
  let t: TestApp;
  let recA: RecordDetail;
  let recB: RecordDetail;
  let recC: RecordDetail;

  beforeAll(async () => {
    t = await createTestApp();
    recA = await t.repo.createRecord({ employeeId: 'emp-a', startDate: '2026-12-01' }, actor);
    recB = await t.repo.createRecord({ employeeId: 'emp-b', startDate: '2026-12-01' }, actor);
    recC = await t.repo.createRecord({ employeeId: 'emp-c', startDate: '2026-12-01' }, actor);
    await t.repo.addItem(recA.id, { stage: 'first_week', title: 'Office tour', ownerName: 'Maya' }, actor);
  });

  afterAll(async () => {
    await t.app.close();
  });

  describe('AC1 sign-in required', () => {
    it('returns 401 and no data without a token', async () => {
      const res = await request(t.server).get('/onboarding-records').set('X-Forwarded-Proto', 'https');
      expect(res.status).toBe(401);
      expect(JSON.stringify(res.body)).not.toContain('Priya');
    });

    it('returns 401 for an invalid token', async () => {
      const res = await request(t.server)
        .get(`/onboarding-records/${recA.id}`)
        .set('Authorization', 'Bearer nonsense')
        .set('X-Forwarded-Proto', 'https');
      expect(res.status).toBe(401);
    });
  });

  describe('AC2, AC11, AC13 refused without permission', () => {
    it('refuses a stranger and returns no record data', async () => {
      const res = await t.as(users.c).get(`/onboarding-records/${recA.id}`);
      expect(res.status).toBe(403);
      expect(res.body).not.toHaveProperty('items');
      expect(res.body).not.toHaveProperty('startDate');
    });

    it('refuses a manager for an employee who is not their direct report', async () => {
      const res = await t.as(users.manager).get(`/onboarding-records/${recB.id}`);
      expect(res.status).toBe(403);
      expect(res.body).not.toHaveProperty('items');
    });

    it('refuses an employee for another employee', async () => {
      await t.as(users.a).get(`/onboarding-records/${recB.id}`).expect(403);
    });

    it('lists only the records the caller may read', async () => {
      const list = await t.as(users.c).get('/onboarding-records').expect(200);
      expect(list.body.map((r: { id: string }) => r.id)).toEqual([recC.id]);
    });

    it('returns 404 for a record that does not exist', async () => {
      await t.as(users.admin).get('/onboarding-records/nope').expect(404);
    });
  });

  describe('AC10, AC12 reads', () => {
    it('shows a manager the record of a direct report', async () => {
      const res = await t.as(users.manager).get(`/onboarding-records/${recA.id}`).expect(200);
      expect(res.body.employee.displayName).toBe('Priya Raman');
      expect(res.body.managerName).toBe('Maya Okafor');
    });

    it('shows an employee their own record and only that', async () => {
      await t.as(users.a).get(`/onboarding-records/${recA.id}`).expect(200);
      const list = await t.as(users.a).get('/onboarding-records').expect(200);
      expect(list.body.map((r: { id: string }) => r.id)).toEqual([recA.id]);
    });

    it('does not leak internal ids in a response', async () => {
      const res = await t.as(users.admin).get(`/onboarding-records/${recA.id}`).expect(200);
      expect(res.body).not.toHaveProperty('employeeId');
      expect(res.body).not.toHaveProperty('managerId');
    });
  });

  describe('AC14 manager and employee cannot change', () => {
    it.each([
      ['manager', users.manager],
      ['employee', users.a],
    ])('refuses every write by a %s', async (_name, who) => {
      const before = await t.repo.getRecord(recA.id);
      const auditBefore = (await t.repo.listAudit(recA.id)).length;
      const itemId = before!.items[0].id;
      await t.as(who).patch(`/onboarding-records/${recA.id}`).send({ startDate: '2027-01-04' }).expect(403);
      await t
        .as(who)
        .post(`/onboarding-records/${recA.id}/items`)
        .send({ stage: 'first_week', title: 'X', ownerName: '' })
        .expect(403);
      await t.as(who).patch(`/onboarding-records/${recA.id}/items/${itemId}`).send({ done: true }).expect(403);
      await t.as(who).post('/onboarding-records').send({ employeeId: 'emp-new', startDate: '2027-01-04' }).expect(403);
      await t.as(who).get('/employees/without-onboarding').expect(403);
      expect((await t.repo.getRecord(recA.id))!.startDate).toBe(before!.startDate);
      expect(await t.repo.listAudit(recA.id)).toHaveLength(auditBefore);
      expect((await t.repo.listRecords()).map((r) => r.employeeId)).not.toContain('emp-new');
    });
  });

  describe('AC6 create a record', () => {
    it('lets an administrator create a record that then appears in the list', async () => {
      const created = await t
        .as(users.admin)
        .post('/onboarding-records')
        .send({ employeeId: 'emp-new', startDate: '2026-12-07' })
        .expect(201);
      expect(created.body).toMatchObject({ items: [], doneCount: 0, totalCount: 0, status: 'not_started' });
      const list = await t.as(users.admin).get('/onboarding-records').expect(200);
      expect(list.body.map((r: { id: string }) => r.id)).toContain(created.body.id);
      const audit = await t.repo.listAudit(created.body.id);
      expect(audit.at(-1)).toMatchObject({ action: 'record.created', actorOid: users.admin.oid });
    });

    it('rejects an invalid body with 400', async () => {
      await t.as(users.admin).post('/onboarding-records').send({ employeeId: '', startDate: 'soon' }).expect(400);
    });

    it('lists the employees who have no onboarding yet', async () => {
      const res = await t.as(users.admin).get('/employees/without-onboarding').expect(200);
      expect(res.body.map((e: { id: string }) => e.id)).not.toContain('emp-a');
    });
  });

  describe('AC5, AC9, AC3, AC8 administrator edits', () => {
    it('adds a checklist item that is then listed, and audits it', async () => {
      await t
        .as(users.admin)
        .post(`/onboarding-records/${recC.id}/items`)
        .send({ stage: 'first_week', title: 'Meet the team', ownerName: 'Maya Okafor' })
        .expect(201);
      const got = await t.as(users.admin).get(`/onboarding-records/${recC.id}`).expect(200);
      expect(got.body.items.map((i: { title: string }) => i.title)).toContain('Meet the team');
      for (const item of got.body.items) {
        expect(Object.keys(item).sort()).toEqual(['done', 'id', 'ownerName', 'position', 'stage', 'title']);
      }
      const audit = await t.repo.listAudit(recC.id);
      expect(audit.at(-1)).toMatchObject({ action: 'item.added', actorOid: users.admin.oid });
    });

    it('rejects an empty title with 400', async () => {
      await t
        .as(users.admin)
        .post(`/onboarding-records/${recC.id}/items`)
        .send({ stage: 'first_week', title: '', ownerName: '' })
        .expect(400);
    });

    it('ticks an item and audits before and after', async () => {
      const item = recA.items[0] ?? (await t.repo.getRecord(recA.id))!.items[0];
      const res = await t
        .as(users.admin)
        .patch(`/onboarding-records/${recA.id}/items/${item.id}`)
        .send({ done: true })
        .expect(200);
      expect(res.body.done).toBe(true);
      const audit = await t.repo.listAudit(recA.id);
      expect(audit.at(-1)).toMatchObject({ action: 'item.updated', actorOid: users.admin.oid, recordId: recA.id });
      expect(audit.at(-1)!.before).toMatchObject({ done: false });
      expect(audit.at(-1)!.after).toMatchObject({ done: true });
    });

    it('edits the start date of any employee and audits it', async () => {
      const res = await t
        .as(users.admin)
        .patch(`/onboarding-records/${recB.id}`)
        .send({ startDate: '2027-01-04' })
        .expect(200);
      expect(res.body.startDate).toBe('2027-01-04');
      const audit = await t.repo.listAudit(recB.id);
      expect(audit.at(-1)).toMatchObject({ action: 'record.updated' });
      expect(audit.at(-1)!.before).toMatchObject({ startDate: '2026-12-01' });
    });

    it('returns 404 for an item that is not on the record', async () => {
      await t.as(users.admin).patch(`/onboarding-records/${recB.id}/items/missing`).send({ done: true }).expect(404);
    });
  });

  describe('AC15 and status', () => {
    it('shows an empty checklist for a record with no items', async () => {
      const res = await t.as(users.admin).get(`/onboarding-records/${recB.id}`).expect(200);
      expect(res.body).toMatchObject({ items: [], doneCount: 0, totalCount: 0, status: 'not_started' });
    });

    it('derives status from item counts only', async () => {
      const list = await t.as(users.admin).get('/onboarding-records').expect(200);
      const a = list.body.find((r: { id: string }) => r.id === recA.id);
      expect(a).toMatchObject({ doneCount: 1, totalCount: 1, status: 'complete' });
      expect(Object.keys(a).sort()).toEqual(
        ['doneCount', 'employee', 'id', 'startDate', 'status', 'totalCount'],
      );
    });
  });

  describe('AC7 no reminders', () => {
    it('has no reminder route', async () => {
      await t.as(users.admin).post('/onboarding-records/x/reminders').expect(404);
    });
  });

  it('GET /me returns the caller', async () => {
    const res = await t.as(users.manager).get('/me').expect(200);
    expect(res.body).toEqual({ employeeId: 'emp-m', displayName: 'Maya Okafor', role: 'manager' });
  });
});

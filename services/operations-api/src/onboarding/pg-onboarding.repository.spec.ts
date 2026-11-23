import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PgOnboardingRepository } from './pg-onboarding.repository';

const url = process.env.TEST_DATABASE_URL;
const sql = readFileSync(join(__dirname, '../../migrations/1763900000000_onboarding.sql'), 'utf8');
const [up, down] = sql.split('-- Down Migration').map((s) => s.replace('-- Up Migration', ''));
const actor = { oid: '00000000-0000-0000-0000-000000000001', name: 'Hana Admin' };

describe.skipIf(!url)('PgOnboardingRepository (needs TEST_DATABASE_URL)', () => {
  let pool: Pool;
  let repo: PgOnboardingRepository;
  let employeeId: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query('DROP TABLE IF EXISTS audit_log, checklist_items, onboarding_records, employees');
    await pool.query(up);
    repo = new PgOnboardingRepository(pool);
  });

  afterAll(async () => {
    await pool.query(down);
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE audit_log, checklist_items, onboarding_records, employees CASCADE');
    const { rows } = await pool.query(
      `INSERT INTO employees (email, display_name) VALUES ('a@example.com', 'Priya Raman') RETURNING id`,
    );
    employeeId = rows[0].id;
  });

  it('has no due-date, deadline or reminder column', async () => {
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name IN ('checklist_items', 'onboarding_records')
          AND column_name ~* 'due|deadline|remind'`,
    );
    expect(rows).toEqual([]);
  });

  it('keeps entra_oid and employee_id unique', async () => {
    const oid = '00000000-0000-0000-0000-0000000000aa';
    await pool.query(`UPDATE employees SET entra_oid = $1`, [oid]);
    await expect(
      pool.query(`INSERT INTO employees (entra_oid, email, display_name) VALUES ($1, 'b@example.com', 'B')`, [oid]),
    ).rejects.toThrow();
    await repo.createRecord({ employeeId, startDate: '2026-12-01' }, actor);
    await expect(repo.createRecord({ employeeId, startDate: '2026-12-02' }, actor)).rejects.toThrow();
  });

  it('writes the change and its audit entry together', async () => {
    const rec = await repo.createRecord({ employeeId, startDate: '2026-12-01' }, actor);
    const item = await repo.addItem(rec.id, { stage: 'first_week', title: 'Meet', ownerName: '' }, actor);
    await repo.updateItem(rec.id, item.id, { done: true }, actor);
    const audit = await repo.listAudit(rec.id);
    expect(audit.map((a) => a.action)).toEqual(['record.created', 'item.added', 'item.updated']);
    expect(audit[2].before).toMatchObject({ done: false });
    expect(audit[2].after).toMatchObject({ done: true });
  });

  it('rolls the change back when the audit insert fails', async () => {
    await pool.query(`ALTER TABLE audit_log ADD CONSTRAINT no_audit CHECK (false)`);
    try {
      await expect(repo.createRecord({ employeeId, startDate: '2026-12-01' }, actor)).rejects.toThrow();
    } finally {
      await pool.query(`ALTER TABLE audit_log DROP CONSTRAINT no_audit`);
    }
    expect(await repo.listRecords()).toEqual([]);
  });
});

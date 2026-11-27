import { afterAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { freshTestPool, TEST_DATABASE_URL } from '../db/test-database';
import { describeDefectRepository } from './defect.repository.contract';
import type { SeedData } from './in-memory-defect.repository';
import { PgDefectRepository } from './pg-defect.repository';

// These need a PostgreSQL database: set TEST_DATABASE_URL to run them (CI provides one).
const describeWithDb = describe.skipIf(!TEST_DATABASE_URL);

let pool: Pool | undefined;

async function seed(p: Pool, data: SeedData) {
  const people = new Set<string>();
  const creators = new Map<string, string>();
  for (const project of data.projects) project.members.forEach((m) => people.add(m));
  for (const d of data.defects) {
    if (d.assigneeId) people.add(d.assigneeId);
    if (d.createdByName) creators.set(d.createdByName, `creator-${d.createdByName}`);
  }
  for (const id of people) {
    await p.query('INSERT INTO people (id, display_name) VALUES ($1, $1)', [id]);
  }
  for (const [name, id] of creators) {
    await p.query('INSERT INTO people (id, display_name) VALUES ($1, $2)', [id, name]);
  }
  for (const project of data.projects) {
    await p.query('INSERT INTO projects (id, name) VALUES ($1, $2)', [project.id, project.name]);
    for (const member of project.members) {
      await p.query('INSERT INTO project_members (project_id, person_id) VALUES ($1, $2)', [
        project.id,
        member,
      ]);
    }
  }
  for (const d of data.defects) {
    await p.query(
      `INSERT INTO defects (id, project_id, title, severity, status, assignee_id, created_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        d.id,
        d.projectId,
        d.title,
        d.severity,
        d.status,
        d.assigneeId,
        d.createdByName ? creators.get(d.createdByName) : null,
        d.updatedAt,
      ],
    );
  }
}

if (TEST_DATABASE_URL) {
  describeDefectRepository('PostgreSQL', async () => {
    await pool?.end();
    pool = await freshTestPool();
    const current = pool;
    return { repo: new PgDefectRepository(current), seed: (data) => seed(current, data) };
  });
}

describeWithDb('PostgreSQL defect schema', () => {
  afterAll(async () => {
    await pool?.end();
  });

  it('rejects an unknown status or severity', async () => {
    await pool?.end();
    pool = await freshTestPool();
    await pool.query("INSERT INTO projects (id, name) VALUES ('p', 'P')");
    const insert = (severity: string, status: string) =>
      pool!.query(
        'INSERT INTO defects (project_id, title, severity, status) VALUES ($1, $2, $3, $4)',
        ['p', 't', severity, status],
      );
    await expect(insert('Medium', 'Done')).rejects.toThrow(/check constraint/);
    await expect(insert('Urgent', 'Open')).rejects.toThrow(/check constraint/);
    await expect(insert('Medium', 'Open')).resolves.toBeDefined();
  });
});

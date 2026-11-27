import { afterAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { runMigrations } from './migrate';
import { freshTestPool, TEST_DATABASE_URL } from './test-database';
import { runSeed } from './seed';
import { MyWorkService } from '../my-work/my-work.service';
import { PgDefectRepository } from '../my-work/pg-defect.repository';

// These need a PostgreSQL database: set TEST_DATABASE_URL to run them (CI provides one).
describe.skipIf(!TEST_DATABASE_URL)('migrations and seed', () => {
  let pool: Pool;

  afterAll(async () => {
    await pool?.end();
  });

  it('runs twice as a no-op and records the migration once', async () => {
    pool = await freshTestPool();
    expect(await runMigrations(pool)).toEqual([]);
    const { rows } = await pool.query('SELECT name FROM schema_migrations');
    expect(rows).toEqual([{ name: '0001_defects.sql' }]);
  });

  it('seeds idempotently: 15 defects, 11 open for the person', async () => {
    await runSeed(pool, 'sub-1');
    await runSeed(pool, 'sub-1');
    expect((await pool.query('SELECT count(*)::int AS n FROM defects')).rows[0].n).toBe(15);
    const mine = await new MyWorkService(new PgDefectRepository(pool)).getMyWork('sub-1');
    expect(mine.openDefects.total).toBe(11);
    expect(mine.openDefects.items).toHaveLength(10);
    expect(mine.recentlyUpdated).toHaveLength(10);
  });
});

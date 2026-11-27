import { Pool } from 'pg';
import { runMigrations } from './migrate';

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

/** A pool on a freshly migrated, empty TEST_DATABASE_URL database. */
export async function freshTestPool(): Promise<Pool> {
  const pool = new Pool({ connectionString: TEST_DATABASE_URL });
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await runMigrations(pool);
  return pool;
}

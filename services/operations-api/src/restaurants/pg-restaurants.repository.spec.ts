import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from '../database/migrate';
import { PgRestaurantsRepository } from './pg-restaurants.repository';

// Integration test: runs only when a throwaway database is provided.
describe.skipIf(!process.env.TEST_DATABASE_URL)('PgRestaurantsRepository (database)', () => {
  let pool: Pool;
  let repo: PgRestaurantsRepository;

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    await migrate(pool);
    await pool.query(
      `TRUNCATE restaurant CASCADE`,
    );
    await pool.query(readFileSync(join(__dirname, '..', '..', 'seeds', 'dev-restaurants.sql'), 'utf8'));
    repo = new PgRestaurantsRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('migrate is idempotent and records the migration once', async () => {
    expect(await migrate(pool)).toEqual([]);
    const { rows } = await pool.query(
      `SELECT name FROM schema_migration WHERE name = '0001_restaurant_catalogue.sql'`,
    );
    expect(rows).toHaveLength(1);
  });

  it('lists every restaurant without a location, closed ones included', async () => {
    const all = await repo.list();
    expect(all).toHaveLength(3);
    expect(all.find((r) => r.name === 'Green Bowl Kitchen')?.isOpen).toBe(false);
  });

  it('filters by exact service location', async () => {
    expect((await repo.list('2040')).map((r) => r.name)).toEqual(['Green Bowl Kitchen']);
    expect(await repo.list('9999')).toEqual([]);
  });

  it('keeps unavailable items and reads the menu fresh', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const first = await repo.findMenu(id);
    expect(first?.categories[0].items.map((i) => i.isAvailable)).toEqual([true, false]);
    await pool.query(
      `UPDATE menu_item SET name = 'Shoyu ramen deluxe' WHERE id = 'b1111111-1111-4111-8111-111111111111'`,
    );
    await pool.query(`UPDATE restaurant SET menu_updated_at = now() WHERE id = $1`, [id]);
    const second = await repo.findMenu(id);
    expect(second?.categories[0].items[0].name).toBe('Shoyu ramen deluxe');
  });

  it('returns null for an unknown restaurant', async () => {
    expect(await repo.findMenu('99999999-9999-4999-8999-999999999999')).toBeNull();
  });
});

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

export interface Queryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: any[] }>;
}

/** Applies migrations/*.sql in filename order, once each; returns the names applied. */
export async function applyMigrations(db: Queryable, dir: string): Promise<string[]> {
  await db.query(
    'create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())',
  );
  const done = new Set((await db.query('select name from schema_migrations')).rows.map((r) => r.name));
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    await db.query('begin');
    try {
      await db.query(readFileSync(join(dir, file), 'utf8'));
      await db.query('insert into schema_migrations (name) values ($1)', [file]);
      await db.query('commit');
    } catch (err) {
      await db.query('rollback');
      throw err;
    }
    applied.push(file);
  }
  return applied;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const applied = await applyMigrations(client, join(__dirname, '../../migrations'));
    console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'No pending migrations');
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

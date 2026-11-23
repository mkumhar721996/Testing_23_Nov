import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

// Runs the numbered migrations/*.sql files in order; applied names are recorded in schema_migrations.
async function migrate(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  const dir = join(__dirname, '..', '..', 'migrations');
  const files = readdirSync(dir)
    .filter((f) => /^\d+_.*\.sql$/.test(f) && !f.endsWith('.down.sql'))
    .sort();

  const pool = new Pool({ connectionString });
  try {
    await pool.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const { rows } = await pool.query<{ name: string }>('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));
    for (const file of files) {
      if (applied.has(file)) continue;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(readFileSync(join(dir, file), 'utf8'));
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});

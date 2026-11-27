import { Pool } from 'pg';

const COLLEAGUES = [
  ['seed-person-daniel', 'Daniel Nakamura'],
  ['seed-person-priya', 'Priya Kowalski'],
  ['seed-person-omar', 'Omar Okafor'],
];
const PROJECTS = [
  ['seed-project-payments', 'Payments portal'],
  ['seed-project-field', 'Field service app'],
];

// [id, title, project, severity, status, assignee ('me' or colleague id), creator, hours since update]
const DEFECTS: [string, string, number, string, string, string, string, number][] = [
  ['104', 'Search ignores the job reference prefix', 1, 'Low', 'Resolved', 'seed-person-omar', 'seed-person-daniel', 504],
  ['108', 'Dark mode hides the card number hint', 0, 'Low', 'Open', 'seed-person-priya', 'seed-person-daniel', 408],
  ['112', 'Push notification opens the wrong job', 1, 'Medium', 'In Progress', 'me', 'seed-person-daniel', 360],
  ['115', 'Settlement report totals differ from the ledger', 0, 'High', 'Open', 'me', 'seed-person-priya', 312],
  ['118', 'Signature pad ignores stylus input', 1, 'Medium', 'Closed', 'me', 'seed-person-omar', 240],
  ['121', 'Tax line shows twice for EU customers', 0, 'Medium', 'Open', 'me', 'seed-person-priya', 216],
  ['124', 'Map pin jumps when the device rotates', 1, 'Low', 'Open', 'me', 'seed-person-daniel', 168],
  ['126', 'Duplicate receipt email after a retried payment', 0, 'Critical', 'Open', 'me', 'seed-person-omar', 96],
  ['128', 'Export to CSV drops accented characters', 0, 'Medium', 'In Progress', 'me', 'seed-person-priya', 72],
  ['131', 'Technician name missing from the visit summary', 1, 'Low', 'Open', 'me', 'seed-person-daniel', 48],
  ['133', 'Session expires during checkout without a warning', 0, 'High', 'New', 'me', 'seed-person-omar', 44],
  ['135', 'Photo upload fails on files over 10 MB', 1, 'High', 'Reopened', 'me', 'seed-person-priya', 24],
  ['137', 'Invoice PDF cuts off the last line item', 0, 'Medium', 'Open', 'me', 'seed-person-daniel', 12],
  ['139', 'Offline job list stays empty after reconnecting', 1, 'Critical', 'Open', 'seed-person-daniel', 'seed-person-omar', 6],
  ['142', 'Refund total rounds down on partial refunds', 0, 'High', 'In Progress', 'me', 'seed-person-priya', 2],
];

/** Inserts sample projects and defects for one person; safe to run again. */
export async function runSeed(pool: Pool, personSub: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const people = [[personSub, 'Sample person'], ...COLLEAGUES];
    for (const [id, name] of people) {
      await client.query(
        'INSERT INTO people (id, display_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, name],
      );
    }
    for (const [id, name] of PROJECTS) {
      await client.query('INSERT INTO projects (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
        id,
        name,
      ]);
      await client.query(
        'INSERT INTO project_members (project_id, person_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, personSub],
      );
    }
    for (const [num, title, project, severity, status, assignee, creator, hoursAgo] of DEFECTS) {
      await client.query(
        `INSERT INTO defects (id, project_id, title, severity, status, assignee_id, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now() - make_interval(hours => $8 + 24), now() - make_interval(hours => $8))
         ON CONFLICT DO NOTHING`,
        [
          `seed-defect-${num}`,
          PROJECTS[project][0],
          title,
          severity,
          status,
          assignee === 'me' ? personSub : assignee,
          creator,
          hoursAgo,
        ],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  const { DATABASE_URL, SEED_PERSON_SUB } = process.env;
  if (!DATABASE_URL || !SEED_PERSON_SUB) {
    console.error('Set DATABASE_URL and SEED_PERSON_SUB (the Entra ID sub of the person to seed).');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: DATABASE_URL });
  runSeed(pool, SEED_PERSON_SUB)
    .then(() => console.log('Seeded sample projects and defects'))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

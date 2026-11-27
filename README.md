# Testing_23_Nov

## Operations API database

The Operations API stores projects, defects and people in PostgreSQL.

- `DATABASE_URL` — PostgreSQL connection string for the API. Required, no default: the API stops at start when it is unset.
- `pnpm migrate` (in `services/operations-api`) applies the SQL files in `migrations/` and records them in `schema_migrations`. Run it before deploying a new API version; running it again changes nothing.
- `pnpm seed` (in `services/operations-api`) inserts sample projects and defects for one person, by hand only. It needs `DATABASE_URL` and `SEED_PERSON_SUB` (the person's Entra ID `sub`, required, no default), and is safe to run again. Without it a new deployment shows the "No defects found" empty state.
- `TEST_DATABASE_URL` — a throwaway PostgreSQL database (its `public` schema is dropped and recreated) for the API's database tests; those tests are skipped when it is unset.

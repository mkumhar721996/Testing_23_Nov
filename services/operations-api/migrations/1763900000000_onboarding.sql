-- Up Migration
CREATE TABLE employees (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entra_oid     uuid UNIQUE,
  email         text NOT NULL UNIQUE,
  display_name  text NOT NULL,
  job_title     text NOT NULL DEFAULT '',
  team          text NOT NULL DEFAULT '',
  manager_id    uuid REFERENCES employees(id)
);

CREATE TABLE onboarding_records (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL UNIQUE REFERENCES employees(id),
  start_date  date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE checklist_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id    uuid NOT NULL REFERENCES onboarding_records(id) ON DELETE CASCADE,
  stage        text NOT NULL CHECK (stage IN ('before_day_one','first_week')),
  title        text NOT NULL,
  owner_name   text NOT NULL DEFAULT '',
  done         boolean NOT NULL DEFAULT false,
  position     integer NOT NULL
);

CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  actor_oid   uuid NOT NULL,
  actor_name  text NOT NULL,
  action      text NOT NULL,
  record_id   uuid NOT NULL,
  before      jsonb,
  after       jsonb
);

-- Down Migration
DROP TABLE audit_log;
DROP TABLE checklist_items;
DROP TABLE onboarding_records;
DROP TABLE employees;

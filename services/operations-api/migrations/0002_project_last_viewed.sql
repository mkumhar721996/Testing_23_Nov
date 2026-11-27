CREATE TABLE project_last_viewed (
  person_id text PRIMARY KEY REFERENCES people (id),
  project_id text NOT NULL REFERENCES projects (id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE people (
  id text PRIMARY KEY, -- Entra ID subject (sub)
  display_name text NOT NULL
);

CREATE TABLE projects (
  id text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE project_members (
  project_id text NOT NULL REFERENCES projects (id),
  person_id text NOT NULL REFERENCES people (id),
  PRIMARY KEY (project_id, person_id)
);

CREATE TABLE defects (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  number bigserial NOT NULL UNIQUE,
  project_id text NOT NULL REFERENCES projects (id),
  title text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
  status text NOT NULL CHECK (status IN ('New', 'Open', 'In Progress', 'Resolved', 'Closed', 'Reopened')),
  assignee_id text REFERENCES people (id),
  created_by text REFERENCES people (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX defects_assignee_updated_idx ON defects (assignee_id, updated_at DESC);
CREATE INDEX defects_project_updated_idx ON defects (project_id, updated_at DESC);
CREATE INDEX project_members_person_idx ON project_members (person_id);

create extension if not exists pgcrypto;

create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  retired_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive uniqueness; retired names stay reserved.
create unique index expense_categories_name_key on expense_categories (lower(name));

create table expense_category_audit (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references expense_categories (id),
  action text not null,
  actor text not null,
  at timestamptz not null default now(),
  detail jsonb
);

insert into expense_categories (name) values
  ('Travel'), ('Meals'), ('Lodging'), ('Software'), ('Office supplies'), ('Training'), ('Other')
on conflict (lower(name)) do nothing;

create table if not exists users (
  id uuid primary key,
  entra_object_id text not null unique,
  full_name text not null,
  email text,
  phone text,
  role text not null check (role in ('wfc_admin', 'fundraising_consultant', 'org_admin', 'org_staff')),
  organization_id uuid
);

create table if not exists organizations (
  id uuid primary key,
  name text not null,
  address text not null,
  admin_user_id uuid not null references users (id),
  created_by_user_id uuid not null references users (id),
  fundraising_consultant_user_id uuid references users (id),
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_organization_id_fkey') then
    alter table users
      add constraint users_organization_id_fkey foreign key (organization_id) references organizations (id);
  end if;
end $$;

create index if not exists users_organization_id_idx on users (organization_id);

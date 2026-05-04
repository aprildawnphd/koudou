-- Koudou — initial schema
-- Run this once in Supabase SQL Editor. Idempotent: safe to re-run.

-- ─────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────
-- profiles  (1:1 with auth.users)
-- ─────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  target_roles text[] not null default '{}',
  primary_resume_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────
-- target_companies
-- ─────────────────────────────────────────────────────────
create table if not exists target_companies (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  tier text not null default 'interested' check (tier in ('dream', 'strong', 'interested')),
  notes text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists target_companies_user_id_idx on target_companies(user_id);

-- ─────────────────────────────────────────────────────────
-- jobs
-- ─────────────────────────────────────────────────────────
create table if not exists jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_company_id uuid references target_companies(id) on delete set null,
  company text not null,
  role text not null,
  status text not null default 'applied' check (status in ('saved','applied','screening','interview','offer','rejected','withdrawn','closed')),
  sub_status text,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  match_score smallint check (match_score >= 0 and match_score <= 5),
  due_date timestamptz,
  applied_date timestamptz,
  warm boolean not null default false,
  posted_url text,
  salary_band text,
  description text,
  notes text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_user_id_idx on jobs(user_id);
create index if not exists jobs_status_idx on jobs(user_id, status);
create index if not exists jobs_target_company_idx on jobs(target_company_id);

-- ─────────────────────────────────────────────────────────
-- contacts
-- ─────────────────────────────────────────────────────────
create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_company_id uuid references target_companies(id) on delete set null,
  name text not null,
  role text,
  warmth text not null default 'cold' check (warmth in ('champion','warm','cold')),
  network_role text,
  email text,
  linkedin_url text,
  last_touch timestamptz,
  follow_up timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_user_id_idx on contacts(user_id);
create index if not exists contacts_target_company_idx on contacts(target_company_id);

-- ─────────────────────────────────────────────────────────
-- activities  (timeline events, can be tied to a job and/or contact)
-- ─────────────────────────────────────────────────────────
create table if not exists activities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  type text not null,
  occurred_at timestamptz not null default now(),
  text text,
  created_at timestamptz not null default now()
);

create index if not exists activities_user_id_idx on activities(user_id);
create index if not exists activities_job_id_idx on activities(job_id);
create index if not exists activities_contact_id_idx on activities(contact_id);

-- ─────────────────────────────────────────────────────────
-- resumes
-- ─────────────────────────────────────────────────────────
create table if not exists resumes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  content text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resumes_user_id_idx on resumes(user_id);

-- profiles.primary_resume_id FK now that resumes exists
alter table profiles
  drop constraint if exists profiles_primary_resume_id_fkey;
alter table profiles
  add constraint profiles_primary_resume_id_fkey
  foreign key (primary_resume_id) references resumes(id) on delete set null;

-- ─────────────────────────────────────────────────────────
-- cover_letters
-- ─────────────────────────────────────────────────────────
create table if not exists cover_letters (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  resume_id uuid references resumes(id) on delete set null,
  content text,
  generated_at timestamptz not null default now()
);

create index if not exists cover_letters_user_id_idx on cover_letters(user_id);
create index if not exists cover_letters_job_id_idx on cover_letters(job_id);

-- ─────────────────────────────────────────────────────────
-- interviews
-- ─────────────────────────────────────────────────────────
create table if not exists interviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  scheduled_at timestamptz not null,
  type text,
  panelists text[] not null default '{}',
  prep_notes text,
  created_at timestamptz not null default now()
);

create index if not exists interviews_user_id_idx on interviews(user_id);
create index if not exists interviews_job_id_idx on interviews(job_id);

-- ─────────────────────────────────────────────────────────
-- job_boards
-- ─────────────────────────────────────────────────────────
create table if not exists job_boards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  tag text,
  gated boolean not null default false,
  active boolean not null default true,
  source_url text,
  created_at timestamptz not null default now()
);

create index if not exists job_boards_user_id_idx on job_boards(user_id);

-- ─────────────────────────────────────────────────────────
-- milestones
-- ─────────────────────────────────────────────────────────
create table if not exists milestones (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  fired_at timestamptz not null default now(),
  dismissed_at timestamptz
);

create index if not exists milestones_user_id_idx on milestones(user_id);

-- ─────────────────────────────────────────────────────────
-- Row Level Security — every table scoped by user_id = auth.uid()
-- ─────────────────────────────────────────────────────────

alter table profiles          enable row level security;
alter table target_companies  enable row level security;
alter table jobs              enable row level security;
alter table contacts          enable row level security;
alter table activities        enable row level security;
alter table resumes           enable row level security;
alter table cover_letters     enable row level security;
alter table interviews        enable row level security;
alter table job_boards        enable row level security;
alter table milestones        enable row level security;

-- profiles uses id = auth.uid() (1:1 with auth.users)
drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_select_own" on profiles for select using (id = auth.uid());
create policy "profiles_update_own" on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- All other tables use user_id = auth.uid()
do $$
declare t text;
begin
  foreach t in array array['target_companies','jobs','contacts','activities','resumes','cover_letters','interviews','job_boards','milestones']
  loop
    execute format('drop policy if exists "%1$s_select_own" on %1$s', t);
    execute format('drop policy if exists "%1$s_insert_own" on %1$s', t);
    execute format('drop policy if exists "%1$s_update_own" on %1$s', t);
    execute format('drop policy if exists "%1$s_delete_own" on %1$s', t);
    execute format('create policy "%1$s_select_own" on %1$s for select using (user_id = auth.uid())', t);
    execute format('create policy "%1$s_insert_own" on %1$s for insert with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s_update_own" on %1$s for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s_delete_own" on %1$s for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

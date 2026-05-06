-- Session 6.3 — Skill extraction pipeline
-- Adds the job_skills_snapshots table. Each row captures the skills extracted
-- from one job's description at one point in time. Powers the rebuilt Skills
-- tab (6.4) — ATS positioning, trend tracking over rolling windows, resume
-- audit — by giving us per-job structured skill data we can aggregate.
--
-- Population paths (built in 6.3 + later):
--   1. Backfill — `backfill-skill-snapshots` edge function scans the user's
--      jobs without snapshots and creates them on demand.
--   2. Auto-extraction (later sessions) — when a job is added (manually or
--      from AI Job Search results), client calls extract-job-skills + inserts.

create table public.job_skills_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  skills text[] not null default '{}',
  source text not null default 'tracked',  -- 'tracked' | 'search' | 'manual'
  captured_at timestamptz not null default now()
);

create index job_skills_snapshots_user_captured_idx
  on public.job_skills_snapshots (user_id, captured_at desc);

create index job_skills_snapshots_user_job_idx
  on public.job_skills_snapshots (user_id, job_id);

alter table public.job_skills_snapshots enable row level security;

create policy "job_skills_snapshots select own"
  on public.job_skills_snapshots for select
  using (user_id = auth.uid());

create policy "job_skills_snapshots insert own"
  on public.job_skills_snapshots for insert
  with check (user_id = auth.uid());

create policy "job_skills_snapshots update own"
  on public.job_skills_snapshots for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "job_skills_snapshots delete own"
  on public.job_skills_snapshots for delete
  using (user_id = auth.uid());

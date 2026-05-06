-- Session 5 schema additions
-- ─────────────────────────────────────────────────────────────────────────
-- Adds:
--   1. Profile fields needed by AI features (resume, summary, search prefs).
--      Match-Lovable subset chosen during scoping. PDF parsing for resumes
--      is deferred — `resume_text` is paste-only for v1.
--   2. api_rate_limits table powering per-user rate limits on AI edge
--      functions (e.g. 20 cover letters/hour). Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────

-- ─── Profile fields for AI matching ──────────────────────────────────────
alter table profiles add column if not exists resume_text text;
alter table profiles add column if not exists summary text;
alter table profiles add column if not exists locations text[] not null default '{}';
alter table profiles add column if not exists remote_preference text
  check (remote_preference in ('remote','hybrid','onsite','flexible'));
alter table profiles add column if not exists min_base_salary integer;
alter table profiles add column if not exists must_haves text[] not null default '{}';
alter table profiles add column if not exists nice_to_haves text[] not null default '{}';
alter table profiles add column if not exists industries text[] not null default '{}';
alter table profiles add column if not exists skills text[] not null default '{}';

-- ─── api_rate_limits ─────────────────────────────────────────────────────
-- One row per AI call. Edge function inserts a row before serving, then
-- counts rows in the recent window to enforce per-user quotas.
create table if not exists api_rate_limits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  function_name text not null,
  called_at timestamptz not null default now()
);

create index if not exists api_rate_limits_user_function_idx
  on api_rate_limits(user_id, function_name, called_at desc);

alter table api_rate_limits enable row level security;

-- Defense in depth: users can read their own counters, but rows are written
-- by the edge function under the service role so no insert policy needed
-- for the authenticated role.
drop policy if exists "rate_limits_select_own" on api_rate_limits;
create policy "rate_limits_select_own" on api_rate_limits
  for select using (user_id = auth.uid());

-- Session 6 — Insights surface
-- Adds the weekly_plans table for storing AI-generated coach plans.
-- Skill gap analysis runs on the fly (no persistence) so no table for it here.

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  scoreboard jsonb not null default '{}'::jsonb,
  plan jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index weekly_plans_user_week_idx
  on public.weekly_plans (user_id, week_start desc);

alter table public.weekly_plans enable row level security;

create policy "weekly_plans select own"
  on public.weekly_plans for select
  using (user_id = auth.uid());

create policy "weekly_plans insert own"
  on public.weekly_plans for insert
  with check (user_id = auth.uid());

create policy "weekly_plans update own"
  on public.weekly_plans for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "weekly_plans delete own"
  on public.weekly_plans for delete
  using (user_id = auth.uid());

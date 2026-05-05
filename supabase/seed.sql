-- Koudou demo seed
-- ─────────────────────────────────────────────────────────────────────────
-- Populates the signed-in user's account with synthetic demo data for
-- hero shots, README screenshots, and visual QA. Contact names are
-- deliberately fictional combinations across cultural roots to minimize
-- accidental overlap with real people. Companies are real public
-- companies used as generic backdrops.
--
-- WHY THE DO-BLOCK
--   The Supabase SQL Editor runs as the `postgres` superuser, so
--   `auth.uid()` returns NULL. We resolve the target user_id once from
--   `auth.users` and pass it explicitly. Forkers can replace the email
--   in the lookup if needed.
--
-- HOW TO RUN
--   1. Sign in to Koudou at http://localhost:5173 at least once so your
--      auth.users row exists (any user_id from auth.users is fine — the
--      seed picks the first one if you're the only signed-in user).
--   2. Open Supabase SQL Editor:
--      https://supabase.com/dashboard/project/zofozmbovnqavpcyfvyp/sql/new
--   3. Paste this whole file. Run.
--
-- ASSUMPTIONS
--   - Your tables for the current user are EMPTY. If you've already added
--     real data, run the WIPE block at the bottom first to clear it.
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  uid uuid;
begin
  -- Resolve the demo user. Defaults to "the only user" — if you have
  -- multiple users in auth.users, swap the predicate for an explicit
  -- email match: where email = 'you@example.com'.
  select id into uid from auth.users order by created_at asc limit 1;
  if uid is null then
    raise exception 'No rows in auth.users — sign in to the app at least once before seeding.';
  end if;
  raise notice 'Seeding for user_id %', uid;

  -- ─── Target companies ──────────────────────────────────────────────────
  insert into target_companies (user_id, name, tier, notes) values
    (uid, 'GitLab',         'dream',      'DevOps platform; remote-first; strong PM track'),
    (uid, 'Veeva Systems',  'dream',      'Life sciences cloud; product platforms group'),
    (uid, 'Stripe',         'dream',      'Payments infra; growing PM org'),
    (uid, 'Toptal',         'strong',     'Talent marketplace; CPO referral path open'),
    (uid, 'TriNetX',        'strong',     'Real-world data; hiring SrDir for RWD platform'),
    (uid, 'Hyland',         'strong',     'Content services; VP Product opening'),
    (uid, 'Labcorp',        'interested', 'Diagnostics; broad PM org'),
    (uid, 'Parexel',        'interested', 'Clinical research; product roles in trial tech');

  -- ─── Contacts ──────────────────────────────────────────────────────────
  insert into contacts (user_id, target_company_id, name, role, warmth, network_role, last_touch, follow_up, notes) values
    (uid, (select id from target_companies where name = 'GitLab' and user_id = uid),
     'Linnea Quintero', 'Director of Engineering', 'champion', 'booster',
     now() - interval '2 days',  now() + interval '1 day',
     'Confirmed she submitted the referral. Onsite scheduled.'),
    (uid, (select id from target_companies where name = 'Stripe' and user_id = uid),
     'Tobias Asare',    'Head of Talent',          'champion', 'booster',
     now() - interval '3 days',  now() + interval '4 days',
     'Asked me to send updated resume; will route to PM org.'),
    (uid, (select id from target_companies where name = 'GitLab' and user_id = uid),
     'Beatrix Aldine',  'Recruiter',               'warm',     'recruiter_internal',
     now() - interval '5 days',  now() + interval '2 days',
     'Recruiter at GitLab; coordinating onsite logistics.'),
    (uid, (select id from target_companies where name = 'TriNetX' and user_id = uid),
     'Cyrus Tane',      'VP Product',              'warm',     'booster',
     now() - interval '7 days',  now() + interval '5 days',
     'Promised to introduce me to hiring manager.'),
    (uid, (select id from target_companies where name = 'Toptal' and user_id = uid),
     'Esperanza Lin',   'CPO',                     'warm',     'booster',
     now() - interval '4 days',  now() + interval '1 day',
     'Met for coffee; sponsoring the Round 2 process.'),
    (uid, (select id from target_companies where name = 'Veeva Systems' and user_id = uid),
     'Theo Marchetti',  'VP Engineering',          'warm',     'booster',
     now() - interval '6 days',  now() + interval '5 days',
     'Champion for Research Platforms role.'),
    (uid, (select id from target_companies where name = 'TriNetX' and user_id = uid),
     'Jules Okonkwo',   'PM',                      'cold',     'connector',
     now() - interval '21 days', null,
     null),
    (uid, (select id from target_companies where name = 'Stripe' and user_id = uid),
     'Naia Faroughi',   'Product Lead',            'cold',     'connector',
     now() - interval '40 days', null,
     'Reach out to reactivate.'),
    (uid, (select id from target_companies where name = 'Veeva Systems' and user_id = uid),
     'Henrik Bartolo',  'Sr PM',                   'cold',     'connector',
     now() - interval '32 days', null,
     'Reach out to reactivate.');

  -- ─── Jobs ──────────────────────────────────────────────────────────────
  insert into jobs (user_id, target_company_id, company, role, status, sub_status, priority, match_score, applied_date, warm, location) values
    (uid, (select id from target_companies where name = 'GitLab'        and user_id = uid),
     'GitLab',        'VP, Product',                        'interview', 'Onsite scheduled',  'high',   5, now() - interval '6 days',  true,  'Remote'),
    (uid, (select id from target_companies where name = 'Toptal'        and user_id = uid),
     'Toptal',        'Head of Product, Talent',            'interview', 'Round 2',           'high',   4, now() - interval '8 days',  true,  'Remote'),
    (uid, (select id from target_companies where name = 'TriNetX'       and user_id = uid),
     'TriNetX',       'Sr Director, Real-World Data',       'interview', 'Hiring mgr',        'medium', 4, now() - interval '10 days', true,  'Boston'),
    (uid, (select id from target_companies where name = 'Veeva Systems' and user_id = uid),
     'Veeva Systems', 'VP Product, Research Platforms',     'interview', 'Recruiter screen',  'medium', 5, now() - interval '12 days', true,  'Remote'),
    (uid, (select id from target_companies where name = 'Hyland'        and user_id = uid),
     'Hyland',        'VP Product',                         'screening', 'Phone screen',      'medium', 3, now() - interval '5 days',  false, 'Remote'),
    (uid, (select id from target_companies where name = 'Stripe'        and user_id = uid),
     'Stripe',        'Head of Product, Payments Infra',    'screening', 'Recruiter intro',   'medium', 4, now() - interval '4 days',  true,  'SF'),
    (uid, (select id from target_companies where name = 'Parexel'       and user_id = uid),
     'Parexel',       'Senior Director, Product',           'applied',   'Submitted',         'low',    3, now() - interval '18 days', false, 'Remote'),
    (uid, (select id from target_companies where name = 'Veeva Systems' and user_id = uid),
     'Veeva Systems', 'VP Product, Trial Tech',             'applied',   'Submitted',         'medium', 4, now() - interval '15 days', true,  'Remote'),
    (uid, (select id from target_companies where name = 'Labcorp'       and user_id = uid),
     'Labcorp',       'Head of Product',                    'applied',   'Recruiter intro',   'low',    3, now() - interval '8 days',  false, 'Remote'),
    (uid, null,
     'Acme Staffing', 'Sr Director, PM (contractor)',       'offer',     'Reviewing terms',   'high',   4, now() - interval '25 days', true,  'Remote');

  -- ─── Activities (focal job: GitLab VP, Product) ────────────────────────
  insert into activities (user_id, job_id, type, occurred_at, text) values
    (uid,
     (select id from jobs where role = 'VP, Product' and company = 'GitLab' and user_id = uid limit 1),
     'interview', now(),                       'Onsite scheduled — Wed 2pm'),
    (uid,
     (select id from jobs where role = 'VP, Product' and company = 'GitLab' and user_id = uid limit 1),
     'message',   now() - interval '3 days',   'Linnea confirmed referral submission'),
    (uid,
     (select id from jobs where role = 'VP, Product' and company = 'GitLab' and user_id = uid limit 1),
     'apply',     now() - interval '6 days',   'Application submitted'),
    (uid,
     (select id from jobs where role = 'VP, Product' and company = 'GitLab' and user_id = uid limit 1),
     'note',      now() - interval '8 days',   'Linnea intro''d — coffee chat went well');

  -- ─── Interviews (next 7 days, for Today's This Week strip) ────────────
  insert into interviews (user_id, job_id, scheduled_at, type, panelists, prep_notes) values
    (uid,
     (select id from jobs where role = 'VP, Product' and company = 'GitLab' and user_id = uid limit 1),
     date_trunc('day', now()) + interval '2 days' + interval '14 hours',
     'onsite',
     array['Linnea Quintero', 'Hiring Manager', 'CPO'],
     'Bring two product critiques + the platform-vs-tools framing.'),
    (uid,
     (select id from jobs where role = 'Head of Product, Talent' and company = 'Toptal' and user_id = uid limit 1),
     date_trunc('day', now()) + interval '4 days' + interval '11 hours',
     'panel',
     array['Esperanza Lin (CPO)', 'VP Eng', 'Sr PM'],
     'Round 2 — focus on marketplace dynamics, supply-side levers.');

  -- ─── Milestone (for the Today ack banner) ─────────────────────────────
  insert into milestones (user_id, kind, fired_at) values
    (uid, 'first_interview', now() - interval '2 hours');

  raise notice 'Seed complete.';
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- Done. Refresh Koudou in your browser:
--   /today        → ack banner + Up Next queue + This Week strip with events
--   /jobs         → 4 status groups populated
--   /jobs (click) → focal GitLab row opens DetailPanel with activity timeline
--   /network      → 3 warmth groups populated
--   /targets      → 3 tiers populated with per-row aggregates
-- ─────────────────────────────────────────────────────────────────────────


-- ─── WIPE BLOCK — only run if you want to re-seed from scratch ──────────
-- Uncomment and run BEFORE re-running the inserts above. Destructive for
-- the resolved user only. Order matters (FKs cascade but explicit is safer).
--
-- do $$
-- declare uid uuid;
-- begin
--   select id into uid from auth.users order by created_at asc limit 1;
--   delete from activities       where user_id = uid;
--   delete from interviews       where user_id = uid;
--   delete from milestones       where user_id = uid;
--   delete from cover_letters    where user_id = uid;
--   delete from jobs             where user_id = uid;
--   delete from contacts         where user_id = uid;
--   delete from target_companies where user_id = uid;
-- end $$;
-- ─────────────────────────────────────────────────────────────────────────

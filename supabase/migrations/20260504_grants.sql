-- Koudou — grant schema/table access to the `authenticated` role.
-- Required because "Automatically expose new tables" is off on this project.
-- Without these GRANTs, PostgREST returns 401/permission-denied even for
-- signed-in users, before RLS policies have a chance to apply.

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Future-proof: same grants get applied to anything created later in this schema.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

-- The `anon` role (used before sign-in) gets no table access on purpose.
-- All reads must happen post-OAuth as the `authenticated` role, where RLS
-- scopes rows to user_id = auth.uid().

-- Grant service_role access to all public tables.
-- Required because "Automatically expose new tables" is off on this project,
-- which (with the new sb_secret_* key format) means even the service_role
-- doesn't auto-receive table grants. Edge functions hit a 42501 permission-
-- denied without this.
--
-- Idempotent — safe to re-run.

grant usage on schema public to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Future-proof: same grants apply to anything created later in this schema.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;

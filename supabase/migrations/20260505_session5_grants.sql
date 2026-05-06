-- Session 5 grants — required because "Automatically expose new tables" is
-- off on this project. Run after the schema migration.

grant select on api_rate_limits to authenticated;
-- No insert/update/delete grants — the edge function writes via the
-- service role, not the user's authenticated role.

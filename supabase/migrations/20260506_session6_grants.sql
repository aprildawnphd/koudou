-- GRANTs for the new weekly_plans table.
-- "Auto expose new tables" is off on this project, so this is required for
-- the Data API to surface the table to authenticated users. service_role
-- gets full access via the existing default-privileges grant from
-- 20260505_session5_service_role_grants.sql.

grant select, insert, update, delete on public.weekly_plans to authenticated;

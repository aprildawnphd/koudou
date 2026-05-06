-- GRANTs for the new job_skills_snapshots table.
-- "Auto expose new tables" is off on this project, so this is required.
-- service_role gets full access via the existing default-privileges grant
-- from 20260505_session5_service_role_grants.sql.

grant select, insert, update, delete on public.job_skills_snapshots to authenticated;

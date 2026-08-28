-- SCM SPIP - Phase 3B: controlled fresh-start reset
-- PURPOSE: Remove historical/test operational data while preserving ONLY the two
-- established Supabase Auth/profile administrators.
-- RUN ONLY IN THE SCM SPIP SUPABASE PROJECT.
-- This migration never deletes from auth.users or public.profiles.

begin;

-- Clear the legacy staff directory and every table linked to it by foreign keys.
-- CASCADE intentionally clears old prospects, contacts, activities, meetings, tasks,
-- reminders, reports, workspaces, workspace children, notifications, subscriptions,
-- AI history and any other legacy records referencing public.users.
truncate table public.users cascade;

-- Clear operational/test tables that are not necessarily linked to public.users.
truncate table
  public.news_articles,
  public.discovered_leads,
  public.audit_logs,
  public.saved_sessions,
  public.serena_audit_logs,
  public.system_audit_logs,
  public.discovery_sessions,
  public.discovery_queues
restart identity cascade;

-- Phase 3 tables may not exist on older databases, so clear them defensively.
do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'campaigns',
    'client_conversions',
    'prospect_collaborators'
  ]
  loop
    if to_regclass('public.' || relation_name) is not null then
      execute format('truncate table public.%I restart identity cascade', relation_name);
    end if;
  end loop;
end $$;

-- Rebuild the compatibility directory from the canonical Supabase profiles.
-- Authentication and authorization remain owned exclusively by Supabase Auth/profiles.
insert into public.users (
  id,
  full_name,
  email,
  role,
  department,
  avatar_url,
  status,
  created_at,
  auth_user_id
)
select
  p.id::text,
  p.full_name,
  lower(p.email),
  p.permission_level::text,
  coalesce(p.department, 'Asset Management'),
  p.avatar_url,
  'Approved',
  now(),
  p.id
from public.profiles p
where p.status = 'ACTIVE'
  and p.permission_level in ('SUPER_ADMIN', 'HOD_ADMIN')
  and lower(p.email) in (
    'wisdom.okoh@scmcapitalng.com',
    'omololu.ajediran@scmcapitalng.com'
  );

-- Hard safety assertion: fresh start must leave exactly the two established admins.
do $$
declare
  profile_admin_count integer;
  legacy_admin_count integer;
begin
  select count(*) into profile_admin_count
  from public.profiles
  where status = 'ACTIVE'
    and permission_level in ('SUPER_ADMIN', 'HOD_ADMIN')
    and lower(email) in (
      'wisdom.okoh@scmcapitalng.com',
      'omololu.ajediran@scmcapitalng.com'
    );

  select count(*) into legacy_admin_count from public.users;

  if profile_admin_count <> 2 then
    raise exception 'Fresh-start aborted: expected exactly 2 canonical administrator profiles, found %', profile_admin_count;
  end if;

  if legacy_admin_count <> 2 then
    raise exception 'Fresh-start aborted: expected exactly 2 compatibility users, found %', legacy_admin_count;
  end if;
end $$;

commit;

-- VERIFY AFTER RUNNING:
-- select email, permission_level, status from public.profiles order by email;
-- select email, role, status from public.users order by email;
-- select
--   (select count(*) from public.prospects) as prospects,
--   (select count(*) from public.contacts) as contacts,
--   (select count(*) from public.activities) as activities,
--   (select count(*) from public.meetings) as meetings,
--   (select count(*) from public.tasks) as tasks,
--   (select count(*) from public.workspaces) as workspaces,
--   (select count(*) from public.notifications) as notifications;

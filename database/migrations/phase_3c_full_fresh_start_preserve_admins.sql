-- SCM SPIP - Phase 3C: FULL fresh-start reset preserving only administrators/HOD
-- RUN ONLY IN THE SCM SPIP SUPABASE PROJECT.
--
-- PURPOSE
--   1) Remove every non-admin/HOD Supabase Auth user and profile.
--   2) Wipe operational CRM/research/reporting/test data.
--   3) Preserve SUPER_ADMIN and HOD_ADMIN accounts only.
--   4) Rebuild the legacy public.users compatibility directory from those preserved profiles.
--
-- IMPORTANT: This is destructive for all non-admin/HOD users and operational data.

begin;

create temporary table spip_keep_admins on commit drop as
select id, lower(email) as email, permission_level
from public.profiles
where permission_level in ('SUPER_ADMIN', 'HOD_ADMIN');

-- Safety gate: never run a destructive reset unless at least one protected administrator exists.
do $$
declare
  keep_count integer;
begin
  select count(*) into keep_count from spip_keep_admins;
  if keep_count < 1 then
    raise exception 'Fresh-start aborted: no SUPER_ADMIN/HOD_ADMIN profile was found.';
  end if;
end $$;

-- Clear the compatibility directory first. CASCADE removes rows in tables that reference it.
truncate table public.users cascade;

-- Clear operational and test data defensively. Missing optional tables are skipped.
do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'prospects',
    'contacts',
    'activities',
    'meetings',
    'tasks',
    'reminders',
    'weekly_reports',
    'workspaces',
    'workspace_notes',
    'workspace_proposals',
    'workspace_presentations',
    'workspace_ai_conversations',
    'workspace_search_history',
    'notifications',
    'push_subscriptions',
    'news_articles',
    'discovered_leads',
    'discovery_sessions',
    'discovery_queues',
    'audit_logs',
    'serena_audit_logs',
    'system_audit_logs',
    'saved_sessions',
    'ai_search_history',
    'apollo_enrichment_cache',
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

-- Delete every non-admin/HOD application profile.
delete from public.profiles p
where not exists (
  select 1 from spip_keep_admins k where k.id = p.id
);

-- Delete every non-admin/HOD Supabase Auth identity.
-- This also removes stale/half-created signup identities from previous failed attempts.
delete from auth.users u
where not exists (
  select 1 from spip_keep_admins k where k.id = u.id
);

-- Canonical protected accounts remain active.
update public.profiles
set status = 'ACTIVE', updated_at = now()
where id in (select id from spip_keep_admins)
  and permission_level in ('SUPER_ADMIN', 'HOD_ADMIN');

-- Rebuild the legacy compatibility directory only for protected admins/HOD.
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
where p.permission_level in ('SUPER_ADMIN', 'HOD_ADMIN')
  and p.status = 'ACTIVE';

-- Final safety assertions.
do $$
declare
  expected_count integer;
  profile_count integer;
  auth_count integer;
  directory_count integer;
begin
  select count(*) into expected_count from spip_keep_admins;
  select count(*) into profile_count from public.profiles;
  select count(*) into auth_count
    from auth.users u
    where exists (select 1 from spip_keep_admins k where k.id = u.id);
  select count(*) into directory_count from public.users;

  if profile_count <> expected_count then
    raise exception 'Fresh-start aborted: expected % protected profiles, found %.', expected_count, profile_count;
  end if;
  if auth_count <> expected_count then
    raise exception 'Fresh-start aborted: expected % protected Auth users, found %.', expected_count, auth_count;
  end if;
  if directory_count <> expected_count then
    raise exception 'Fresh-start aborted: expected % compatibility users, found %.', expected_count, directory_count;
  end if;
end $$;

commit;

-- VERIFY AFTER SUCCESS:
-- select email, permission_level, status from public.profiles order by email;
-- select email, role, status from public.users order by email;
-- select count(*) as auth_users_remaining from auth.users;
-- select
--   (select count(*) from public.prospects) as prospects,
--   (select count(*) from public.contacts) as contacts,
--   (select count(*) from public.activities) as activities,
--   (select count(*) from public.meetings) as meetings,
--   (select count(*) from public.tasks) as tasks,
--   (select count(*) from public.workspaces) as workspaces;

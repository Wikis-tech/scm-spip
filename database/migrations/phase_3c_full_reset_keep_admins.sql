-- SCM SPIP - Phase 3C: full fresh reset, preserving ONLY the two established administrators
-- RUN ONLY IN THE SCM SPIP SUPABASE PROJECT.
-- This script removes non-admin Auth users/profiles and clears operational history.
-- Preserved accounts:
--   wisdom.okoh@scmcapitalng.com      -> SUPER_ADMIN
--   omololu.ajediran@scmcapitalng.com -> HOD_ADMIN

begin;

-- 1) Safety gate: both protected administrator profiles must exist and be ACTIVE.
do $$
declare
  protected_count integer;
begin
  select count(*) into protected_count
  from public.profiles
  where lower(email) in (
    'wisdom.okoh@scmcapitalng.com',
    'omololu.ajediran@scmcapitalng.com'
  )
    and status = 'ACTIVE'
    and permission_level in ('SUPER_ADMIN', 'HOD_ADMIN');

  if protected_count <> 2 then
    raise exception 'RESET ABORTED: expected 2 protected ACTIVE administrator profiles, found %', protected_count;
  end if;
end $$;

-- 2) Clear the legacy compatibility directory first. CASCADE clears data linked to public.users
-- such as prospects, contacts, activities, meetings, tasks, reminders, workspaces and reports.
truncate table public.users cascade;

-- 3) Clear additional operational / test tables defensively when they exist.
do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'news_articles',
    'discovered_leads',
    'audit_logs',
    'saved_sessions',
    'serena_audit_logs',
    'system_audit_logs',
    'discovery_sessions',
    'discovery_queues',
    'ai_search_history',
    'apollo_enrichment_cache',
    'notifications',
    'push_subscriptions',
    'weekly_reports',
    'workspace_notes',
    'workspace_proposals',
    'workspace_presentations',
    'workspace_ai_conversations',
    'workspace_search_history',
    'workspaces',
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

-- 4) Delete every Supabase Auth account except the two protected administrators.
-- Profiles created with an auth.users FK normally cascade automatically; step 5 also removes
-- any orphaned/non-admin profile rows if an older schema did not cascade.
delete from auth.users
where lower(coalesce(email, '')) not in (
  'wisdom.okoh@scmcapitalng.com',
  'omololu.ajediran@scmcapitalng.com'
);

-- 5) Keep only the two administrator profiles and force their canonical permissions/status.
delete from public.profiles
where lower(email) not in (
  'wisdom.okoh@scmcapitalng.com',
  'omololu.ajediran@scmcapitalng.com'
);

update public.profiles
set permission_level = 'SUPER_ADMIN', status = 'ACTIVE', updated_at = now()
where lower(email) = 'wisdom.okoh@scmcapitalng.com';

update public.profiles
set permission_level = 'HOD_ADMIN', status = 'ACTIVE', updated_at = now()
where lower(email) = 'omololu.ajediran@scmcapitalng.com';

-- 6) Rebuild public.users from the two canonical administrator profiles.
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
  and lower(p.email) in (
    'wisdom.okoh@scmcapitalng.com',
    'omololu.ajediran@scmcapitalng.com'
  );

-- 7) Final hard assertions. Any mismatch rolls the whole transaction back.
do $$
declare
  auth_count integer;
  profile_count integer;
  compatibility_count integer;
begin
  select count(*) into auth_count from auth.users;
  select count(*) into profile_count from public.profiles;
  select count(*) into compatibility_count from public.users;

  if auth_count <> 2 then
    raise exception 'RESET ABORTED: expected exactly 2 auth users after reset, found %', auth_count;
  end if;
  if profile_count <> 2 then
    raise exception 'RESET ABORTED: expected exactly 2 profiles after reset, found %', profile_count;
  end if;
  if compatibility_count <> 2 then
    raise exception 'RESET ABORTED: expected exactly 2 compatibility users after reset, found %', compatibility_count;
  end if;
end $$;

commit;

-- VERIFY AFTER SUCCESS:
-- select id, email from auth.users order by email;
-- select email, permission_level, status from public.profiles order by email;
-- select email, role, status from public.users order by email;
-- select
--   (select count(*) from public.prospects) as prospects,
--   (select count(*) from public.contacts) as contacts,
--   (select count(*) from public.activities) as activities,
--   (select count(*) from public.meetings) as meetings,
--   (select count(*) from public.tasks) as tasks,
--   (select count(*) from public.workspaces) as workspaces;

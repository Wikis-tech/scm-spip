-- SCM SPIP - Phase 1B: security hardening and legacy-directory sync
-- RUN ONLY IN THE SCM SPIP SUPABASE PROJECT.
-- Run AFTER phase_1_supabase_auth.sql and AFTER creating the two administrator auth users.

begin;

-- Promote the two approved administrators by corporate email.
update public.profiles
set permission_level = 'SUPER_ADMIN',
    status = 'ACTIVE',
    approved_at = coalesce(approved_at, now()),
    updated_at = now()
where lower(email) = 'wisdom.okoh@scmcapitalng.com';

update public.profiles
set permission_level = 'HOD_ADMIN',
    status = 'ACTIVE',
    approved_at = coalesce(approved_at, now()),
    updated_at = now()
where lower(email) = 'omololu.ajediran@scmcapitalng.com';

-- Keep the existing CRM foreign-key user directory synchronized with Supabase Auth profiles.
-- Passwords are intentionally never copied into public tables.
create or replace function public.sync_spip_profile_to_legacy_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    full_name,
    email,
    role,
    department,
    avatar_url,
    status,
    created_at
  ) values (
    new.id::text,
    new.full_name,
    lower(new.email),
    case
      when new.permission_level = 'SUPER_ADMIN' then 'SUPER_ADMIN'
      when new.permission_level = 'HOD_ADMIN' then 'Admin'
      else 'Business Development Officer'
    end,
    coalesce(new.department, 'Asset Management'),
    new.avatar_url,
    case
      when new.status = 'ACTIVE' then 'Approved'
      when new.status = 'PENDING' then 'Pending'
      when new.status = 'SUSPENDED' then 'Suspended'
      else 'Rejected'
    end,
    coalesce(new.created_at, now())
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role,
    department = excluded.department,
    avatar_url = excluded.avatar_url,
    status = excluded.status;

  return new;
end;
$$;

revoke all on function public.sync_spip_profile_to_legacy_user() from public;

drop trigger if exists sync_spip_profile_to_legacy_user_trigger on public.profiles;
create trigger sync_spip_profile_to_legacy_user_trigger
after insert or update of full_name, email, permission_level, department, avatar_url, status
on public.profiles
for each row execute procedure public.sync_spip_profile_to_legacy_user();

-- Backfill every current profile into the CRM directory.
insert into public.users (
  id,
  full_name,
  email,
  role,
  department,
  avatar_url,
  status,
  created_at
)
select
  p.id::text,
  p.full_name,
  lower(p.email),
  case
    when p.permission_level = 'SUPER_ADMIN' then 'SUPER_ADMIN'
    when p.permission_level = 'HOD_ADMIN' then 'Admin'
    else 'Business Development Officer'
  end,
  coalesce(p.department, 'Asset Management'),
  p.avatar_url,
  case
    when p.status = 'ACTIVE' then 'Approved'
    when p.status = 'PENDING' then 'Pending'
    when p.status = 'SUSPENDED' then 'Suspended'
    else 'Rejected'
  end,
  p.created_at
from public.profiles p
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role,
  department = excluded.department,
  avatar_url = excluded.avatar_url,
  status = excluded.status;

-- Erase legacy plaintext credentials before removing the obsolete column.
update public.users set password = null where password is not null;
alter table public.users drop column if exists password;

-- Business data is server-mediated in Phase 1. Browser clients get no direct table access.
-- The trusted server uses the database/service role and is not blocked by these policies.
do $$
declare
  t text;
begin
  foreach t in array array[
    'users',
    'prospects',
    'contacts',
    'activities',
    'meetings',
    'tasks',
    'news_articles',
    'discovered_leads',
    'discovery_sessions',
    'discovery_queues',
    'apollo_enrichment_cache',
    'audit_logs',
    'reminders',
    'saved_sessions',
    'serena_audit_logs',
    'system_audit_logs',
    'weekly_reports',
    'workspaces',
    'workspace_notes',
    'workspace_proposals',
    'workspace_presentations',
    'workspace_ai_conversations',
    'workspace_search_history',
    'ai_search_history',
    'notifications',
    'push_subscriptions'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;

-- Explicit profile grants. Security-sensitive profile fields remain server/admin managed.
grant select on public.profiles to authenticated;
revoke insert, update, delete on public.profiles from authenticated;

-- Security helper for later RLS policies and server checks.
create or replace function public.spip_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'ACTIVE'
      and permission_level in ('SUPER_ADMIN', 'HOD_ADMIN')
  );
$$;

revoke all on function public.spip_is_admin() from public;
grant execute on function public.spip_is_admin() to authenticated;

commit;

-- VERIFY AFTER RUNNING:
-- select email, permission_level, status from public.profiles order by email;
-- select id, full_name, email, role, status from public.users order by email;

-- SCM SPIP - Phase 1B: security hardening and legacy-directory migration
-- RUN ONLY IN THE SCM SPIP SUPABASE PROJECT.
-- Prerequisites:
--   1) phase_1_supabase_auth.sql has already succeeded.
--   2) Create the two initial administrator accounts in Supabase Authentication first.
-- This migration preserves CRM records that may still reference old legacy user IDs.

begin;

-- Promote the two initial administrators by corporate email.
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

-- Migrates a legacy public.users row to the Supabase Auth UUID while preserving every
-- foreign-key relationship to public.users(id). This avoids orphaning prospects,
-- meetings, tasks, reports, workspaces, etc. created before Phase 1.
create or replace function public.spip_migrate_legacy_user_id(
  p_auth_id text,
  p_email text,
  p_full_name text,
  p_permission public.spip_permission_level,
  p_department text,
  p_avatar_url text,
  p_status public.spip_account_status,
  p_created_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  legacy_id text;
  fk record;
  mapped_role text;
  mapped_status text;
begin
  mapped_role := case
    when p_permission = 'SUPER_ADMIN' then 'SUPER_ADMIN'
    when p_permission = 'HOD_ADMIN' then 'Admin'
    else 'Business Development Officer'
  end;

  mapped_status := case
    when p_status = 'ACTIVE' then 'Approved'
    when p_status = 'PENDING' then 'Pending'
    when p_status = 'SUSPENDED' then 'Suspended'
    else 'Rejected'
  end;

  select u.id
    into legacy_id
  from public.users u
  where lower(u.email) = lower(p_email)
    and u.id <> p_auth_id
  limit 1;

  -- A legacy row can own CRM records. Free the unique corporate email temporarily,
  -- create the canonical Auth-backed user, repoint all foreign keys, then remove it.
  if legacy_id is not null then
    update public.users
       set email = 'legacy-' || md5(legacy_id || clock_timestamp()::text) || '@invalid.local'
     where id = legacy_id;
  end if;

  insert into public.users (
    id, full_name, email, role, department, avatar_url, status, created_at
  ) values (
    p_auth_id,
    p_full_name,
    lower(p_email),
    mapped_role,
    coalesce(nullif(p_department, ''), 'Asset Management'),
    p_avatar_url,
    mapped_status,
    coalesce(p_created_at, now())
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role,
    department = excluded.department,
    avatar_url = excluded.avatar_url,
    status = excluded.status;

  if legacy_id is not null then
    for fk in
      select
        tc.table_schema,
        tc.table_name,
        kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.constraint_schema = kcu.constraint_schema
      join information_schema.constraint_column_usage ccu
        on ccu.constraint_name = tc.constraint_name
       and ccu.constraint_schema = tc.constraint_schema
      where tc.constraint_type = 'FOREIGN KEY'
        and ccu.table_schema = 'public'
        and ccu.table_name = 'users'
        and ccu.column_name = 'id'
    loop
      execute format(
        'update %I.%I set %I = $1 where %I = $2',
        fk.table_schema,
        fk.table_name,
        fk.column_name,
        fk.column_name
      ) using p_auth_id, legacy_id;
    end loop;

    delete from public.users where id = legacy_id;
  end if;
end;
$$;

revoke all on function public.spip_migrate_legacy_user_id(text,text,text,public.spip_permission_level,text,text,public.spip_account_status,timestamptz) from public;

-- Canonicalize every profile that already exists.
do $$
declare
  p record;
begin
  for p in select * from public.profiles loop
    perform public.spip_migrate_legacy_user_id(
      p.id::text,
      p.email,
      p.full_name,
      p.permission_level,
      p.department,
      p.avatar_url,
      p.status,
      p.created_at
    );
  end loop;
end $$;

-- Future profile changes automatically synchronize the legacy CRM FK directory.
create or replace function public.sync_spip_profile_to_legacy_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.spip_migrate_legacy_user_id(
    new.id::text,
    new.email,
    new.full_name,
    new.permission_level,
    new.department,
    new.avatar_url,
    new.status,
    new.created_at
  );
  return new;
end;
$$;

revoke all on function public.sync_spip_profile_to_legacy_user() from public;

drop trigger if exists sync_spip_profile_to_legacy_user_trigger on public.profiles;
create trigger sync_spip_profile_to_legacy_user_trigger
after insert or update of full_name, email, permission_level, department, avatar_url, status
on public.profiles
for each row execute procedure public.sync_spip_profile_to_legacy_user();

-- Erase legacy plaintext credentials and permanently remove the obsolete column.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'password'
  ) then
    execute 'update public.users set password = null where password is not null';
    execute 'alter table public.users drop column password';
  end if;
end $$;

-- All business data remains server-mediated in Phase 1. Browser clients do not get
-- direct CRUD access to these tables. The trusted server uses its server/database role.
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

grant select on public.profiles to authenticated;
revoke insert, update, delete on public.profiles from authenticated;

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

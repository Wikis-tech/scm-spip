-- SCM SPIP - Phase 1: Supabase Auth foundation
-- RUN ONLY IN THE SCM SPIP SUPABASE PROJECT.
-- Review before running. This migration does not create passwords or auth users.

begin;

create type public.spip_permission_level as enum ('SUPER_ADMIN', 'HOD_ADMIN', 'STAFF');
create type public.spip_account_status as enum ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  permission_level public.spip_permission_level not null default 'STAFF',
  job_title text,
  department text not null default 'Asset Management',
  status public.spip_account_status not null default 'PENDING',
  avatar_url text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_scm_email_only check (lower(email) ~ '^[a-z0-9._-]+@scmcapitalng[.]com$')
);

create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists profiles_permission_idx on public.profiles (permission_level);

alter table public.profiles enable row level security;

-- Users may read their own profile. Active admins may read all profiles.
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'ACTIVE'
      and p.permission_level in ('SUPER_ADMIN', 'HOD_ADMIN')
  )
);

-- Users may update only non-security profile fields through application RPC/API later.
-- Direct client updates are intentionally disabled in Phase 1.

-- Trigger: create a pending STAFF profile for new SCM corporate auth users.
create or replace function public.handle_spip_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.email) !~ '^[a-z0-9._-]+@scmcapitalng[.]com$' then
    raise exception 'SPIP access requires an @scmcapitalng.com corporate email address';
  end if;

  insert into public.profiles (id, full_name, email, permission_level, department, job_title, status)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    'STAFF',
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'department'), ''), 'Asset Management'),
    nullif(trim(new.raw_user_meta_data ->> 'job_title'), ''),
    'PENDING'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_spip_new_user() from public;

create trigger on_auth_user_created_spip_profile
after insert on auth.users
for each row execute procedure public.handle_spip_new_user();

-- Security helper used by RLS policies in later Phase 1 steps.
create or replace function public.spip_current_permission()
returns public.spip_permission_level
language sql
stable
security definer
set search_path = public
as $$
  select permission_level
  from public.profiles
  where id = auth.uid() and status = 'ACTIVE'
  limit 1;
$$;

revoke all on function public.spip_current_permission() from public;
grant execute on function public.spip_current_permission() to authenticated;

create or replace function public.spip_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'ACTIVE'
  );
$$;

revoke all on function public.spip_is_active() from public;
grant execute on function public.spip_is_active() to authenticated;

commit;

-- AFTER RUNNING THIS MIGRATION:
-- 1. Create the two initial administrator accounts in Supabase Authentication > Users.
-- 2. Use NEW passwords; do not reuse credentials that were previously committed/shared.
-- 3. Then run the admin promotion statements I provide after you send me the two generated auth UUIDs.

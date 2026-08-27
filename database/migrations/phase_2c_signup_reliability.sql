-- SCM SPIP - Phase 2C: reliable corporate access requests
-- RUN ONLY IN THE SCM SPIP SUPABASE PROJECT.
-- Safe to run after Phase 1A/1B/1C migrations.

begin;

-- Do not couple creation of an Auth identity to the legacy CRM users directory.
-- The application/server synchronizes activated users. This keeps signup atomic and reliable.
drop trigger if exists sync_spip_profile_to_legacy_user_trigger on public.profiles;

-- Replace the Auth -> profile trigger with a minimal, defensive implementation.
create or replace function public.handle_spip_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  normalized_email text := lower(coalesce(new.email, ''));
begin
  if normalized_email !~ '^[a-z0-9._-]+@scmcapitalng[.]com$' then
    raise exception 'SPIP access requires an @scmcapitalng.com corporate email address';
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    permission_level,
    department,
    job_title,
    status,
    created_at,
    updated_at
  ) values (
    new.id,
    coalesce(nullif(trim(metadata ->> 'full_name'), ''), split_part(normalized_email, '@', 1)),
    normalized_email,
    'STAFF',
    coalesce(nullif(trim(metadata ->> 'department'), ''), 'Asset Management'),
    nullif(trim(metadata ->> 'job_title'), ''),
    'PENDING',
    now(),
    now()
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    department = excluded.department,
    job_title = excluded.job_title,
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.handle_spip_new_user() from public;

-- Recreate exactly one trigger so repeated migrations never duplicate it.
drop trigger if exists on_auth_user_created_spip_profile on auth.users;
create trigger on_auth_user_created_spip_profile
after insert on auth.users
for each row execute procedure public.handle_spip_new_user();

-- Keep the two established administrators active if their accounts already exist.
update public.profiles
set permission_level = 'SUPER_ADMIN', status = 'ACTIVE', updated_at = now()
where lower(email) = 'wisdom.okoh@scmcapitalng.com';

update public.profiles
set permission_level = 'HOD_ADMIN', status = 'ACTIVE', updated_at = now()
where lower(email) = 'omololu.ajediran@scmcapitalng.com';

commit;

-- VERIFY:
-- select email, permission_level, status from public.profiles order by created_at desc;

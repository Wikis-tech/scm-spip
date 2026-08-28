-- SCM SPIP - Phase 3E: exhaustive auth.users trigger purge
-- Purpose: remove ALL user-created/non-internal triggers from auth.users.
-- Why: Supabase Auth is returning `Database error creating new user` even after the
-- named Phase 2C trigger was removed. A differently-named legacy trigger can still
-- abort every GoTrue user insert. SPIP now creates public.profiles explicitly server-side.
--
-- Safe scope: this script does NOT delete auth users, profiles, CRM data, prospects,
-- contacts, administrators, or passwords. It only drops non-internal triggers attached
-- directly to auth.users and preserves a diagnostic snapshot for this SQL session.

begin;

-- Snapshot exactly what exists before removal so the SQL Editor result proves what was present.
create temporary table if not exists spip_auth_user_trigger_snapshot (
  trigger_name text,
  function_schema text,
  function_name text,
  trigger_definition text
) on commit preserve rows;

truncate table spip_auth_user_trigger_snapshot;

insert into spip_auth_user_trigger_snapshot (
  trigger_name,
  function_schema,
  function_name,
  trigger_definition
)
select
  t.tgname,
  pn.nspname,
  p.proname,
  pg_get_triggerdef(t.oid, true)
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace pn on pn.oid = p.pronamespace
where n.nspname = 'auth'
  and c.relname = 'users'
  and not t.tgisinternal;

-- Remove every user-created trigger from auth.users, regardless of its historical name.
do $$
declare
  r record;
begin
  for r in
    select t.tgname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth'
      and c.relname = 'users'
      and not t.tgisinternal
  loop
    execute format('drop trigger if exists %I on auth.users', r.tgname);
  end loop;
end $$;

-- Hard verification: no user-created trigger may remain on auth.users.
do $$
declare
  remaining integer;
begin
  select count(*)
  into remaining
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'auth'
    and c.relname = 'users'
    and not t.tgisinternal;

  if remaining <> 0 then
    raise exception 'Phase 3E aborted: % non-internal trigger(s) still remain on auth.users', remaining;
  end if;
end $$;

-- Preserve canonical administrator state.
update public.profiles
set permission_level = 'SUPER_ADMIN', status = 'ACTIVE', updated_at = now()
where lower(email) = 'wisdom.okoh@scmcapitalng.com';

update public.profiles
set permission_level = 'HOD_ADMIN', status = 'ACTIVE', updated_at = now()
where lower(email) = 'omololu.ajediran@scmcapitalng.com';

commit;

-- RESULT 1: these are the legacy triggers Phase 3E found and removed.
select *
from spip_auth_user_trigger_snapshot
order by trigger_name;

-- RESULT 2: MUST return zero rows.
select
  t.tgname as remaining_trigger,
  p.proname as remaining_function,
  pg_get_triggerdef(t.oid, true) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where n.nspname = 'auth'
  and c.relname = 'users'
  and not t.tgisinternal;

-- RESULT 3: administrators must remain active.
select email, permission_level, status
from public.profiles
where lower(email) in (
  'wisdom.okoh@scmcapitalng.com',
  'omololu.ajediran@scmcapitalng.com'
)
order by email;

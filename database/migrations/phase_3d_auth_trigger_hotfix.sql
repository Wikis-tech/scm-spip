-- SCM SPIP - Phase 3D Auth Trigger Hotfix
-- PURPOSE: Remove the failing auth.users -> public.profiles trigger that is causing
-- Supabase Auth signup/createUser to return HTTP 500 with an empty {} error.
-- New staff profile creation is handled explicitly by the deployed server endpoint
-- /api/auth/register-v2 using the Supabase service-role client.
--
-- SAFE EFFECT:
-- - Existing Auth users are NOT deleted.
-- - Existing profiles are NOT deleted.
-- - Existing SUPER_ADMIN / HOD_ADMIN accounts are untouched.
-- - New staff are still created as STAFF / PENDING by the application server.
--
-- RUN ONLY IN THE SCM SPIP SUPABASE PROJECT.

begin;

-- Remove all known historical variants of the Auth -> profile trigger.
drop trigger if exists on_auth_user_created_spip_profile on auth.users;
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists handle_new_user on auth.users;

-- The function can remain for rollback/reference, but no Auth trigger is allowed to call it.
-- Explicitly verify that no non-internal trigger remains on auth.users which calls
-- handle_spip_new_user(). If one exists under an unexpected name, abort so it can be inspected.
do $$
declare
  trigger_count integer;
begin
  select count(*)
  into trigger_count
  from pg_trigger t
  join pg_proc p on p.oid = t.tgfoid
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'auth'
    and c.relname = 'users'
    and not t.tgisinternal
    and p.proname = 'handle_spip_new_user';

  if trigger_count <> 0 then
    raise exception 'Phase 3D aborted: % unexpected handle_spip_new_user trigger(s) still exist on auth.users', trigger_count;
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

-- VERIFY AFTER RUNNING:
-- 1) This must return ZERO rows for handle_spip_new_user:
-- select t.tgname, p.proname
-- from pg_trigger t
-- join pg_proc p on p.oid = t.tgfoid
-- join pg_class c on c.oid = t.tgrelid
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'auth'
--   and c.relname = 'users'
--   and not t.tgisinternal;
--
-- 2) Confirm admins are still active:
-- select email, permission_level, status
-- from public.profiles
-- where permission_level in ('SUPER_ADMIN', 'HOD_ADMIN')
-- order by email;

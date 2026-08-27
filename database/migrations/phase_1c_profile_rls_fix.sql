-- SCM SPIP - Phase 1C: fix recursive profile RLS policy
-- RUN ONLY IN THE SCM SPIP SUPABASE PROJECT.
-- Run after phase_1_supabase_auth.sql and phase_1b_security_hardening.sql.

begin;

-- Ensure the admin helper executes outside caller RLS recursion.
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

-- The original policy queried public.profiles from inside a public.profiles policy,
-- which can trigger PostgreSQL RLS recursion. Use the security-definer helper instead.
drop policy if exists "profiles_select_self_or_admin" on public.profiles;

create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.spip_is_admin()
);

commit;

-- VERIFY:
-- 1) Sign in as an ACTIVE STAFF user: only their own profile should be readable.
-- 2) Sign in as HOD_ADMIN/SUPER_ADMIN: all profiles should be readable.

# SCM SPIP Phase 1 Supabase Setup

Run these steps only in the SCM SPIP Supabase project.

1. `database/migrations/phase_1_supabase_auth.sql` - already completed.
2. In **Authentication > Users**, create the two initial administrator accounts using their SCM corporate email addresses and **new strong passwords**. Do not reuse passwords that have previously been shared or committed.
3. Run `database/migrations/phase_1b_security_hardening.sql`.
4. Verify with:

```sql
select email, permission_level, status
from public.profiles
order by email;
```

Expected administrator results:
- Super Admin account -> `SUPER_ADMIN`, `ACTIVE`
- Asset Management HOD account -> `HOD_ADMIN`, `ACTIVE`

All future ordinary registrations must begin as `STAFF`, `PENDING`.

5. Confirm the legacy plaintext password column is gone:

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'users'
  and column_name = 'password';
```

Expected: zero rows.

6. Confirm RLS is enabled:

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('profiles','users','prospects','contacts','activities','meetings','tasks','weekly_reports','workspaces')
order by relname;
```

Expected: `relrowsecurity = true` for every returned business table.

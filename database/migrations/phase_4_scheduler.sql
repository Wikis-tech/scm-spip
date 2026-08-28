-- SCM SPIP Phase 4 scheduler
-- RUN ONLY IN THE SCM SPIP SUPABASE PROJECT after phase_4_reliable_reminders.sql.
-- This does not store a secret in source. Create Vault secret `spip_reminder_cron_secret`
-- with the same value used by Vercel REMINDER_CRON_SECRET.

begin;

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.spip_dispatch_reminders_http()
returns bigint
language plpgsql
security definer
set search_path = public, vault, net, extensions
as $$
declare
  dispatcher_secret text;
  request_id bigint;
begin
  select decrypted_secret
    into dispatcher_secret
    from vault.decrypted_secrets
   where name = 'spip_reminder_cron_secret'
   order by created_at desc
   limit 1;

  if coalesce(dispatcher_secret, '') = '' then
    raise warning 'SPIP reminder dispatcher secret is not configured in Vault';
    return null;
  end if;

  select net.http_post(
    url := 'https://scm-spip.vercel.app/api/reminders/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-SPIP-Reminder-Secret', dispatcher_secret
    ),
    body := jsonb_build_object('source', 'supabase-cron', 'requested_at', now()),
    timeout_milliseconds := 10000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.spip_dispatch_reminders_http() from public, anon, authenticated;

-- Idempotently replace the Phase 4 cron job.
do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'spip-reminder-dispatch' limit 1;
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end $$;

select cron.schedule(
  'spip-reminder-dispatch',
  '* * * * *',
  $cron$select public.spip_dispatch_reminders_http();$cron$
);

commit;

-- VERIFY
select jobid, jobname, schedule, active
from cron.job
where jobname = 'spip-reminder-dispatch';

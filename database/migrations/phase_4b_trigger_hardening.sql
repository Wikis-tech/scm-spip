-- SCM SPIP Phase 4B: reminder trigger hardening
-- RUN ONLY IN THE SCM SPIP SUPABASE PROJECT after phase_4_reliable_reminders.sql.

begin;

-- Ownership, prospect and schedule edits must regenerate the reminder set.
drop trigger if exists spip_meeting_reminder_sync on public.meetings;
create trigger spip_meeting_reminder_sync
after insert or update of date,time,purpose,outcome,officer_id,prospect_id,prospect_name
on public.meetings
for each row execute function public.spip_sync_meeting_reminders();

drop trigger if exists spip_task_reminder_sync on public.tasks;
create trigger spip_task_reminder_sync
after insert or update of due_date,title,is_completed,officer_id,prospect_id,prospect_name
on public.tasks
for each row execute function public.spip_sync_task_reminders();

-- Removing a meeting/task must not leave future alerts behind.
create or replace function public.spip_cleanup_deleted_source_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_name text;
begin
  source_name := case when tg_table_name = 'meetings' then 'meeting' else 'task' end;
  update public.spip_reminders
     set status = 'CANCELLED',
         next_attempt_at = null,
         last_error = 'SOURCE_DELETED',
         updated_at = now()
   where source_type = source_name
     and source_id = old.id
     and status = 'PENDING';
  return old;
end;
$$;

revoke all on function public.spip_cleanup_deleted_source_reminders() from public, anon, authenticated;

drop trigger if exists spip_meeting_reminder_cleanup on public.meetings;
create trigger spip_meeting_reminder_cleanup
after delete on public.meetings
for each row execute function public.spip_cleanup_deleted_source_reminders();

drop trigger if exists spip_task_reminder_cleanup on public.tasks;
create trigger spip_task_reminder_cleanup
after delete on public.tasks
for each row execute function public.spip_cleanup_deleted_source_reminders();

commit;

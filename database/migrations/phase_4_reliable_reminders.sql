-- SCM SPIP Phase 4: reliable reminders, push subscriptions and notification preferences
-- RUN ONLY IN THE SCM SPIP SUPABASE PROJECT.

begin;

create extension if not exists pgcrypto;

create table if not exists public.spip_notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  push_enabled boolean not null default true,
  meeting_24h boolean not null default true,
  meeting_1h boolean not null default true,
  meeting_10m boolean not null default true,
  meeting_start boolean not null default true,
  task_24h boolean not null default true,
  task_1h boolean not null default true,
  follow_up_enabled boolean not null default true,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time default '21:00',
  quiet_hours_end time default '07:00',
  timezone text not null default 'Africa/Lagos',
  updated_at timestamptz not null default now()
);

create table if not exists public.spip_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_label text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_spip_push_subscriptions_user_active
  on public.spip_push_subscriptions(user_id, is_active);

create table if not exists public.spip_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null check (source_type in ('meeting','task','follow_up','custom','report')),
  source_id text not null,
  prospect_id text,
  prospect_name text,
  title text not null,
  message text not null,
  reminder_kind text not null,
  scheduled_for timestamptz not null,
  status text not null default 'PENDING' check (status in ('PENDING','SENT','CANCELLED','FAILED')),
  priority text not null default 'normal' check (priority in ('normal','high','critical')),
  attempt_count integer not null default 0,
  next_attempt_at timestamptz,
  last_error text,
  sent_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, source_type, source_id, reminder_kind)
);

create index if not exists idx_spip_reminders_due
  on public.spip_reminders(status, scheduled_for, next_attempt_at)
  where status = 'PENDING';
create index if not exists idx_spip_reminders_user
  on public.spip_reminders(user_id, scheduled_for desc);

create table if not exists public.spip_notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reminder_id uuid references public.spip_reminders(id) on delete set null,
  title text not null,
  message text not null,
  category text not null default 'reminder',
  priority text not null default 'normal',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_spip_notification_events_user_created
  on public.spip_notification_events(user_id, created_at desc);

-- Keep these tables server-managed. Authenticated users reach them through protected SPIP APIs.
alter table public.spip_notification_preferences enable row level security;
alter table public.spip_push_subscriptions enable row level security;
alter table public.spip_reminders enable row level security;
alter table public.spip_notification_events enable row level security;
revoke all on public.spip_notification_preferences from anon, authenticated;
revoke all on public.spip_push_subscriptions from anon, authenticated;
revoke all on public.spip_reminders from anon, authenticated;
revoke all on public.spip_notification_events from anon, authenticated;

create or replace function public.spip_parse_meeting_datetime(p_date text, p_time text)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
declare
  local_ts timestamp;
begin
  begin
    local_ts := to_timestamp(trim(p_date) || ' ' || upper(trim(p_time)), 'YYYY-MM-DD HH12:MI AM')::timestamp;
  exception when others then
    begin
      local_ts := to_timestamp(trim(p_date) || ' ' || trim(p_time), 'YYYY-MM-DD HH24:MI')::timestamp;
    exception when others then
      return null;
    end;
  end;
  return local_ts at time zone 'Africa/Lagos';
end;
$$;

create or replace function public.spip_sync_meeting_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid;
  starts_at timestamptz;
  label text;
  company text;
  pref record;
begin
  select id into target_user from public.profiles where id::text = new.officer_id::text limit 1;
  if target_user is null then return new; end if;

  delete from public.spip_reminders
   where source_type='meeting' and source_id=new.id and status='PENDING';

  if coalesce(new.outcome,'') <> '' then return new; end if;
  starts_at := public.spip_parse_meeting_datetime(new.date, new.time);
  if starts_at is null then return new; end if;

  insert into public.spip_notification_preferences(user_id)
  values(target_user) on conflict (user_id) do nothing;
  select * into pref from public.spip_notification_preferences where user_id=target_user;

  company := coalesce(nullif(new.prospect_name,''), 'SCM client');
  label := coalesce(nullif(new.purpose,''), 'Client meeting');

  if pref.meeting_24h and starts_at - interval '24 hours' > now() then
    insert into public.spip_reminders(user_id,source_type,source_id,prospect_id,prospect_name,title,message,reminder_kind,scheduled_for,priority,expires_at,metadata)
    values(target_user,'meeting',new.id,new.prospect_id,company,'Meeting tomorrow: '||company,label||' • '||new.time,'meeting_24h',starts_at-interval '24 hours','normal',starts_at+interval '12 hours',jsonb_build_object('url','/calendar','meetingStart',starts_at))
    on conflict(user_id,source_type,source_id,reminder_kind) do update set scheduled_for=excluded.scheduled_for,status='PENDING',updated_at=now(),message=excluded.message,metadata=excluded.metadata;
  end if;
  if pref.meeting_1h and starts_at - interval '1 hour' > now() then
    insert into public.spip_reminders(user_id,source_type,source_id,prospect_id,prospect_name,title,message,reminder_kind,scheduled_for,priority,expires_at,metadata)
    values(target_user,'meeting',new.id,new.prospect_id,company,'Meeting in 1 hour: '||company,label||' • '||new.time,'meeting_1h',starts_at-interval '1 hour','high',starts_at+interval '12 hours',jsonb_build_object('url','/calendar','meetingStart',starts_at))
    on conflict(user_id,source_type,source_id,reminder_kind) do update set scheduled_for=excluded.scheduled_for,status='PENDING',updated_at=now(),message=excluded.message,metadata=excluded.metadata;
  end if;
  if pref.meeting_10m and starts_at - interval '10 minutes' > now() then
    insert into public.spip_reminders(user_id,source_type,source_id,prospect_id,prospect_name,title,message,reminder_kind,scheduled_for,priority,expires_at,metadata)
    values(target_user,'meeting',new.id,new.prospect_id,company,'Meeting in 10 minutes: '||company,label||' • Prepare to join/start the meeting.','meeting_10m',starts_at-interval '10 minutes','critical',starts_at+interval '12 hours',jsonb_build_object('url','/calendar','meetingStart',starts_at))
    on conflict(user_id,source_type,source_id,reminder_kind) do update set scheduled_for=excluded.scheduled_for,status='PENDING',updated_at=now(),message=excluded.message,metadata=excluded.metadata;
  end if;
  if pref.meeting_start and starts_at > now() then
    insert into public.spip_reminders(user_id,source_type,source_id,prospect_id,prospect_name,title,message,reminder_kind,scheduled_for,priority,expires_at,metadata)
    values(target_user,'meeting',new.id,new.prospect_id,company,'Meeting starting now: '||company,label||' • '||new.time,'meeting_start',starts_at,'critical',starts_at+interval '12 hours',jsonb_build_object('url','/calendar','meetingStart',starts_at,'requireInteraction',true))
    on conflict(user_id,source_type,source_id,reminder_kind) do update set scheduled_for=excluded.scheduled_for,status='PENDING',updated_at=now(),message=excluded.message,metadata=excluded.metadata;
  end if;
  return new;
end;
$$;

drop trigger if exists spip_meeting_reminder_sync on public.meetings;
create trigger spip_meeting_reminder_sync
after insert or update of date,time,purpose,outcome on public.meetings
for each row execute function public.spip_sync_meeting_reminders();

create or replace function public.spip_sync_task_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid;
  due_at timestamptz;
  pref record;
begin
  select id into target_user from public.profiles where id::text = new.officer_id::text limit 1;
  if target_user is null then return new; end if;
  delete from public.spip_reminders where source_type='task' and source_id=new.id and status='PENDING';
  if coalesce(new.is_completed,false) then return new; end if;
  begin
    due_at := (new.due_date::date + time '09:00') at time zone 'Africa/Lagos';
  exception when others then return new;
  end;
  insert into public.spip_notification_preferences(user_id) values(target_user) on conflict(user_id) do nothing;
  select * into pref from public.spip_notification_preferences where user_id=target_user;
  if pref.task_24h and due_at-interval '24 hours' > now() then
    insert into public.spip_reminders(user_id,source_type,source_id,prospect_id,prospect_name,title,message,reminder_kind,scheduled_for,priority,expires_at,metadata)
    values(target_user,'task',new.id,new.prospect_id,new.prospect_name,'Task due tomorrow',new.title,'task_24h',due_at-interval '24 hours','normal',due_at+interval '1 day',jsonb_build_object('url','/calendar'))
    on conflict(user_id,source_type,source_id,reminder_kind) do update set scheduled_for=excluded.scheduled_for,status='PENDING',updated_at=now(),message=excluded.message;
  end if;
  if pref.task_1h and due_at-interval '1 hour' > now() then
    insert into public.spip_reminders(user_id,source_type,source_id,prospect_id,prospect_name,title,message,reminder_kind,scheduled_for,priority,expires_at,metadata)
    values(target_user,'task',new.id,new.prospect_id,new.prospect_name,'Task due in 1 hour',new.title,'task_1h',due_at-interval '1 hour','high',due_at+interval '1 day',jsonb_build_object('url','/calendar'))
    on conflict(user_id,source_type,source_id,reminder_kind) do update set scheduled_for=excluded.scheduled_for,status='PENDING',updated_at=now(),message=excluded.message;
  end if;
  return new;
end;
$$;

drop trigger if exists spip_task_reminder_sync on public.tasks;
create trigger spip_task_reminder_sync
after insert or update of due_date,title,is_completed on public.tasks
for each row execute function public.spip_sync_task_reminders();

-- Seed preferences for current active users.
insert into public.spip_notification_preferences(user_id)
select id from public.profiles where status='ACTIVE'
on conflict(user_id) do nothing;

commit;

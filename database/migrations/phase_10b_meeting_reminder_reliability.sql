-- Final meeting reminder reliability hardening.
-- Meeting times are entered in Lagos local time and stored as a canonical 12-hour value.

create or replace function public.spip_parse_meeting_datetime(p_date text, p_time text)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
declare
  clean_date text := trim(coalesce(p_date, ''));
  clean_time text := upper(trim(coalesce(p_time, '')));
  hour_value integer;
  minute_value integer;
  period_value text;
  local_ts timestamp;
begin
  if clean_date !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;

  if clean_time ~ '^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$' then
    hour_value := substring(clean_time from '^(\d{1,2})')::integer;
    minute_value := substring(clean_time from ':([0-5][0-9])')::integer;
    period_value := substring(clean_time from '(AM|PM)$');
    hour_value := hour_value % 12 + case when period_value = 'PM' then 12 else 0 end;
  elsif clean_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' then
    hour_value := split_part(clean_time, ':', 1)::integer;
    minute_value := split_part(clean_time, ':', 2)::integer;
  else
    return null;
  end if;

  begin
    local_ts := clean_date::date + make_time(hour_value, minute_value, 0);
  exception when others then
    return null;
  end;
  return local_ts at time zone 'Africa/Lagos';
end;
$$;

-- Trigger functions are internal implementation details, not public RPC endpoints.
revoke all on function public.spip_sync_meeting_reminders() from public, anon, authenticated;
revoke all on function public.spip_cleanup_deleted_source_reminders() from public, anon, authenticated;

-- Re-run the trigger for any future meeting that was saved while reminder creation was unavailable.
update public.meetings
set time = time
where coalesce(outcome, '') = ''
  and public.spip_parse_meeting_datetime(date, time) > now();

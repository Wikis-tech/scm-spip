-- SCM SPIP Phase 6C - Copilot memory reliability
-- RUN ONLY IN THE SCM SPIP SUPABASE PROJECT.
-- Idempotent: repairs/creates the private per-user Copilot conversation store.

begin;

create table if not exists public.spip_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id text,
  title text not null default 'New AI conversation',
  mode text not null default 'assistant',
  data_classification text not null default 'INTERNAL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.spip_ai_conversations add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.spip_ai_conversations add column if not exists workspace_id text;
alter table public.spip_ai_conversations add column if not exists title text default 'New AI conversation';
alter table public.spip_ai_conversations add column if not exists mode text default 'assistant';
alter table public.spip_ai_conversations add column if not exists data_classification text default 'INTERNAL';
alter table public.spip_ai_conversations add column if not exists created_at timestamptz default now();
alter table public.spip_ai_conversations add column if not exists updated_at timestamptz default now();

create table if not exists public.spip_ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.spip_ai_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  content text not null,
  provider text,
  model text,
  citations jsonb not null default '[]'::jsonb,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  latency_ms integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.spip_ai_messages add column if not exists conversation_id uuid references public.spip_ai_conversations(id) on delete cascade;
alter table public.spip_ai_messages add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.spip_ai_messages add column if not exists role text;
alter table public.spip_ai_messages add column if not exists content text;
alter table public.spip_ai_messages add column if not exists provider text;
alter table public.spip_ai_messages add column if not exists model text;
alter table public.spip_ai_messages add column if not exists citations jsonb default '[]'::jsonb;
alter table public.spip_ai_messages add column if not exists input_tokens integer default 0;
alter table public.spip_ai_messages add column if not exists output_tokens integer default 0;
alter table public.spip_ai_messages add column if not exists latency_ms integer default 0;
alter table public.spip_ai_messages add column if not exists created_at timestamptz default now();

create index if not exists idx_spip_ai_conversations_user_updated
  on public.spip_ai_conversations(user_id, updated_at desc);
create index if not exists idx_spip_ai_messages_user_conversation_created
  on public.spip_ai_messages(user_id, conversation_id, created_at asc);

alter table public.spip_ai_conversations enable row level security;
alter table public.spip_ai_messages enable row level security;

revoke all on table public.spip_ai_conversations from anon, authenticated;
revoke all on table public.spip_ai_messages from anon, authenticated;
grant all on table public.spip_ai_conversations to service_role;
grant all on table public.spip_ai_messages to service_role;

-- Keep updated_at fresh even when a future code path forgets to update it.
create or replace function public.spip_touch_ai_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.spip_ai_conversations
  set updated_at = now()
  where id = new.conversation_id
    and user_id = new.user_id;
  return new;
end;
$$;

revoke all on function public.spip_touch_ai_conversation() from public;
grant execute on function public.spip_touch_ai_conversation() to service_role;

drop trigger if exists spip_ai_message_touch_conversation on public.spip_ai_messages;
create trigger spip_ai_message_touch_conversation
after insert on public.spip_ai_messages
for each row execute function public.spip_touch_ai_conversation();

commit;

select pg_notify('pgrst', 'reload schema');

-- Verification. These queries should complete successfully.
select count(*) as saved_conversations from public.spip_ai_conversations;
select count(*) as saved_messages from public.spip_ai_messages;

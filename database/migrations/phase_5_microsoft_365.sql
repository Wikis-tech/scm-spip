-- SCM SPIP Phase 5 - Microsoft 365 delegated integration
-- Stores only server-encrypted OAuth material. Browser roles never receive Graph tokens.

begin;

create table if not exists public.microsoft_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  microsoft_user_id text,
  tenant_id text,
  email text,
  display_name text,
  scopes text[] not null default '{}',
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sync_at timestamptz,
  last_error text
);

create table if not exists public.microsoft_oauth_states (
  state text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  code_verifier_ciphertext text not null,
  redirect_uri text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create table if not exists public.microsoft_event_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  meeting_id text,
  graph_event_id text not null,
  graph_change_key text,
  web_link text,
  last_synced_at timestamptz not null default now(),
  unique(user_id, graph_event_id)
);

alter table public.microsoft_connections enable row level security;
alter table public.microsoft_oauth_states enable row level security;
alter table public.microsoft_event_links enable row level security;

-- These tables are service-role only. SPIP endpoints expose only sanitized status/data.
revoke all on table public.microsoft_connections from anon, authenticated;
revoke all on table public.microsoft_oauth_states from anon, authenticated;
revoke all on table public.microsoft_event_links from anon, authenticated;

grant all on table public.microsoft_connections to service_role;
grant all on table public.microsoft_oauth_states to service_role;
grant all on table public.microsoft_event_links to service_role;

create index if not exists idx_microsoft_oauth_states_user_expires
  on public.microsoft_oauth_states(user_id, expires_at);
create index if not exists idx_microsoft_event_links_user_synced
  on public.microsoft_event_links(user_id, last_synced_at desc);

commit;
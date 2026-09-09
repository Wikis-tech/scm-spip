begin;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  requester_name text not null,
  requester_email text not null,
  subject text not null check (char_length(subject) between 4 and 140),
  category text not null check (category in ('TECHNICAL', 'ACCESS', 'DATA', 'COPILOT', 'EXPORT', 'OTHER')),
  description text not null check (char_length(description) between 10 and 4000),
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  priority text not null default 'NORMAL' check (priority in ('LOW', 'NORMAL', 'HIGH')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  is_admin_reply boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_creator_updated on public.support_tickets(created_by, updated_at desc);
create index if not exists idx_support_tickets_status_updated on public.support_tickets(status, updated_at desc);
create index if not exists idx_support_messages_ticket_created on public.support_ticket_messages(ticket_id, created_at asc);

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
revoke all on public.support_tickets, public.support_ticket_messages from anon, authenticated;

comment on table public.support_tickets is 'Private employee support requests managed through authenticated server routes.';
comment on table public.support_ticket_messages is 'Private support conversation messages; direct Data API access is denied.';

commit;

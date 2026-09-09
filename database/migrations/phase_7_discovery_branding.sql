begin;

create table if not exists public.discovery_company_allocations (
  company_key text primary key,
  company_name text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  lead_id text,
  status text not null default 'QUEUED' check (status in ('QUEUED', 'DISMISSED', 'IMPORTED', 'ERROR')),
  allocated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_discovery_allocations_user_status
  on public.discovery_company_allocations(user_id, status, allocated_at desc);

alter table public.discovery_company_allocations enable row level security;
revoke all on public.discovery_company_allocations from anon, authenticated;

alter table public.discovered_leads
  add column if not exists enrichment_status text default 'Unavailable',
  add column if not exists last_synced_at timestamptz,
  add column if not exists apollo_org_id text,
  add column if not exists linkedin_url text,
  add column if not exists company_key text;

update public.discovered_leads
set company_key = lower(regexp_replace(regexp_replace(trim(name), '\m(limited|ltd|plc|incorporated|inc|llc)\M', '', 'gi'), '[^a-z0-9]+', '', 'g'))
where company_key is null;

create index if not exists idx_discovered_leads_owner_created
  on public.discovered_leads(user_id, created_at desc);
create index if not exists idx_discovered_leads_company_key
  on public.discovered_leads(company_key);

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;
revoke all on public.platform_settings from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'spip-brand-assets',
  'spip-brand-assets',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;

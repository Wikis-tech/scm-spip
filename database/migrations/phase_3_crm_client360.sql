-- SCM SPIP - Phase 3: CRM / Client 360 / duplicate-control schema
-- RUN ONLY IN THE SCM SPIP SUPABASE PROJECT after Phase 2C.

begin;

alter table if exists public.prospects
  add column if not exists website_domain text,
  add column if not exists apollo_organization_id text,
  add column if not exists product_interests text[] not null default '{}',
  add column if not exists campaign_id text,
  add column if not exists converted_at timestamptz,
  add column if not exists converted_product text,
  add column if not exists initial_investment numeric(20,2),
  add column if not exists current_aum numeric(20,2),
  add column if not exists relationship_health text default 'New';

create table if not exists public.campaigns (
  id text primary key,
  name text not null,
  description text,
  source_type text,
  status text not null default 'Active',
  start_date date,
  end_date date,
  owner_user_id text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_conversions (
  id text primary key,
  prospect_id text not null references public.prospects(id) on delete cascade,
  officer_id text,
  product text not null,
  initial_investment numeric(20,2) not null default 0,
  current_aum numeric(20,2) not null default 0,
  conversion_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.prospect_collaborators (
  prospect_id text not null references public.prospects(id) on delete cascade,
  user_id text not null,
  added_by text,
  created_at timestamptz not null default now(),
  primary key (prospect_id, user_id)
);

create index if not exists prospects_website_domain_idx on public.prospects (lower(website_domain));
create index if not exists prospects_apollo_org_idx on public.prospects (apollo_organization_id);
create index if not exists prospects_campaign_idx on public.prospects (campaign_id);
create index if not exists conversions_prospect_idx on public.client_conversions (prospect_id);
create index if not exists conversions_officer_idx on public.client_conversions (officer_id);
create index if not exists campaigns_status_idx on public.campaigns (status);

-- Database-level duplicate safety for strong identifiers. Application-level checks also
-- compare normalized names/email domains so users receive a friendly duplicate warning.
create unique index if not exists prospects_apollo_org_unique_idx
  on public.prospects (apollo_organization_id)
  where apollo_organization_id is not null and btrim(apollo_organization_id) <> '';
create unique index if not exists prospects_website_domain_unique_idx
  on public.prospects (lower(website_domain))
  where website_domain is not null and btrim(website_domain) <> '';

-- Reject impossible conversion values even if a future API regression bypasses validation.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'client_conversions_nonnegative_amounts'
  ) then
    alter table public.client_conversions
      add constraint client_conversions_nonnegative_amounts
      check (initial_investment >= 0 and current_aum >= 0);
  end if;
end $$;

alter table public.campaigns enable row level security;
alter table public.client_conversions enable row level security;
alter table public.prospect_collaborators enable row level security;

-- These business tables are server-mediated. Browser roles receive no direct table access;
-- the server-side service credential performs authenticated/authorized operations.
revoke all on public.campaigns from anon, authenticated;
revoke all on public.client_conversions from anon, authenticated;
revoke all on public.prospect_collaborators from anon, authenticated;

commit;

-- VERIFY:
-- select column_name from information_schema.columns where table_schema='public' and table_name='prospects' order by ordinal_position;
-- select table_name from information_schema.tables where table_schema='public' and table_name in ('campaigns','client_conversions','prospect_collaborators');
-- select indexname from pg_indexes where schemaname='public' and indexname like 'prospects_%_unique_idx';

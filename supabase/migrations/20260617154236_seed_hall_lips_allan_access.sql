-- Auth tables: tenants, app_users, organizations, tenant_users
-- These tables were created directly in Supabase Dashboard and were missing
-- from version control. This migration documents and recreates them
-- idempotently so the schema is reproducible from scratch.

-- ─────────────────────────────────────────────
-- tenants
-- Top-level isolation unit. Each customer account is a tenant.
-- ─────────────────────────────────────────────
create table if not exists public.tenants (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  legal_name       text null,
  document_number  text null,
  status           text not null default 'active',
  owner_name       text null,
  owner_email      text null,
  owner_phone      text null,
  timezone         text not null default 'America/Sao_Paulo',
  locale           text not null default 'pt-BR',
  currency         text not null default 'BRL',
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint tenants_status_check check (status in ('active', 'paused', 'blocked', 'archived'))
);

alter table public.tenants enable row level security;

drop policy if exists "service_all_tenants" on public.tenants;
create policy "service_all_tenants" on public.tenants
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "public_read_tenants" on public.tenants;
create policy "public_read_tenants" on public.tenants
  for select using (true);

-- ─────────────────────────────────────────────
-- app_users
-- Platform-level users (login identity).
-- ─────────────────────────────────────────────
create table if not exists public.app_users (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text unique,
  phone        text null,
  role         text not null default 'agent',
  status       text not null default 'active',
  avatar_url   text null,
  last_seen_at timestamptz null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint app_users_role_check   check (role   in ('superadmin', 'admin', 'agent', 'owner', 'attendant', 'viewer')),
  constraint app_users_status_check check (status in ('active', 'inactive', 'suspended'))
);

create index if not exists idx_app_users_status on public.app_users (status);
create index if not exists idx_app_users_role   on public.app_users (role);

alter table public.app_users enable row level security;

drop policy if exists "service_all_app_users" on public.app_users;
create policy "service_all_app_users" on public.app_users
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "public_read_app_users" on public.app_users;
create policy "public_read_app_users" on public.app_users
  for select using (true);

-- ─────────────────────────────────────────────
-- organizations
-- A business unit within a tenant (can be 1:1 or 1:many).
-- ─────────────────────────────────────────────
create table if not exists public.organizations (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid null references public.tenants(id) on delete set null,
  name                text not null,
  slug                text not null,
  legal_name          text null,
  document_number     text null,
  business_type       text null,
  industry            text null,
  segment             text null,
  email               text null,
  phone               text null,
  whatsapp_phone      text null,
  website_url         text null,
  website             text null,
  address_line        text null,
  city                text null,
  state               text null,
  country             text not null default 'BR',
  timezone            text not null default 'America/Sao_Paulo',
  default_language    text not null default 'pt-BR',
  supported_languages text[] not null default array['pt-BR'],
  status              text not null default 'active',
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (tenant_id, slug),
  constraint organizations_status_check check (status in ('active', 'paused', 'blocked', 'archived'))
);

create index if not exists idx_organizations_tenant_id on public.organizations (tenant_id);
create index if not exists idx_organizations_slug      on public.organizations (slug);
create index if not exists idx_organizations_status    on public.organizations (status);

alter table public.organizations enable row level security;

drop policy if exists "service_all_organizations" on public.organizations;
create policy "service_all_organizations" on public.organizations
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "public_read_active_organizations" on public.organizations;
create policy "public_read_active_organizations" on public.organizations
  for select using (status = 'active');

-- ─────────────────────────────────────────────
-- tenant_users
-- Links an app_user to a tenant + organization with a role.
-- ─────────────────────────────────────────────
create table if not exists public.tenant_users (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid null references public.organizations(id) on delete set null,
  app_user_id     uuid null references public.app_users(id) on delete cascade,
  role            text not null default 'agent',
  status          text not null default 'active',
  invited_by      text null,
  invited_at      timestamptz null,
  joined_at       timestamptz null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, app_user_id),
  constraint tenant_users_role_check   check (role   in ('owner', 'admin', 'agent', 'attendant', 'viewer')),
  constraint tenant_users_status_check check (status in ('active', 'inactive', 'suspended', 'pending'))
);

create index if not exists idx_tenant_users_tenant_id   on public.tenant_users (tenant_id);
create index if not exists idx_tenant_users_app_user_id on public.tenant_users (app_user_id);

alter table public.tenant_users enable row level security;

drop policy if exists "service_all_tenant_users" on public.tenant_users;
create policy "service_all_tenant_users" on public.tenant_users
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "public_read_tenant_users" on public.tenant_users;
create policy "public_read_tenant_users" on public.tenant_users
  for select using (true);

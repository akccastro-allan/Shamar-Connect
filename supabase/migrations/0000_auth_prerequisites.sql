-- Historical prerequisite for scratch databases.
-- Later migrations seed operational data through organizations before
-- 0012_auth_tables.sql recreates the full auth-table policy/index layer.

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

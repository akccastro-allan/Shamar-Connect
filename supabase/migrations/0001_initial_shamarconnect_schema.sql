create extension if not exists pgcrypto;

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

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text not null unique,
  email text,
  company text,
  source text not null default 'whatsapp_web',
  consent_status text not null default 'unknown' check (consent_status in ('unknown', 'opted_in', 'opted_out')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  provider text not null default 'whatsapp_web',
  external_chat_id text not null unique,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  name text,
  is_group boolean not null default false,
  status text not null default 'open' check (status in ('open', 'pending', 'resolved', 'archived')),
  unread_count integer not null default 0,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  provider text not null default 'whatsapp_web',
  external_message_id text unique,
  conversation_id uuid references public.whatsapp_conversations(id) on delete cascade,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  direction text not null check (direction in ('inbound', 'outbound')),
  from_id text,
  to_id text,
  body text,
  message_type text not null default 'text',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_groups (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'whatsapp_web',
  external_group_id text not null unique,
  name text not null,
  participant_count integer not null default 0,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_contact_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_group_id uuid references public.whatsapp_groups(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'imported', 'blocked')),
  total_participants integer not null default 0,
  unique_contacts integer not null default 0,
  duplicates_removed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_contact_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.group_contact_lists(id) on delete cascade,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  name text,
  phone text not null,
  source_group_name text,
  consent_status text not null default 'unknown' check (consent_status in ('unknown', 'opted_in', 'opted_out')),
  crm_status text not null default 'new' check (crm_status in ('new', 'existing', 'duplicate')),
  notes text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique(list_id, phone)
);

create table if not exists public.provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_contacts_phone on public.crm_contacts(phone);
create index if not exists idx_whatsapp_conversations_external_chat_id on public.whatsapp_conversations(external_chat_id);
create index if not exists idx_whatsapp_messages_conversation_id on public.whatsapp_messages(conversation_id);
create index if not exists idx_whatsapp_messages_created_at on public.whatsapp_messages(created_at desc);
create index if not exists idx_provider_events_created_at on public.provider_events(created_at desc);

alter table public.crm_contacts enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_groups enable row level security;
alter table public.group_contact_lists enable row level security;
alter table public.group_contact_list_items enable row level security;
alter table public.provider_events enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "public_read_crm_contacts" on public.crm_contacts;
create policy "public_read_crm_contacts" on public.crm_contacts for select using (true);

drop policy if exists "public_read_whatsapp_conversations" on public.whatsapp_conversations;
create policy "public_read_whatsapp_conversations" on public.whatsapp_conversations for select using (true);

drop policy if exists "public_read_whatsapp_messages" on public.whatsapp_messages;
create policy "public_read_whatsapp_messages" on public.whatsapp_messages for select using (true);

drop policy if exists "public_read_whatsapp_groups" on public.whatsapp_groups;
create policy "public_read_whatsapp_groups" on public.whatsapp_groups for select using (true);

drop policy if exists "public_read_group_contact_lists" on public.group_contact_lists;
create policy "public_read_group_contact_lists" on public.group_contact_lists for select using (true);

drop policy if exists "public_read_group_contact_list_items" on public.group_contact_list_items;
create policy "public_read_group_contact_list_items" on public.group_contact_list_items for select using (true);

drop policy if exists "service_all_crm_contacts" on public.crm_contacts;
create policy "service_all_crm_contacts" on public.crm_contacts for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service_all_whatsapp_conversations" on public.whatsapp_conversations;
create policy "service_all_whatsapp_conversations" on public.whatsapp_conversations for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service_all_whatsapp_messages" on public.whatsapp_messages;
create policy "service_all_whatsapp_messages" on public.whatsapp_messages for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service_all_whatsapp_groups" on public.whatsapp_groups;
create policy "service_all_whatsapp_groups" on public.whatsapp_groups for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service_all_group_contact_lists" on public.group_contact_lists;
create policy "service_all_group_contact_lists" on public.group_contact_lists for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service_all_group_contact_list_items" on public.group_contact_list_items;
create policy "service_all_group_contact_list_items" on public.group_contact_list_items for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service_all_provider_events" on public.provider_events;
create policy "service_all_provider_events" on public.provider_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service_all_audit_logs" on public.audit_logs;
create policy "service_all_audit_logs" on public.audit_logs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

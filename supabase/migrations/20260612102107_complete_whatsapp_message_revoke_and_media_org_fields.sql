alter table public.whatsapp_messages
  add column if not exists tenant_id uuid references public.tenants(id) on delete set null,
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists deleted_by_sender boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists revoked_payload jsonb,
  add column if not exists has_media boolean not null default false,
  add column if not exists media_count integer not null default 0,
  add column if not exists media_summary text;

create table if not exists public.whatsapp_media_files (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'whatsapp_web',
  message_id uuid references public.whatsapp_messages(id) on delete cascade,
  conversation_id uuid references public.whatsapp_conversations(id) on delete cascade,
  external_message_id text,
  external_chat_id text,
  direction text,
  media_type text,
  mime_type text,
  file_name text,
  file_size_bytes bigint,
  public_url text,
  local_url text,
  caption text,
  raw_payload jsonb not null default '{}'::jsonb,
  download_status text not null default 'pending',
  processing_status text not null default 'pending',
  organization_id uuid references public.organizations(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_shared_locations (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.whatsapp_messages(id) on delete cascade,
  conversation_id uuid references public.whatsapp_conversations(id) on delete cascade,
  external_message_id text,
  external_chat_id text,
  latitude numeric,
  longitude numeric,
  address text,
  name text,
  url text,
  raw_payload jsonb not null default '{}'::jsonb,
  organization_id uuid references public.organizations(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_shared_contacts (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.whatsapp_messages(id) on delete cascade,
  conversation_id uuid references public.whatsapp_conversations(id) on delete cascade,
  external_message_id text,
  external_chat_id text,
  shared_name text,
  shared_phone text,
  shared_email text,
  shared_company text,
  raw_payload jsonb not null default '{}'::jsonb,
  organization_id uuid references public.organizations(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_media_files_message_id_idx on public.whatsapp_media_files(message_id);
create index if not exists whatsapp_shared_locations_message_id_idx on public.whatsapp_shared_locations(message_id);
create index if not exists whatsapp_shared_contacts_message_id_idx on public.whatsapp_shared_contacts(message_id);

alter table public.whatsapp_media_files enable row level security;
alter table public.whatsapp_shared_locations enable row level security;
alter table public.whatsapp_shared_contacts enable row level security;

revoke all on table public.whatsapp_media_files from public, anon, authenticated;
revoke all on table public.whatsapp_shared_locations from public, anon, authenticated;
revoke all on table public.whatsapp_shared_contacts from public, anon, authenticated;

grant all on table public.whatsapp_media_files to service_role;
grant all on table public.whatsapp_shared_locations to service_role;
grant all on table public.whatsapp_shared_contacts to service_role;

drop policy if exists "service_all_whatsapp_media_files" on public.whatsapp_media_files;
create policy "service_all_whatsapp_media_files" on public.whatsapp_media_files
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service_all_whatsapp_shared_locations" on public.whatsapp_shared_locations;
create policy "service_all_whatsapp_shared_locations" on public.whatsapp_shared_locations
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service_all_whatsapp_shared_contacts" on public.whatsapp_shared_contacts;
create policy "service_all_whatsapp_shared_contacts" on public.whatsapp_shared_contacts
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

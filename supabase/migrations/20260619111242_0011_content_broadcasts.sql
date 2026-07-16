-- Content broadcasts: pieces of content prepared for distribution
create table if not exists public.content_broadcasts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  organization_id uuid not null,
  title text not null,
  source_type text null check (source_type in ('article', 'event', 'manual')),
  source_url text null,
  source_title text null,
  message_text text not null,
  status text not null default 'draft' check (status in ('draft', 'ready', 'published', 'failed')),
  scheduled_at timestamptz null,
  published_at timestamptz null,
  created_by uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_broadcasts_tenant_org_idx on public.content_broadcasts (tenant_id, organization_id);
create index if not exists content_broadcasts_status_idx on public.content_broadcasts (status);
create index if not exists content_broadcasts_created_at_idx on public.content_broadcasts (created_at desc);

alter table public.content_broadcasts enable row level security;
drop policy if exists "service_all_content_broadcasts" on public.content_broadcasts;
create policy "service_all_content_broadcasts" on public.content_broadcasts
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
drop policy if exists "public_read_content_broadcasts" on public.content_broadcasts;
create policy "public_read_content_broadcasts" on public.content_broadcasts for select using (true);

-- Broadcast targets: which channels each broadcast was sent to
create table if not exists public.content_broadcast_targets (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.content_broadcasts(id) on delete cascade,
  distribution_channel_id uuid not null references public.distribution_channels(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'published', 'failed', 'skipped')),
  provider_message_id text null,
  error text null,
  published_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (broadcast_id, distribution_channel_id)
);

create index if not exists content_broadcast_targets_broadcast_idx on public.content_broadcast_targets (broadcast_id);
create index if not exists content_broadcast_targets_channel_idx on public.content_broadcast_targets (distribution_channel_id);

alter table public.content_broadcast_targets enable row level security;
drop policy if exists "service_all_broadcast_targets" on public.content_broadcast_targets;
create policy "service_all_broadcast_targets" on public.content_broadcast_targets
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
drop policy if exists "public_read_broadcast_targets" on public.content_broadcast_targets;
create policy "public_read_broadcast_targets" on public.content_broadcast_targets for select using (true);

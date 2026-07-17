-- Distribution channels: where content is broadcast (WA groups, Telegram, Instagram)
-- These are broadcast/informativo only — NOT for conversational support
create table if not exists public.distribution_channels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  organization_id uuid not null,
  name text not null,
  provider text not null check (provider in ('whatsapp_group', 'whatsapp_channel', 'telegram_group', 'telegram_channel', 'instagram')),
  external_id text null,
  external_url text null,
  active boolean not null default true,
  is_broadcast_only boolean not null default true,
  allow_replies boolean not null default false,
  description text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists distribution_channels_tenant_org_idx on public.distribution_channels (tenant_id, organization_id);
create index if not exists distribution_channels_provider_idx on public.distribution_channels (provider);

alter table public.distribution_channels enable row level security;
drop policy if exists "service_all_distribution_channels" on public.distribution_channels;
create policy "service_all_distribution_channels" on public.distribution_channels
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
drop policy if exists "public_read_distribution_channels" on public.distribution_channels;
create policy "public_read_distribution_channels" on public.distribution_channels for select using (true);

-- Seed example channels for Viciados em Trilhas (idempotent)
insert into public.distribution_channels (tenant_id, organization_id, name, provider, is_broadcast_only, allow_replies, description)
select o.tenant_id, o.id, ch.name, ch.provider, true, false, ch.description
from public.organizations o
cross join (values
  ('WhatsApp Informativos Viciados', 'whatsapp_group',   'Grupo informativo de trilhas e eventos'),
  ('Telegram Canal Viciados',        'telegram_channel', 'Canal oficial Viciados em Trilhas'),
  ('Telegram Grupo Viciados',        'telegram_group',   'Grupo de membros Viciados em Trilhas'),
  ('Instagram Viciados',             'instagram',        'Perfil Instagram @viciadosemtrilhas')
) as ch(name, provider, description)
where o.status = 'active'
on conflict do nothing;

-- Channels: each business unit / WhatsApp number is a channel
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  organization_id uuid not null,
  name text not null,
  slug text not null,
  session_id text not null,
  phone text null,
  active boolean not null default true,
  color text not null default '#2ABFAB',
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, organization_id, slug)
);

create index if not exists channels_tenant_org_idx on public.channels (tenant_id, organization_id);
create index if not exists channels_session_id_idx on public.channels (session_id);

alter table public.channels enable row level security;
drop policy if exists "service_all_channels" on public.channels;
create policy "service_all_channels" on public.channels
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
drop policy if exists "public_read_channels" on public.channels;
create policy "public_read_channels" on public.channels for select using (true);

-- Pipeline stages
create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  organization_id uuid not null,
  name text not null,
  position integer not null default 0,
  color text not null default '#64748b',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pipeline_stages_tenant_org_idx on public.pipeline_stages (tenant_id, organization_id, position);

alter table public.pipeline_stages enable row level security;
drop policy if exists "service_all_pipeline_stages" on public.pipeline_stages;
create policy "service_all_pipeline_stages" on public.pipeline_stages
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
drop policy if exists "public_read_pipeline_stages" on public.pipeline_stages;
create policy "public_read_pipeline_stages" on public.pipeline_stages for select using (true);

-- Pipeline items
create table if not exists public.pipeline_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  organization_id uuid not null,
  stage_id uuid not null references public.pipeline_stages(id) on delete restrict,
  contact_id uuid null references public.crm_contacts(id) on delete set null,
  conversation_id uuid null references public.whatsapp_conversations(id) on delete set null,
  channel_id uuid null references public.channels(id) on delete set null,
  title text not null,
  notes text null,
  value numeric(12,2) null,
  expected_close_date date null,
  closed_at timestamptz null,
  lost_at timestamptz null,
  lost_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pipeline_items_stage_idx on public.pipeline_items (stage_id);
create index if not exists pipeline_items_tenant_org_idx on public.pipeline_items (tenant_id, organization_id);
create index if not exists pipeline_items_contact_idx on public.pipeline_items (contact_id);
create index if not exists pipeline_items_created_at_idx on public.pipeline_items (created_at desc);

alter table public.pipeline_items enable row level security;
drop policy if exists "service_all_pipeline_items" on public.pipeline_items;
create policy "service_all_pipeline_items" on public.pipeline_items
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
drop policy if exists "public_read_pipeline_items" on public.pipeline_items;
create policy "public_read_pipeline_items" on public.pipeline_items for select using (true);

-- Seed default pipeline stages (requires active org — idempotent)
insert into public.pipeline_stages (tenant_id, organization_id, name, position, color)
select o.tenant_id, o.id, stage.name, stage.pos, stage.color
from public.organizations o
cross join (values
  ('Novo Lead', 0, '#3b82f6'),
  ('Contato Realizado', 1, '#8b5cf6'),
  ('Orçamento Enviado', 2, '#f59e0b'),
  ('Negociação', 3, '#f97316'),
  ('Fechado', 4, '#10b981'),
  ('Perdido', 5, '#6b7280')
) as stage(name, pos, color)
where o.status = 'active'
on conflict do nothing;

-- Seed channels for the 6 business units (requires active org — idempotent)
insert into public.channels (tenant_id, organization_id, name, slug, session_id, color, description)
select o.tenant_id, o.id, ch.name, ch.slug, ch.session_id, ch.color, ch.description
from public.organizations o
cross join (values
  ('Viciados em Trilhas', 'viciados', 'viciados-main',  '#16a34a', 'Turismo e aventura'),
  ('MK Shalom',           'mkshalom', 'mkshalom-main',  '#2563eb', 'MK Shalom'),
  ('Oriahfin',            'oriahfin', 'oriahfin-main',  '#7c3aed', 'Oriahfin'),
  ('Shamar Connect',      'shamar',   'shamar-main',    '#0d9488', 'ShamarConnect principal'),
  ('Shamar ERP',          'shamarerp','shamarerp-main', '#ea580c', 'Shamar ERP'),
  ('Shamar Kids',         'shamarkids','shamarkids-main','#ec4899', 'Shamar Kids')
) as ch(name, slug, session_id, color, description)
where o.status = 'active'
on conflict (tenant_id, organization_id, slug) do nothing;

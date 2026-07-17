create table if not exists public.whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  session_id text not null unique,
  name text not null,
  status text not null default 'disconnected',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_connections enable row level security;

drop policy if exists "service_all_whatsapp_connections" on public.whatsapp_connections;
create policy "service_all_whatsapp_connections" on public.whatsapp_connections
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

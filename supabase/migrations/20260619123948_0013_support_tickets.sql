create table if not exists public.support_tickets (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null,
  organization_id uuid not null,
  created_by      uuid null,
  title           text not null,
  description     text not null,
  category        text not null default 'outro',
  priority        text not null default 'normal',
  status          text not null default 'open',
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint support_tickets_category_check check (
    category in ('whatsapp','crm','campanhas','ia','financeiro','acesso','outro')
  ),
  constraint support_tickets_priority_check check (
    priority in ('low','normal','high','urgent')
  ),
  constraint support_tickets_status_check check (
    status in ('open','in_progress','resolved','closed')
  )
);

create index if not exists idx_support_tickets_tenant_org
  on public.support_tickets (tenant_id, organization_id);
create index if not exists idx_support_tickets_status
  on public.support_tickets (status);
create index if not exists idx_support_tickets_created_at
  on public.support_tickets (created_at desc);

alter table public.support_tickets enable row level security;

drop policy if exists "service_all_support_tickets" on public.support_tickets;
create policy "service_all_support_tickets" on public.support_tickets
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 0032: Fila produtiva Lips.
-- Aditiva e idempotente. Nao altera mensagens antigas, nao altera lips-main e nao ativa IA/copilot.

alter table public.whatsapp_conversations
  add column if not exists last_inbound_at timestamptz,
  add column if not exists last_outbound_at timestamptz,
  add column if not exists last_message_direction text,
  add column if not exists requires_human boolean not null default false,
  add column if not exists pending_reason text,
  add column if not exists sla_due_at timestamptz,
  add column if not exists sla_status text,
  add column if not exists watchdog_checked_at timestamptz,
  add column if not exists queue_entered_at timestamptz,
  add column if not exists sla_started_at timestamptz,
  add column if not exists first_human_response_at timestamptz,
  add column if not exists last_assigned_at timestamptz,
  add column if not exists last_assigned_user_id uuid references public.app_users(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists reopened_at timestamptz,
  add column if not exists queue_reason text;

alter table public.whatsapp_conversations
  drop constraint if exists whatsapp_conversations_status_check,
  add constraint whatsapp_conversations_status_check check (status in (
    'open', 'pending', 'archived',
    'new', 'queued', 'assigned', 'in_progress', 'awaiting_customer', 'pending_internal', 'resolved', 'closed'
  ));

alter table public.whatsapp_conversations
  drop constraint if exists whatsapp_conversations_priority_check,
  add constraint whatsapp_conversations_priority_check check (priority in ('baixa', 'normal', 'alta', 'urgente', 'high', 'urgent'));

alter table public.whatsapp_conversations
  drop constraint if exists whatsapp_conversations_sla_status_check,
  add constraint whatsapp_conversations_sla_status_check check (sla_status is null or sla_status in ('pending', 'ok', 'on_time', 'warning', 'breached', 'completed'));

create table if not exists public.department_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  tenant_user_id uuid not null references public.tenant_users(id) on delete cascade,
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  capacity integer not null default 3 check (capacity > 0),
  last_assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, app_user_id)
);

create table if not exists public.agent_availability (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  status text not null default 'offline' check (status in ('online', 'busy', 'away', 'offline')),
  capacity integer not null default 3 check (capacity > 0),
  active_conversations integer not null default 0 check (active_conversations >= 0),
  updated_at timestamptz not null default now(),
  unique (organization_id, app_user_id)
);

create table if not exists public.queue_business_hours (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  timezone text not null default 'America/Sao_Paulo',
  weekdays integer[] not null default array[1,2,3,4,5,6],
  opens_at time not null default '08:00',
  closes_at time not null default '18:00',
  out_of_hours_message text not null default 'Recebemos sua mensagem. Nosso atendimento humano está fora do horário neste momento, mas sua solicitação já foi registrada e será atendida no próximo período de funcionamento.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create table if not exists public.whatsapp_conversation_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  actor_type text not null default 'system' check (actor_type in ('system', 'user', 'automation', 'provider')),
  actor_id uuid,
  event_type text not null,
  event_source text,
  previous_state text,
  new_state text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.department_memberships enable row level security;
alter table public.agent_availability enable row level security;
alter table public.queue_business_hours enable row level security;
alter table public.whatsapp_conversation_events enable row level security;

drop policy if exists "service_all_department_memberships" on public.department_memberships;
create policy "service_all_department_memberships" on public.department_memberships for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists "service_all_agent_availability" on public.agent_availability;
create policy "service_all_agent_availability" on public.agent_availability for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists "service_all_queue_business_hours" on public.queue_business_hours;
create policy "service_all_queue_business_hours" on public.queue_business_hours for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists "service_all_whatsapp_conversation_events" on public.whatsapp_conversation_events;
create policy "service_all_whatsapp_conversation_events" on public.whatsapp_conversation_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create index if not exists whatsapp_conversations_queue_status_idx on public.whatsapp_conversations (organization_id, status, last_message_at desc);
create index if not exists whatsapp_conversations_queue_department_idx on public.whatsapp_conversations (organization_id, department_id, status, last_message_at desc);
create index if not exists whatsapp_conversations_queue_assigned_idx on public.whatsapp_conversations (organization_id, assigned_to, status, last_message_at desc);
create index if not exists whatsapp_conversations_queue_sla_idx on public.whatsapp_conversations (organization_id, sla_due_at) where sla_due_at is not null;
create index if not exists whatsapp_conversations_channel_updated_idx on public.whatsapp_conversations (channel_id, updated_at desc);
create index if not exists department_memberships_department_idx on public.department_memberships (department_id, status);
create index if not exists agent_availability_org_status_idx on public.agent_availability (organization_id, status);
create index if not exists whatsapp_conversation_events_conv_idx on public.whatsapp_conversation_events (conversation_id, created_at desc);

insert into public.departments (tenant_id, organization_id, name, color, is_active)
select c.tenant_id, c.organization_id, d.name, d.color, true
from public.channels c
cross join (values
  ('Balcão', '#2ABFAB'),
  ('Oficina', '#1B2F5B'),
  ('Supervisão', '#C9952A')
) as d(name, color)
where c.session_id = 'lips-main'
  and not exists (
    select 1 from public.departments existing
    where existing.organization_id = c.organization_id
      and lower(existing.name) = lower(d.name)
  );

insert into public.queue_business_hours (tenant_id, organization_id)
select c.tenant_id, c.organization_id
from public.channels c
where c.session_id = 'lips-main'
on conflict (organization_id) do nothing;

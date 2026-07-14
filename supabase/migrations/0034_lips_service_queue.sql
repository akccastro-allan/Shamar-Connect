-- 0034: Fila de atendimento produtiva Lips.
-- Aditiva e idempotente. Nao altera mensagens antigas em massa, nao altera lips-main e nao ativa IA/copilot.

set search_path = public, pg_temp;

create or replace function public.normalize_department_name(value text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select translate(
    lower(regexp_replace(btrim(coalesce(value, '')), '\s+', ' ', 'g')),
    'áàâãäéèêëíìîïóòôõöúùûüç',
    'aaaaaeeeeiiiiooooouuuuc'
  );
$$;

alter table public.whatsapp_conversations
  add column if not exists last_inbound_at timestamptz,
  add column if not exists last_outbound_at timestamptz,
  add column if not exists last_message_direction text,
  add column if not exists requires_human boolean not null default false,
  add column if not exists pending_reason text,
  add column if not exists sla_due_at timestamptz,
  add column if not exists sla_status text,
  add column if not exists watchdog_checked_at timestamptz,
  add column if not exists queue_status text not null default 'waiting',
  add column if not exists handoff_reason text,
  add column if not exists queue_entered_at timestamptz,
  add column if not exists assigned_user_id uuid references public.app_users(id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists sla_started_at timestamptz,
  add column if not exists first_human_response_at timestamptz,
  add column if not exists first_human_response_seconds integer,
  add column if not exists last_assigned_at timestamptz,
  add column if not exists last_assigned_user_id uuid references public.app_users(id) on delete set null,
  add column if not exists sla_breached_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists reopened_at timestamptz,
  add column if not exists last_human_message_at timestamptz,
  add column if not exists last_customer_message_at timestamptz,
  add column if not exists queue_reason text;

alter table public.whatsapp_conversations
  drop constraint if exists whatsapp_conversations_queue_status_check,
  add constraint whatsapp_conversations_queue_status_check check (queue_status in ('waiting', 'in_progress', 'awaiting_customer', 'resolved', 'closed'));

alter table public.whatsapp_conversations
  drop constraint if exists whatsapp_conversations_status_check,
  add constraint whatsapp_conversations_status_check check (status in (
    'open', 'pending', 'archived',
    'new', 'queued', 'assigned', 'in_progress', 'awaiting_customer', 'pending_internal', 'resolved', 'closed'
  ));

alter table public.whatsapp_conversations
  drop constraint if exists whatsapp_conversations_priority_check;

update public.whatsapp_conversations
set priority = case priority
  when 'baixa' then 'low'
  when 'alta' then 'high'
  when 'urgente' then 'urgent'
  else priority
end
where priority in ('baixa', 'alta', 'urgente');

alter table public.whatsapp_conversations
  add constraint whatsapp_conversations_priority_check check (priority in ('low', 'normal', 'high', 'urgent'));

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
  status text not null default 'offline' check (status in ('available', 'paused', 'offline')),
  accepting_new_conversations boolean not null default false,
  capacity integer not null default 3 check (capacity > 0),
  current_load integer not null default 0 check (current_load >= 0),
  active_conversations integer not null default 0 check (active_conversations >= 0),
  updated_at timestamptz not null default now(),
  unique (organization_id, app_user_id)
);

alter table public.agent_availability
  add column if not exists accepting_new_conversations boolean not null default false,
  add column if not exists current_load integer not null default 0;

update public.agent_availability
set status = case
  when status = 'online' then 'available'
  when status in ('busy', 'away') then 'paused'
  else status
end,
accepting_new_conversations = case when status = 'online' then true else accepting_new_conversations end
where status in ('online', 'busy', 'away');

alter table public.agent_availability
  drop constraint if exists agent_availability_status_check,
  add constraint agent_availability_status_check check (status in ('available', 'paused', 'offline'));

alter table public.agent_availability
  drop constraint if exists agent_availability_current_load_check,
  add constraint agent_availability_current_load_check check (current_load >= 0);

create table if not exists public.agent_availability_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  actor_user_id uuid references public.app_users(id) on delete set null,
  previous_status text,
  new_status text not null,
  accepting_new_conversations boolean not null default false,
  event_type text not null default 'availability_changed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.queue_business_hours (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  timezone text not null default 'America/Sao_Paulo',
  weekdays integer[] not null default '{}',
  opens_at time,
  closes_at time,
  out_of_hours_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create table if not exists public.whatsapp_conversation_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete set null,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  actor_type text not null default 'system' check (actor_type in ('system', 'user', 'automation', 'provider')),
  actor_id uuid,
  actor_user_id uuid references public.app_users(id) on delete set null,
  event_type text not null,
  event_source text,
  previous_state text,
  new_state text,
  from_value text,
  to_value text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.whatsapp_conversation_events
  add column if not exists channel_id uuid references public.channels(id) on delete set null,
  add column if not exists actor_user_id uuid references public.app_users(id) on delete set null,
  add column if not exists from_value text,
  add column if not exists to_value text;

alter table public.department_memberships enable row level security;
alter table public.agent_availability enable row level security;
alter table public.agent_availability_events enable row level security;
alter table public.queue_business_hours enable row level security;
alter table public.whatsapp_conversation_events enable row level security;

grant all on table public.department_memberships to service_role;
grant all on table public.agent_availability to service_role;
grant all on table public.agent_availability_events to service_role;
grant all on table public.queue_business_hours to service_role;
grant all on table public.whatsapp_conversation_events to service_role;

drop policy if exists "service_all_department_memberships" on public.department_memberships;
create policy "service_all_department_memberships" on public.department_memberships for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists "service_all_agent_availability" on public.agent_availability;
create policy "service_all_agent_availability" on public.agent_availability for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists "service_all_agent_availability_events" on public.agent_availability_events;
create policy "service_all_agent_availability_events" on public.agent_availability_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists "service_all_queue_business_hours" on public.queue_business_hours;
create policy "service_all_queue_business_hours" on public.queue_business_hours for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists "service_all_whatsapp_conversation_events" on public.whatsapp_conversation_events;
create policy "service_all_whatsapp_conversation_events" on public.whatsapp_conversation_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create index if not exists whatsapp_conversations_channel_queue_status_idx on public.whatsapp_conversations (channel_id, queue_status);
create index if not exists whatsapp_conversations_channel_department_queue_idx on public.whatsapp_conversations (channel_id, department_id, queue_status);
create index if not exists whatsapp_conversations_channel_assigned_queue_idx on public.whatsapp_conversations (channel_id, assigned_user_id, queue_status);
create index if not exists whatsapp_conversations_channel_sla_idx on public.whatsapp_conversations (channel_id, sla_due_at) where sla_due_at is not null;
create index if not exists whatsapp_conversations_channel_priority_entered_idx on public.whatsapp_conversations (channel_id, priority, queue_entered_at desc);
create index if not exists whatsapp_conversations_channel_updated_idx on public.whatsapp_conversations (channel_id, updated_at desc);
create index if not exists department_memberships_department_idx on public.department_memberships (department_id, status);
create index if not exists agent_availability_org_status_idx on public.agent_availability (organization_id, status, accepting_new_conversations);
create index if not exists agent_availability_events_actor_idx on public.agent_availability_events (organization_id, app_user_id, created_at desc);
create index if not exists whatsapp_conversation_events_conv_idx on public.whatsapp_conversation_events (conversation_id, created_at desc);

create or replace function public.mark_lips_sla_breaches(escalate_to_supervision boolean default false)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed_count integer := 0;
begin
  with lips_supervision as (
    select d.id, d.tenant_id, d.organization_id
    from public.departments d
    where d.organization_id = '8f074193-bf58-4537-9842-720619a9f259'::uuid
      and public.normalize_department_name(d.name) = 'supervisao'
      and d.is_active = true
    limit 1
  ), changed as (
    update public.whatsapp_conversations c
    set sla_status = 'breached',
        sla_breached_at = coalesce(c.sla_breached_at, now()),
        priority = 'urgent',
        department_id = case when escalate_to_supervision then coalesce((select id from lips_supervision), c.department_id) else c.department_id end,
        updated_at = now()
    where c.organization_id = '8f074193-bf58-4537-9842-720619a9f259'::uuid
      and c.queue_status in ('waiting', 'in_progress', 'awaiting_customer')
      and c.sla_due_at is not null
      and c.sla_due_at <= now()
      and c.sla_breached_at is null
    returning c.id, c.tenant_id, c.organization_id
  ), events as (
    insert into public.whatsapp_conversation_events (tenant_id, organization_id, conversation_id, actor_type, event_type, event_source, previous_state, new_state, description, metadata)
    select tenant_id, organization_id, id, 'system', 'sla_breached', 'queue', 'on_time', 'breached', 'SLA vencido marcado de forma idempotente.', jsonb_build_object('escalatedToSupervision', escalate_to_supervision)
    from changed
    returning id
  )
  select count(*) into changed_count from changed;

  return changed_count;
end;
$$;

grant execute on function public.mark_lips_sla_breaches(boolean) to service_role;

insert into public.departments (tenant_id, organization_id, name, color, is_active)
select c.tenant_id, c.organization_id, d.name, d.color, true
from public.channels c
cross join (values
  ('Balcão', '#2ABFAB'),
  ('Oficina', '#1B2F5B'),
  ('Financeiro', '#0F766E'),
  ('Supervisão', '#C9952A')
) as d(name, color)
where c.session_id = 'lips-main'
  and c.organization_id = '8f074193-bf58-4537-9842-720619a9f259'::uuid
  and not exists (
    select 1 from public.departments existing
    where existing.tenant_id = c.tenant_id
      and existing.organization_id = c.organization_id
      and public.normalize_department_name(existing.name) = public.normalize_department_name(d.name)
  );

update public.departments d
set is_active = true,
    updated_at = now()
from public.channels c
where c.session_id = 'lips-main'
  and c.organization_id = '8f074193-bf58-4537-9842-720619a9f259'::uuid
  and d.tenant_id = c.tenant_id
  and d.organization_id = c.organization_id
  and public.normalize_department_name(d.name) in ('balcao', 'oficina', 'financeiro', 'supervisao')
  and d.is_active is distinct from true;

insert into public.queue_business_hours (tenant_id, organization_id)
select c.tenant_id, c.organization_id
from public.channels c
where c.session_id = 'lips-main'
  and c.organization_id = '8f074193-bf58-4537-9842-720619a9f259'::uuid
on conflict (organization_id) do nothing;

insert into public.department_memberships (tenant_id, organization_id, department_id, tenant_user_id, app_user_id, status, capacity)
select c.tenant_id, c.organization_id, d.id, tu.id, au.id, 'active', 3
from public.channels c
join public.app_users au on au.email = 'lips@moriahsystems.com.br' and au.status = 'active'
join public.tenant_users tu on tu.tenant_id = c.tenant_id and tu.app_user_id = au.id and tu.role = 'owner' and tu.status = 'active'
join public.departments d on d.tenant_id = c.tenant_id and d.organization_id = c.organization_id and public.normalize_department_name(d.name) in ('balcao', 'oficina', 'financeiro', 'supervisao') and d.is_active = true
where c.session_id = 'lips-main'
  and c.organization_id = '8f074193-bf58-4537-9842-720619a9f259'::uuid
on conflict (department_id, app_user_id)
do update set
  status = 'active',
  capacity = excluded.capacity,
  updated_at = now();

insert into public.agent_availability (tenant_id, organization_id, app_user_id, status, accepting_new_conversations, current_load, active_conversations, capacity, updated_at)
select c.tenant_id, c.organization_id, au.id, 'offline', false, 0, 0, 3, now()
from public.channels c
join public.app_users au on au.email = 'lips@moriahsystems.com.br' and au.status = 'active'
join public.tenant_users tu on tu.tenant_id = c.tenant_id and tu.app_user_id = au.id and tu.role = 'owner' and tu.status = 'active'
where c.session_id = 'lips-main'
  and c.organization_id = '8f074193-bf58-4537-9842-720619a9f259'::uuid
on conflict (organization_id, app_user_id)
do update set
  status = 'offline',
  accepting_new_conversations = false,
  current_load = 0,
  active_conversations = 0,
  updated_at = now();

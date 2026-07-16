-- 0034b: Tabelas, seguranca e indices da fila de atendimento produtiva Lips.
-- Aditiva e idempotente. Nao altera lips-main e nao ativa IA/copilot.

set search_path = public, pg_temp;

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
  add column if not exists actor_type text not null default 'system',
  add column if not exists actor_id uuid,
  add column if not exists actor_user_id uuid references public.app_users(id) on delete set null,
  add column if not exists previous_state text,
  add column if not exists new_state text,
  add column if not exists from_value text,
  add column if not exists to_value text;

alter table public.whatsapp_conversation_events
  drop constraint if exists whatsapp_conversation_events_actor_type_check,
  add constraint whatsapp_conversation_events_actor_type_check check (actor_type in ('system', 'user', 'automation', 'provider'));

alter table public.department_memberships enable row level security;
alter table public.agent_availability enable row level security;
alter table public.agent_availability_events enable row level security;
alter table public.queue_business_hours enable row level security;
alter table public.whatsapp_conversation_events enable row level security;

revoke all on table public.department_memberships from public, anon, authenticated;
revoke all on table public.agent_availability from public, anon, authenticated;
revoke all on table public.agent_availability_events from public, anon, authenticated;
revoke all on table public.queue_business_hours from public, anon, authenticated;
revoke all on table public.whatsapp_conversation_events from public, anon, authenticated;

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
create index if not exists whatsapp_conversation_events_conv_event_idx on public.whatsapp_conversation_events (conversation_id, event_type, created_at desc);

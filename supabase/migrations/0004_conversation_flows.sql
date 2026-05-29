create table if not exists public.conversation_flows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  trigger_type text not null default 'manual',
  status text not null default 'draft',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversation_flows_status_check check (status in ('draft', 'active', 'paused', 'archived')),
  constraint conversation_flows_trigger_type_check check (trigger_type in ('manual', 'keyword', 'new_contact', 'follow_up'))
);

create table if not exists public.conversation_flow_steps (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.conversation_flows(id) on delete cascade,
  step_order integer not null default 1,
  title text not null,
  message_body text not null,
  wait_minutes integer not null default 0,
  step_type text not null default 'message',
  quick_reply_id uuid references public.quick_replies(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversation_flow_steps_step_type_check check (step_type in ('message', 'question', 'follow_up'))
);

create table if not exists public.conversation_flow_sessions (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.conversation_flows(id) on delete cascade,
  conversation_id uuid references public.whatsapp_conversations(id) on delete set null,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  current_step_order integer not null default 1,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_sent_at timestamptz,
  metadata jsonb not null default '{}',
  constraint conversation_flow_sessions_status_check check (status in ('active', 'paused', 'completed', 'cancelled'))
);

create index if not exists idx_conversation_flows_status on public.conversation_flows(status);
create index if not exists idx_conversation_flow_steps_flow_id on public.conversation_flow_steps(flow_id);
create index if not exists idx_conversation_flow_sessions_flow_id on public.conversation_flow_sessions(flow_id);
create index if not exists idx_conversation_flow_sessions_conversation_id on public.conversation_flow_sessions(conversation_id);

alter table public.conversation_flows enable row level security;
alter table public.conversation_flow_steps enable row level security;
alter table public.conversation_flow_sessions enable row level security;

drop policy if exists "public_read_conversation_flows" on public.conversation_flows;
create policy "public_read_conversation_flows" on public.conversation_flows for select using (status <> 'archived');

drop policy if exists "public_read_conversation_flow_steps" on public.conversation_flow_steps;
create policy "public_read_conversation_flow_steps" on public.conversation_flow_steps for select using (true);

drop policy if exists "public_read_conversation_flow_sessions" on public.conversation_flow_sessions;
create policy "public_read_conversation_flow_sessions" on public.conversation_flow_sessions for select using (true);

drop policy if exists "service_all_conversation_flows" on public.conversation_flows;
create policy "service_all_conversation_flows" on public.conversation_flows
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service_all_conversation_flow_steps" on public.conversation_flow_steps;
create policy "service_all_conversation_flow_steps" on public.conversation_flow_steps
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service_all_conversation_flow_sessions" on public.conversation_flow_sessions;
create policy "service_all_conversation_flow_sessions" on public.conversation_flow_sessions
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

insert into public.conversation_flows (name, description, trigger_type, status, tags)
values
  ('Atendimento inicial', 'Fluxo manual para iniciar uma conversa e qualificar o contato.', 'manual', 'active', array['atendimento','qualificacao']),
  ('Follow-up comercial', 'Fluxo manual para retomar contato depois do primeiro atendimento.', 'manual', 'active', array['comercial','follow-up'])
on conflict do nothing;

insert into public.conversation_flow_steps (flow_id, step_order, title, message_body, wait_minutes, step_type)
select id, 1, 'Saudação', 'Olá! Tudo bem? Recebemos sua mensagem e já vou te ajudar.', 0, 'message'
from public.conversation_flows where name = 'Atendimento inicial'
on conflict do nothing;

insert into public.conversation_flow_steps (flow_id, step_order, title, message_body, wait_minutes, step_type)
select id, 2, 'Qualificação', 'Para eu te orientar melhor, pode me passar mais detalhes sobre o que você precisa?', 0, 'question'
from public.conversation_flows where name = 'Atendimento inicial'
on conflict do nothing;

insert into public.conversation_flow_steps (flow_id, step_order, title, message_body, wait_minutes, step_type)
select id, 1, 'Retomada', 'Olá! Passando para saber se você conseguiu avaliar as informações que conversamos.', 1440, 'follow_up'
from public.conversation_flows where name = 'Follow-up comercial'
on conflict do nothing;

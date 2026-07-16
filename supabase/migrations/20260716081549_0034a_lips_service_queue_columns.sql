-- 0034a: Colunas e constraints da fila de atendimento produtiva Lips.
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

revoke all on function public.normalize_department_name(text) from public, anon, authenticated;
grant execute on function public.normalize_department_name(text) to service_role;

alter table public.whatsapp_conversations
  add column if not exists last_inbound_at timestamptz,
  add column if not exists last_outbound_at timestamptz,
  add column if not exists last_message_direction text,
  add column if not exists requires_human boolean not null default false,
  add column if not exists pending_reason text,
  add column if not exists sla_due_at timestamptz,
  add column if not exists sla_status text,
  add column if not exists watchdog_checked_at timestamptz,
  add column if not exists queue_status text,
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
  alter column queue_status set default 'waiting';

alter table public.whatsapp_conversations
  drop constraint if exists whatsapp_conversations_queue_status_check,
  add constraint whatsapp_conversations_queue_status_check check (
    queue_status is null
    or queue_status in ('waiting', 'in_progress', 'awaiting_customer', 'resolved', 'closed')
  );

alter table public.whatsapp_conversations
  drop constraint if exists whatsapp_conversations_status_check,
  add constraint whatsapp_conversations_status_check check (status in (
    'open', 'pending', 'archived',
    'new', 'queued', 'assigned', 'in_progress', 'awaiting_customer', 'pending_internal', 'resolved', 'closed'
  ));

alter table public.whatsapp_conversations
  drop constraint if exists whatsapp_conversations_priority_check;

alter table public.whatsapp_conversations
  add constraint whatsapp_conversations_priority_check check (priority in ('low', 'normal', 'high', 'urgent', 'baixa', 'alta', 'urgente'));

alter table public.whatsapp_conversations
  drop constraint if exists whatsapp_conversations_sla_status_check,
  add constraint whatsapp_conversations_sla_status_check check (sla_status in ('on_time', 'warning', 'breached', 'completed', 'ok', 'pending'));

comment on column public.whatsapp_conversations.sla_status is
  'Estados oficiais: on_time, warning, breached, completed. Valores legados ok/pending permanecem temporariamente ate revisao semantica futura.';

alter table public.whatsapp_conversations
  alter column sla_status set default 'on_time';

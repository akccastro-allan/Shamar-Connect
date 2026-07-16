-- 0035: Sincronizacao automatica WhatsApp Web.
-- Aditiva e idempotente. Nao armazena segredos, QR, cookies ou tokens.

set search_path = public, pg_temp;

create table if not exists public.whatsapp_channel_sync_state (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  provider text not null default 'whatsapp_web',
  session_id text,
  sync_status text not null default 'idle' check (sync_status in ('idle', 'queued', 'syncing', 'ready', 'degraded', 'failed', 'disabled')),
  last_mode text check (last_mode is null or last_mode in ('bootstrap', 'incremental', 'reconciliation', 'manual_diagnostic')),
  last_run_id uuid,
  last_queued_at timestamptz,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  bootstrap_completed_at timestamptz,
  last_chat_checkpoint timestamptz,
  last_message_checkpoint timestamptz,
  last_provider_status text,
  last_provider_seen_at timestamptz,
  next_reconciliation_at timestamptz,
  locked_at timestamptz,
  lock_expires_at timestamptz,
  locked_by text,
  cursor jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_id)
);

create table if not exists public.whatsapp_sync_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  sync_state_id uuid references public.whatsapp_channel_sync_state(id) on delete set null,
  mode text not null check (mode in ('bootstrap', 'incremental', 'reconciliation', 'manual_diagnostic')),
  trigger_source text not null default 'system',
  requested_by_app_user_id uuid references public.app_users(id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'partial', 'failed', 'skipped')),
  selected_chat_ids text[] not null default '{}',
  chat_limit integer not null default 20 check (chat_limit between 1 and 100),
  message_limit integer not null default 50 check (message_limit between 1 and 100),
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  chats_scanned integer not null default 0,
  chats_synced integer not null default 0,
  chats_skipped integer not null default 0,
  messages_scanned integer not null default 0,
  messages_saved integer not null default 0,
  messages_updated integer not null default 0,
  errors_count integer not null default 0,
  error_message text,
  diagnostics jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  lock_id text,
  locked_at timestamptz,
  lock_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'whatsapp_channel_sync_state_last_run_id_fkey'
  ) then
    alter table public.whatsapp_channel_sync_state
      add constraint whatsapp_channel_sync_state_last_run_id_fkey
      foreign key (last_run_id) references public.whatsapp_sync_runs(id) on delete set null;
  end if;
end $$;

alter table public.whatsapp_channel_sync_state enable row level security;
alter table public.whatsapp_sync_runs enable row level security;

grant all on table public.whatsapp_channel_sync_state to service_role;
grant all on table public.whatsapp_sync_runs to service_role;

drop policy if exists "service_all_whatsapp_channel_sync_state" on public.whatsapp_channel_sync_state;
create policy "service_all_whatsapp_channel_sync_state" on public.whatsapp_channel_sync_state
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service_all_whatsapp_sync_runs" on public.whatsapp_sync_runs;
create policy "service_all_whatsapp_sync_runs" on public.whatsapp_sync_runs
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create index if not exists whatsapp_channel_sync_state_org_status_idx
  on public.whatsapp_channel_sync_state (organization_id, sync_status, updated_at desc);
create index if not exists whatsapp_channel_sync_state_next_reconciliation_idx
  on public.whatsapp_channel_sync_state (next_reconciliation_at)
  where next_reconciliation_at is not null and sync_status <> 'disabled';
create index if not exists whatsapp_sync_runs_channel_created_idx
  on public.whatsapp_sync_runs (channel_id, created_at desc);
create index if not exists whatsapp_sync_runs_status_scheduled_idx
  on public.whatsapp_sync_runs (status, scheduled_at, created_at);
create unique index if not exists whatsapp_sync_runs_one_active_per_channel_idx
  on public.whatsapp_sync_runs (channel_id)
  where status in ('queued', 'running');

comment on table public.whatsapp_channel_sync_state is
  'Estado operacional da sincronizacao WhatsApp por canal. Nunca guardar segredos, QR, cookies ou tokens.';
comment on table public.whatsapp_sync_runs is
  'Jobs/runs de sincronizacao WhatsApp. Payloads devem conter apenas metadados operacionais nao secretos.';

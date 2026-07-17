-- AI Response Logs: every supervised AI suggestion is recorded here for audit
create table if not exists public.ai_response_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  organization_id uuid not null,
  conversation_id uuid null,
  message_id uuid null,
  contact_id uuid null,
  channel text not null default 'whatsapp',
  mode text not null default 'copilot',
  prompt text null,
  user_message text null,
  suggested_response text null,
  final_response text null,
  status text not null default 'suggested',
  risk_level text null,
  intent text null,
  blocked_reason text null,
  metadata jsonb not null default '{}'::jsonb,
  reviewed_by uuid null,
  reviewed_at timestamptz null,
  sent_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- status: suggested | approved | edited | sent | blocked | ignored | failed
-- risk_level: low | medium | high
-- mode: off | copilot | assisted | human_only

create index if not exists ai_response_logs_conversation_id_idx on public.ai_response_logs (conversation_id);
create index if not exists ai_response_logs_tenant_org_idx on public.ai_response_logs (tenant_id, organization_id);
create index if not exists ai_response_logs_created_at_idx on public.ai_response_logs (created_at desc);

alter table public.ai_response_logs enable row level security;
revoke all on table public.ai_response_logs from public, anon, authenticated;
grant all on table public.ai_response_logs to service_role;

drop policy if exists "service_all_ai_response_logs" on public.ai_response_logs;
create policy "service_all_ai_response_logs" on public.ai_response_logs
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

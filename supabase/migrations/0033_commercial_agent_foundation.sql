-- 0033: Fundacao do agente comercial supervisionado.
--
-- Migration preparada para revisao. Nao aplicar em producao sem aprovacao operacional.
-- Regras:
-- - tenant_id e organization_id obrigatorios em todas as tabelas;
-- - service_role only nesta fase;
-- - sem prompts completos, chain of thought, tokens, secrets ou payloads brutos.

create table if not exists public.commercial_agent_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  business_name text not null,
  enabled boolean not null default false,
  stage text not null default 'internal_alpha',
  response_mode text not null default 'observer',
  pricing_authority text not null default 'human',
  stock_authority text not null default 'human',
  profile jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_agent_profiles_stage_check check (stage in ('hidden', 'internal_alpha', 'private_beta', 'public_beta', 'stable')),
  constraint commercial_agent_profiles_response_mode_check check (response_mode in ('observer', 'copilot', 'assisted', 'approved_automation')),
  constraint commercial_agent_profiles_pricing_authority_check check (pricing_authority in ('catalog', 'table', 'proposal', 'human')),
  constraint commercial_agent_profiles_stock_authority_check check (stock_authority in ('catalog', 'integration', 'human')),
  constraint commercial_agent_profiles_status_check check (status in ('draft', 'active', 'paused', 'archived')),
  constraint commercial_agent_profiles_profile_no_secrets_check check (
    not (profile ?| array['api_key', 'apikey', 'secret', 'token', 'cookie', 'access_token', 'refresh_token', 'service_role'])
  )
);

create unique index if not exists commercial_agent_profiles_scope_name_uniq
  on public.commercial_agent_profiles (tenant_id, organization_id, name);

create index if not exists commercial_agent_profiles_scope_idx
  on public.commercial_agent_profiles (tenant_id, organization_id, status);

create table if not exists public.commercial_conversation_analysis (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete set null,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  profile_id uuid references public.commercial_agent_profiles(id) on delete set null,
  status text not null default 'generated',
  analysis jsonb not null default '{}'::jsonb,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_conversation_analysis_status_check check (status in ('generated', 'stale', 'archived')),
  constraint commercial_conversation_analysis_no_secrets_check check (
    not (analysis ?| array['api_key', 'apikey', 'secret', 'token', 'cookie', 'access_token', 'refresh_token', 'service_role', 'chain_of_thought'])
  )
);

create index if not exists commercial_conversation_analysis_scope_idx
  on public.commercial_conversation_analysis (tenant_id, organization_id, conversation_id, created_at desc);

create table if not exists public.commercial_response_suggestions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete set null,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  profile_id uuid references public.commercial_agent_profiles(id) on delete set null,
  analysis_id uuid references public.commercial_conversation_analysis(id) on delete set null,
  status text not null default 'draft',
  suggestion jsonb not null default '{}'::jsonb,
  edited_text text,
  rejection_reason text,
  created_by uuid references public.app_users(id) on delete set null,
  reviewed_by uuid references public.app_users(id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_response_suggestions_status_check check (status in ('draft', 'approved', 'edited', 'rejected', 'expired', 'unsafe_suggestion')),
  constraint commercial_response_suggestions_no_secrets_check check (
    not (suggestion ?| array['api_key', 'apikey', 'secret', 'token', 'cookie', 'access_token', 'refresh_token', 'service_role', 'chain_of_thought'])
  )
);

create index if not exists commercial_response_suggestions_scope_idx
  on public.commercial_response_suggestions (tenant_id, organization_id, conversation_id, status, created_at desc);

create table if not exists public.commercial_follow_ups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete set null,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  profile_id uuid references public.commercial_agent_profiles(id) on delete set null,
  opportunity_id uuid,
  status text not null default 'pending',
  reason text not null,
  priority text not null default 'normal',
  suggested_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_follow_ups_status_check check (status in ('pending', 'done', 'cancelled', 'expired')),
  constraint commercial_follow_ups_priority_check check (priority in ('low', 'normal', 'high'))
);

create index if not exists commercial_follow_ups_scope_idx
  on public.commercial_follow_ups (tenant_id, organization_id, status, due_at);

create table if not exists public.commercial_opportunities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete set null,
  conversation_id uuid references public.whatsapp_conversations(id) on delete set null,
  profile_id uuid references public.commercial_agent_profiles(id) on delete set null,
  status text not null default 'open',
  stage text not null default 'new',
  temperature text not null default 'cold',
  title text not null,
  potential_value numeric(12,2),
  currency text not null default 'BRL',
  summary text,
  lost_reason text,
  won_at timestamptz,
  lost_at timestamptz,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_opportunities_status_check check (status in ('open', 'won', 'lost', 'archived')),
  constraint commercial_opportunities_stage_check check (stage in ('new', 'qualifying', 'qualified', 'offer_preparation', 'offer_sent', 'objection', 'negotiation', 'ready_to_close', 'follow_up', 'won', 'lost')),
  constraint commercial_opportunities_temperature_check check (temperature in ('cold', 'warm', 'hot')),
  constraint commercial_opportunities_value_check check (potential_value is null or potential_value >= 0)
);

create index if not exists commercial_opportunities_scope_idx
  on public.commercial_opportunities (tenant_id, organization_id, status, stage, updated_at desc);

create index if not exists commercial_opportunities_temperature_idx
  on public.commercial_opportunities (tenant_id, organization_id, temperature)
  where status = 'open';

alter table public.commercial_agent_profiles enable row level security;
alter table public.commercial_conversation_analysis enable row level security;
alter table public.commercial_response_suggestions enable row level security;
alter table public.commercial_follow_ups enable row level security;
alter table public.commercial_opportunities enable row level security;

drop policy if exists "service_all_commercial_agent_profiles" on public.commercial_agent_profiles;
create policy "service_all_commercial_agent_profiles" on public.commercial_agent_profiles
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service_all_commercial_conversation_analysis" on public.commercial_conversation_analysis;
create policy "service_all_commercial_conversation_analysis" on public.commercial_conversation_analysis
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service_all_commercial_response_suggestions" on public.commercial_response_suggestions;
create policy "service_all_commercial_response_suggestions" on public.commercial_response_suggestions
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service_all_commercial_follow_ups" on public.commercial_follow_ups;
create policy "service_all_commercial_follow_ups" on public.commercial_follow_ups
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service_all_commercial_opportunities" on public.commercial_opportunities;
create policy "service_all_commercial_opportunities" on public.commercial_opportunities
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

revoke all on public.commercial_agent_profiles from anon, authenticated;
revoke all on public.commercial_conversation_analysis from anon, authenticated;
revoke all on public.commercial_response_suggestions from anon, authenticated;
revoke all on public.commercial_follow_ups from anon, authenticated;
revoke all on public.commercial_opportunities from anon, authenticated;

grant all on public.commercial_agent_profiles to service_role;
grant all on public.commercial_conversation_analysis to service_role;
grant all on public.commercial_response_suggestions to service_role;
grant all on public.commercial_follow_ups to service_role;
grant all on public.commercial_opportunities to service_role;

create or replace function public.touch_commercial_agent_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists commercial_agent_profiles_touch_updated_at on public.commercial_agent_profiles;
create trigger commercial_agent_profiles_touch_updated_at
  before update on public.commercial_agent_profiles
  for each row execute function public.touch_commercial_agent_updated_at();

drop trigger if exists commercial_conversation_analysis_touch_updated_at on public.commercial_conversation_analysis;
create trigger commercial_conversation_analysis_touch_updated_at
  before update on public.commercial_conversation_analysis
  for each row execute function public.touch_commercial_agent_updated_at();

drop trigger if exists commercial_response_suggestions_touch_updated_at on public.commercial_response_suggestions;
create trigger commercial_response_suggestions_touch_updated_at
  before update on public.commercial_response_suggestions
  for each row execute function public.touch_commercial_agent_updated_at();

drop trigger if exists commercial_follow_ups_touch_updated_at on public.commercial_follow_ups;
create trigger commercial_follow_ups_touch_updated_at
  before update on public.commercial_follow_ups
  for each row execute function public.touch_commercial_agent_updated_at();

drop trigger if exists commercial_opportunities_touch_updated_at on public.commercial_opportunities;
create trigger commercial_opportunities_touch_updated_at
  before update on public.commercial_opportunities
  for each row execute function public.touch_commercial_agent_updated_at();

comment on table public.commercial_agent_profiles is
  'Perfis estruturados do agente comercial supervisionado. Sem prompts soltos, secrets ou chain of thought.';
comment on table public.commercial_conversation_analysis is
  'Analises comerciais estruturadas por tenant/organizacao/conversa. Nao armazenar mensagens completas.';
comment on table public.commercial_response_suggestions is
  'Sugestoes comerciais sempre dependem de aprovacao humana nesta fase. Nenhuma rota envia WhatsApp.';
comment on table public.commercial_follow_ups is
  'Follow-ups manuais sugeridos pelo agente comercial; sem envio automatico.';
comment on table public.commercial_opportunities is
  'Oportunidades comerciais isoladas por tenant e organizacao.';

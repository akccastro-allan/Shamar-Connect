-- 0032: Gateways internos persistidos para o Centro de Comando.
--
-- Migration aditiva e segura:
-- - nao altera nem remove canais existentes;
-- - nao toca em lips-main;
-- - nao armazena API key, secret, token ou cookie;
-- - mantem channels.gateway_id nullable durante a transicao.

create table if not exists public.internal_messaging_gateways (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  slug text not null,
  provider text not null,
  base_url text not null,
  environment text not null,
  status text not null,
  version text,
  max_sessions integer not null default 9,
  last_health_check_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internal_messaging_gateways_provider_check check (provider in ('openwa')),
  constraint internal_messaging_gateways_environment_check check (environment in ('test', 'production')),
  constraint internal_messaging_gateways_status_check check (status in ('active', 'inactive', 'error', 'maintenance')),
  constraint internal_messaging_gateways_max_sessions_check check (max_sessions between 1 and 99),
  constraint internal_messaging_gateways_metadata_no_secrets_check check (
    not (metadata ?| array['api_key', 'apikey', 'secret', 'token', 'cookie', 'access_token', 'refresh_token'])
  )
);

create unique index if not exists internal_messaging_gateways_tenant_slug_uniq
  on public.internal_messaging_gateways (tenant_id, slug);

create index if not exists internal_messaging_gateways_tenant_status_idx
  on public.internal_messaging_gateways (tenant_id, status);

alter table public.internal_messaging_gateways enable row level security;

drop policy if exists "service_all_internal_messaging_gateways" on public.internal_messaging_gateways;
create policy "service_all_internal_messaging_gateways" on public.internal_messaging_gateways
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

revoke all on public.internal_messaging_gateways from anon;
revoke all on public.internal_messaging_gateways from authenticated;
grant all on public.internal_messaging_gateways to service_role;

alter table public.channels
  add column if not exists gateway_id uuid references public.internal_messaging_gateways(id) on delete set null;

comment on table public.internal_messaging_gateways is
  'Gateways internos do Centro de Comando. Service-role only. Nao armazenar secrets nesta tabela.';
comment on column public.internal_messaging_gateways.base_url is
  'URL base operacional do gateway. Credenciais permanecem em environment variables ou secret manager.';
comment on column public.internal_messaging_gateways.metadata is
  'Metadata publica/operacional. Nunca armazenar API key, secret, token ou cookie.';
comment on column public.channels.gateway_id is
  'Gateway interno usado por canais WhatsApp Web do Centro de Comando. Nullable durante transicao de metadata.gatewayId.';

create index if not exists channels_gateway_id_idx
  on public.channels (gateway_id);

create unique index if not exists channels_tenant_gateway_session_uniq
  on public.channels (tenant_id, gateway_id, session_id)
  where gateway_id is not null and session_id is not null;

create or replace function public.touch_internal_messaging_gateways_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists internal_messaging_gateways_touch_updated_at on public.internal_messaging_gateways;
create trigger internal_messaging_gateways_touch_updated_at
  before update on public.internal_messaging_gateways
  for each row execute function public.touch_internal_messaging_gateways_updated_at();

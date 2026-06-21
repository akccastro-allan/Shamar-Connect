-- Social Accounts — conexões de Instagram Direct e Facebook Messenger por empresa.
-- Cada linha guarda o token de página (segredo) e o id da conta que chega no
-- webhook da Meta (entry.id), permitindo resolver o tenant da DM recebida.

create table if not exists public.social_accounts (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null,
  organization_id     uuid not null,
  provider            text not null check (provider in ('instagram', 'messenger')),
  -- Id que a Meta envia em entry.id no webhook (Page id ou IG account id).
  external_account_id text not null,
  page_id             text,
  name                text,
  -- Page Access Token de longa duração. Segredo — apenas service_role lê.
  access_token        text not null,
  verify_token        text,
  status              text not null default 'active' check (status in ('active', 'disabled')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (provider, external_account_id)
);

create index if not exists idx_social_accounts_tenant_org
  on public.social_accounts (tenant_id, organization_id);
create index if not exists idx_social_accounts_lookup
  on public.social_accounts (provider, external_account_id);

alter table public.social_accounts enable row level security;

-- Sem leitura pública: o token de página nunca pode vazar para a anon key.
drop policy if exists "service_all_social_accounts" on public.social_accounts;
create policy "service_all_social_accounts" on public.social_accounts
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

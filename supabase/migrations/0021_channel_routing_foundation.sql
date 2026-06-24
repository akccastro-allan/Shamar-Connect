-- Marco 1 — Fundação do roteamento obrigatório por canal.
--
-- North Star: tudo que entra e tudo que sai pertence a um canal. Sem canal,
-- não vira atendimento e não envia resposta.
--
-- Migration ADITIVA e idempotente. NÃO apaga dados, NÃO torna channel_id NOT NULL
-- (isso fica para a 0023, só após o relatório de ambiguidades zerar).

-- ===========================================================================
-- 1) channels — chaves de resolução do webhook
-- ===========================================================================
alter table public.channels
  add column if not exists external_instance text;  -- nome da instância Evolution

comment on column public.channels.external_instance is
  'Nome da instância (Evolution). V1: resolução só por external_instance. '
  'Multi-servidor Evolution no futuro deve considerar também connection/base_url/escopo de credencial.';

-- Resolução Evolution: instância -> canal.
create unique index if not exists channels_provider_external_instance_uniq
  on public.channels (provider, external_instance)
  where external_instance is not null;

-- Resolução Meta Cloud: phone_number_id -> canal.
create unique index if not exists channels_provider_phone_number_id_uniq
  on public.channels (provider, phone_number_id)
  where phone_number_id is not null;

-- ===========================================================================
-- 2) social_accounts — liga a conta social (IG/Messenger) a um canal
-- ===========================================================================
alter table public.social_accounts
  add column if not exists channel_id uuid references public.channels(id) on delete set null;

-- ===========================================================================
-- 3) contact_identities — identidade do CONTATO por canal
--    unique (channel_id, external_id): o mesmo telefone/PSID pode existir em
--    canais/empresas diferentes sem misturar contatos.
-- ===========================================================================
create table if not exists public.contact_identities (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null,
  organization_id uuid not null,
  contact_id      uuid not null references public.crm_contacts(id) on delete cascade,
  channel_id      uuid not null references public.channels(id) on delete cascade,
  provider        text not null,
  identity_type   text not null,  -- phone | wa_id | ig_psid | fb_psid | lid
  external_id     text not null,
  display_name    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists contact_identities_channel_external_uniq
  on public.contact_identities (channel_id, external_id);
create index if not exists contact_identities_contact_idx
  on public.contact_identities (contact_id);
create index if not exists contact_identities_org_idx
  on public.contact_identities (organization_id);

alter table public.contact_identities enable row level security;
drop policy if exists "service_all_contact_identities" on public.contact_identities;
create policy "service_all_contact_identities" on public.contact_identities
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- ===========================================================================
-- 4) whatsapp_messages — ciclo de vida de entrega/outbox
--    (outbox_id sem FK aqui; a FK é adicionada após criar message_outbox)
-- ===========================================================================
alter table public.whatsapp_messages
  add column if not exists delivery_status text,        -- queued|sent|delivered|read|failed
  add column if not exists outbox_id       uuid,
  add column if not exists failure_code     text,
  add column if not exists failure_message  text,
  add column if not exists sent_at          timestamptz,
  add column if not exists delivered_at     timestamptz,
  add column if not exists read_at          timestamptz,
  add column if not exists failed_at        timestamptz;

-- ===========================================================================
-- 5) message_outbox — fila de saída (referencia a mensagem local visível)
-- ===========================================================================
create table if not exists public.message_outbox (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null,
  organization_id     uuid not null,
  channel_id          uuid not null references public.channels(id) on delete cascade,
  conversation_id     uuid references public.whatsapp_conversations(id) on delete set null,
  message_id          uuid references public.whatsapp_messages(id) on delete set null,
  to_external_id      text not null,
  body                text not null,
  message_type        text not null default 'text',
  status              text not null default 'queued',  -- queued|sending|sent|failed
  attempts            int  not null default 0,
  max_attempts        int  not null default 5,
  provider_message_id text,
  last_error          text,
  scheduled_at        timestamptz not null default now(),
  created_by          uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists message_outbox_status_scheduled_idx
  on public.message_outbox (status, scheduled_at);
create index if not exists message_outbox_conversation_idx
  on public.message_outbox (conversation_id);

alter table public.message_outbox enable row level security;
drop policy if exists "service_all_message_outbox" on public.message_outbox;
create policy "service_all_message_outbox" on public.message_outbox
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- FK de whatsapp_messages.outbox_id -> message_outbox (agora que a tabela existe).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'whatsapp_messages_outbox_id_fkey'
  ) then
    alter table public.whatsapp_messages
      add constraint whatsapp_messages_outbox_id_fkey
      foreign key (outbox_id) references public.message_outbox(id) on delete set null;
  end if;
end $$;

-- ===========================================================================
-- 6) provider_events — idempotência por canal
-- ===========================================================================
alter table public.provider_events
  add column if not exists external_event_id text,
  add column if not exists payload_hash      text,
  add column if not exists channel_id        uuid;

-- Idempotência com canal resolvido.
create unique index if not exists provider_events_channel_event_uniq
  on public.provider_events (channel_id, provider, external_event_id)
  where channel_id is not null and external_event_id is not null;

-- Dedup de eventos sem canal resolvido (processing_status = 'unresolved_channel').
create unique index if not exists provider_events_unresolved_hash_uniq
  on public.provider_events (provider, payload_hash)
  where channel_id is null and payload_hash is not null;

-- ===========================================================================
-- 7) conversations / messages — unicidade por canal (adicional; mantém antigos)
-- ===========================================================================
create unique index if not exists whatsapp_conversations_channel_chat_uniq
  on public.whatsapp_conversations (channel_id, external_chat_id)
  where channel_id is not null and external_chat_id is not null;

create unique index if not exists whatsapp_messages_channel_external_uniq
  on public.whatsapp_messages (channel_id, external_message_id)
  where channel_id is not null and external_message_id is not null;

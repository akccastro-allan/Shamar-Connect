-- Bloco 1 — Preparar multi-canal.
-- Estende a tabela `channels` (já referenciada por whatsapp_conversations.channel_id)
-- com os campos de canais oficiais da Meta, em vez de criar uma `messaging_channels`
-- nova (evita duas fontes de verdade e migração de relacionamento).
--
-- ATENÇÃO: `channels` tem RLS public_read (anon lê tudo), então segredos (tokens)
-- NUNCA ficam em `channels` — vão para `channel_credentials` (service_role only).

-- 1) Campos oficiais (não-secretos) em channels ------------------------------
alter table public.channels
  add column if not exists provider            text not null default 'whatsapp_web',
  add column if not exists channel_type        text not null default 'whatsapp_web',
  add column if not exists display_name        text,
  add column if not exists phone_number        text,
  add column if not exists phone_number_id     text,
  add column if not exists waba_id             text,
  add column if not exists business_account_id text,
  add column if not exists status              text not null default 'active',
  add column if not exists is_default          boolean not null default false,
  add column if not exists metadata            jsonb not null default '{}'::jsonb;

-- Backfill dos canais existentes (todos whatsapp_web).
update public.channels set display_name = coalesce(display_name, name);
update public.channels set phone_number = coalesce(phone_number, phone) where phone is not null;

-- 2) Segredos dos canais — fora de `channels` (que é public-readable) ---------
create table if not exists public.channel_credentials (
  channel_id   uuid primary key references public.channels(id) on delete cascade,
  access_token text,
  verify_token text,
  updated_at   timestamptz not null default now()
);

alter table public.channel_credentials enable row level security;
drop policy if exists "service_all_channel_credentials" on public.channel_credentials;
create policy "service_all_channel_credentials" on public.channel_credentials
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 3) channel_id em whatsapp_messages (faltava; conversations já tem) ----------
alter table public.whatsapp_messages
  add column if not exists channel_id uuid references public.channels(id) on delete set null;

create index if not exists whatsapp_messages_channel_id_idx
  on public.whatsapp_messages (channel_id);

update public.whatsapp_messages m
set channel_id = c.channel_id
from public.whatsapp_conversations c
where m.conversation_id = c.id
  and m.channel_id is null
  and c.channel_id is not null;

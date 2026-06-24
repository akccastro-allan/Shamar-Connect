-- Marco 1 — Backfill de canais (idempotente, não-destrutivo).
--
-- IMPORTANTE: rodar ANTES de publicar os webhooks novos (channel-bound), senão
-- as mensagens da Lips (Evolution) viram "canal não reconhecido" e a conversa
-- existente duplica.
--
-- NÃO apaga nada. NÃO torna channel_id NOT NULL.

-- ===========================================================================
-- A) Canal Evolution da Lips (instância "lips")  [OBRIGATÓRIO antes do deploy]
-- ===========================================================================
-- session_id é NOT NULL no schema; canal Evolution não usa sessão de gateway,
-- então usamos um placeholder ('lips-evolution'). A resolução Evolution é por
-- external_instance, não por session_id.
insert into public.channels
  (tenant_id, organization_id, name, slug, session_id, provider, channel_type, external_instance, display_name, status, active)
values
  ('e6abeaae-29fc-4186-b56a-361a69cb846d', '8f074193-bf58-4537-9842-720619a9f259',
   'WhatsApp Lips', 'lips-evolution', 'lips-evolution', 'evolution', 'evolution', 'lips', 'WhatsApp Lips', 'active', true)
on conflict (tenant_id, organization_id, slug) do nothing;

-- Backfill das conversas/mensagens Evolution existentes (todas da Lips) ->
-- channel_id do canal recém-criado.
update public.whatsapp_conversations c
set channel_id = ch.id
from public.channels ch
where ch.provider = 'evolution' and ch.external_instance = 'lips'
  and c.provider = 'evolution'
  and c.organization_id = '8f074193-bf58-4537-9842-720619a9f259'
  and c.channel_id is null;

update public.whatsapp_messages m
set channel_id = ch.id
from public.channels ch
where ch.provider = 'evolution' and ch.external_instance = 'lips'
  and m.provider = 'evolution'
  and m.organization_id = '8f074193-bf58-4537-9842-720619a9f259'
  and m.channel_id is null;

-- ===========================================================================
-- B) Backfill genérico whatsapp_web — só onde (org) tem EXATAMENTE 1 canal
--    whatsapp_web (evita cross-company nas orgs com canais duplicados).
-- ===========================================================================
with single_channel as (
  -- min(uuid) não existe no Postgres; pega 1 id determinístico do grupo.
  select organization_id, (array_agg(id order by id))[1] as channel_id
  from public.channels
  where provider = 'whatsapp_web'
  group by organization_id
  having count(*) = 1
)
update public.whatsapp_conversations c
set channel_id = s.channel_id
from single_channel s
where c.organization_id = s.organization_id
  and (c.provider = 'whatsapp_web' or c.provider is null)
  and c.channel_id is null;

with single_channel as (
  -- min(uuid) não existe no Postgres; pega 1 id determinístico do grupo.
  select organization_id, (array_agg(id order by id))[1] as channel_id
  from public.channels
  where provider = 'whatsapp_web'
  group by organization_id
  having count(*) = 1
)
update public.whatsapp_messages m
set channel_id = s.channel_id
from single_channel s
where m.organization_id = s.organization_id
  and (m.provider = 'whatsapp_web' or m.provider is null)
  and m.channel_id is null;

-- ===========================================================================
-- C) RELATÓRIO de ambiguidades (NÃO apaga; só lista). Rodar e revisar:
-- ===========================================================================
-- Conversas/mensagens que ficaram sem canal:
--   select provider, organization_id, count(*) from public.whatsapp_conversations
--   where channel_id is null group by provider, organization_id order by 3 desc;
--   select provider, organization_id, count(*) from public.whatsapp_messages
--   where channel_id is null group by provider, organization_id order by 3 desc;
-- Canais com session_id duplicado entre orgs (cruft "-oriah") — apenas relatar,
-- NÃO apagar sem aprovação:
--   select session_id, count(*) c, string_agg(slug, ', ') from public.channels
--   where session_id is not null group by session_id having count(*) > 1;

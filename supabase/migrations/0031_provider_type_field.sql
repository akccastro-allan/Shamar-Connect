-- Marco 1.5 — Abstração de Provider Type
--
-- Separa o conceito de "tipo de acesso" (official_api | web_gateway)
-- do conceito de "provider específico" (evolution, meta_whatsapp, etc).
--
-- Permite que a lógica de negócio (fila, inbox, automação, etc) seja
-- agnóstica a qual provider está sendo usado — só o adaptador de envio muda.
--
-- Impacto: schema apenas. Código despacha por `provider` canônico, não por tipo.
-- Compatível com Lips e futuros clientes (Shamar Kids, clínica, etc).

-- ============================================================================
-- 1) Adicionar campos de tipo e estado
-- ============================================================================
alter table public.channels
  add column if not exists provider_type text not null default 'web_gateway',
  add column if not exists is_active boolean not null default true;

-- Comentário para documentação
comment on column public.channels.provider_type is
  'oficial_api (Meta WhatsApp Cloud) ou web_gateway (Evolution/WhatsApp Web/OpenWA/etc)';

comment on column public.channels.is_active is
  'Canal ativo e pronto para receber/enviar mensagens. Diferente de status (pode estar ativo mas suspenso temporariamente).';

-- ============================================================================
-- 2) Backfill: mapeamento provider → provider_type
-- ============================================================================
-- Meta API oficial → official_api
update public.channels
set provider_type = 'official_api'
where provider in ('meta_whatsapp', 'meta_instagram', 'meta_messenger')
  and provider_type = 'web_gateway';

-- Web gateways → web_gateway (evolutionm, whatsapp_web_legacy, etc)
-- (já têm default = 'web_gateway', então nada a fazer)

-- ============================================================================
-- 3) Índices para queries rápidas
-- ============================================================================
create index if not exists channels_provider_type_idx
  on public.channels (provider_type, organization_id);

create index if not exists channels_is_active_idx
  on public.channels (is_active, organization_id);

-- ============================================================================
-- 4) Validação: provider_type deve ser um dos valores conhecidos
-- ============================================================================
alter table public.channels
  add constraint channels_provider_type_check
  check (provider_type in ('official_api', 'web_gateway'));

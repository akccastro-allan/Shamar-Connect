-- 0034: Metadados operacionais do agente comercial Lips.
-- Aditiva: nao altera mensagens, catalogo, precos, sessoes WhatsApp ou automacao deterministica.

alter table public.commercial_conversation_analysis
  add column if not exists conversation_content_hash text,
  add column if not exists profile_version text,
  add column if not exists prompt_version text,
  add column if not exists model text,
  add column if not exists provider text,
  add column if not exists provider_response_id text,
  add column if not exists request_status text,
  add column if not exists latency_ms integer,
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists total_tokens integer,
  add column if not exists estimated_cost_usd numeric(12,8),
  add column if not exists error_code text,
  add column if not exists guardrail_reasons text[] not null default '{}'::text[];

alter table public.commercial_response_suggestions
  add column if not exists conversation_content_hash text,
  add column if not exists profile_version text,
  add column if not exists prompt_version text,
  add column if not exists model text,
  add column if not exists provider text,
  add column if not exists provider_response_id text,
  add column if not exists request_status text,
  add column if not exists latency_ms integer,
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists total_tokens integer,
  add column if not exists estimated_cost_usd numeric(12,8),
  add column if not exists error_code text,
  add column if not exists guardrail_reasons text[] not null default '{}'::text[];

create unique index if not exists commercial_analysis_dedupe_uniq
  on public.commercial_conversation_analysis (
    tenant_id,
    organization_id,
    conversation_id,
    conversation_content_hash,
    profile_version,
    prompt_version,
    model
  )
  where status = 'generated'
    and conversation_content_hash is not null
    and profile_version is not null
    and prompt_version is not null
    and model is not null;

create index if not exists commercial_analysis_usage_idx
  on public.commercial_conversation_analysis (tenant_id, organization_id, request_status, created_at desc);

create index if not exists commercial_suggestions_usage_idx
  on public.commercial_response_suggestions (tenant_id, organization_id, request_status, created_at desc);

comment on column public.commercial_conversation_analysis.conversation_content_hash is
  'Hash SHA-256 de contexto sanitizado para deduplicacao de custo. Nao armazena mensagem bruta.';
comment on column public.commercial_conversation_analysis.provider_response_id is
  'ID operacional do provider. Nao armazenar reasoning ou chain of thought.';
comment on column public.commercial_response_suggestions.guardrail_reasons is
  'Motivos estruturados quando sugestao for bloqueada por guardrail.';

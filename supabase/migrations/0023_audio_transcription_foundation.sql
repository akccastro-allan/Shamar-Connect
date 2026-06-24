-- Marco 1.5 — Áudio e transcrição como mensagem de primeira classe.
--
-- Versiona EXATAMENTE a estrutura já aplicada manualmente no Supabase
-- (message_media, message_transcriptions, transcription_jobs, colunas de
-- mídia/transcrição em whatsapp_messages, bucket privado shamar-message-media).
--
-- Idempotente. NÃO apaga nada. NÃO cria NOT NULL novo em colunas existentes.
-- RLS ativa SEM policies (acesso só via service_role no backend; nada público).

-- ===========================================================================
-- 1) message_media — mídia original (áudio/imagem/doc) por mensagem
-- ===========================================================================
create table if not exists public.message_media (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid references public.tenants(id),
  organization_id   uuid references public.organizations(id),
  channel_id        uuid references public.channels(id),
  message_id        uuid not null references public.whatsapp_messages(id),
  provider          text not null,
  provider_media_id text,
  external_url      text,
  media_type        text not null,
  mime_type         text,
  file_name         text,
  size_bytes        bigint,
  duration_seconds  numeric,
  storage_bucket    text,
  storage_path      text,
  sha256            text,
  download_status   text not null default 'pending',
  download_error    text,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_message_media_message_id on public.message_media (message_id);
create index if not exists idx_message_media_tenant_org on public.message_media (tenant_id, organization_id);
create index if not exists idx_message_media_channel_id on public.message_media (channel_id);
create index if not exists idx_message_media_provider_media_id
  on public.message_media (provider, provider_media_id) where provider_media_id is not null;

alter table public.message_media enable row level security;

-- ===========================================================================
-- 2) message_transcriptions — transcrição (apoio ao atendente; pode errar)
-- ===========================================================================
create table if not exists public.message_transcriptions (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references public.tenants(id),
  organization_id uuid references public.organizations(id),
  channel_id      uuid references public.channels(id),
  message_id      uuid not null references public.whatsapp_messages(id),
  media_id        uuid references public.message_media(id),
  provider        text not null default 'openai',
  model           text,
  language        text,
  confidence      numeric,
  status          text not null default 'pending',
  transcript_text text,
  error_code      text,
  error_message   text,
  requested_by    uuid references public.app_users(id),
  started_at      timestamptz,
  completed_at    timestamptz,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_message_transcriptions_message_id on public.message_transcriptions (message_id);
create index if not exists idx_message_transcriptions_media_id on public.message_transcriptions (media_id);
create index if not exists idx_message_transcriptions_channel_id on public.message_transcriptions (channel_id);
create index if not exists idx_message_transcriptions_status on public.message_transcriptions (status, created_at);
create index if not exists idx_message_transcriptions_tenant_org on public.message_transcriptions (tenant_id, organization_id);
-- 1 transcrição por (mídia, provider) — reprocessar atualiza, não duplica.
create unique index if not exists uq_message_transcriptions_media_provider
  on public.message_transcriptions (media_id, provider) where media_id is not null;

alter table public.message_transcriptions enable row level security;

-- ===========================================================================
-- 3) transcription_jobs — fila de transcrição (background, fora do webhook)
-- ===========================================================================
create table if not exists public.transcription_jobs (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid references public.tenants(id),
  organization_id  uuid references public.organizations(id),
  channel_id       uuid references public.channels(id),
  message_id       uuid not null references public.whatsapp_messages(id),
  media_id         uuid not null references public.message_media(id),
  transcription_id uuid references public.message_transcriptions(id),
  status           text not null default 'queued',
  priority         integer not null default 100,
  attempt_count    integer not null default 0,
  max_attempts     integer not null default 3,
  scheduled_at     timestamptz not null default now(),
  locked_at        timestamptz,
  locked_by        text,
  last_error       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_transcription_jobs_channel_id on public.transcription_jobs (channel_id);
create index if not exists idx_transcription_jobs_media_id on public.transcription_jobs (media_id);
create index if not exists idx_transcription_jobs_message_id on public.transcription_jobs (message_id);
create index if not exists idx_transcription_jobs_queue
  on public.transcription_jobs (status, priority, scheduled_at, created_at);
-- No máximo 1 job ativo por mídia (evita transcrever 2x ao mesmo tempo).
create unique index if not exists uq_transcription_jobs_active_media
  on public.transcription_jobs (media_id) where status in ('queued', 'processing');

alter table public.transcription_jobs enable row level security;

-- ===========================================================================
-- 4) whatsapp_messages — campos de mídia/transcrição (denormalizados p/ a UI)
-- ===========================================================================
alter table public.whatsapp_messages
  add column if not exists has_media               boolean not null default false,
  add column if not exists media_count             integer not null default 0,
  add column if not exists media_kind              text,
  add column if not exists media_summary           text,
  add column if not exists media_status            text default 'none',
  add column if not exists media_duration_seconds  numeric,
  add column if not exists media_mime_type         text,
  add column if not exists media_size_bytes        bigint,
  add column if not exists media_storage_bucket    text,
  add column if not exists media_storage_path      text,
  add column if not exists transcription_status    text default 'none',
  add column if not exists transcription_text      text,
  add column if not exists transcription_language  text,
  add column if not exists transcription_error     text,
  add column if not exists transcribed_at          timestamptz;

-- ===========================================================================
-- 5) Bucket privado de mídia (NUNCA público; acesso por signed URL no backend)
-- ===========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shamar-message-media', 'shamar-message-media', false, 52428800,
  array['audio/ogg','audio/opus','audio/mpeg','audio/mp3','audio/mp4','audio/aac',
        'audio/wav','audio/webm','image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do nothing;

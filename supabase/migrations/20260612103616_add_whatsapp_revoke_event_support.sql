alter table public.whatsapp_messages
  add column if not exists deleted_by_sender boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists revoked_payload jsonb;

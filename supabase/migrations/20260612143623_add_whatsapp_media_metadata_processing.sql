alter table public.whatsapp_media_files
  add column if not exists download_status text not null default 'pending',
  add column if not exists processing_status text not null default 'pending',
  add column if not exists local_url text,
  add column if not exists public_url text;

alter table public.whatsapp_messages
  add column if not exists has_media boolean not null default false,
  add column if not exists media_count integer not null default 0,
  add column if not exists media_summary text;

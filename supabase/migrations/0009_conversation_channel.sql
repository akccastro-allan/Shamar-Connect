-- Add channel_id to whatsapp_conversations (nullable for backward compat)
alter table public.whatsapp_conversations
  add column if not exists channel_id uuid null references public.channels(id) on delete set null;

create index if not exists whatsapp_conversations_channel_id_idx on public.whatsapp_conversations (channel_id);

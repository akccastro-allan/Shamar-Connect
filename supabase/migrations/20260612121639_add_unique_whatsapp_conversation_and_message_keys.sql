drop index if exists public.idx_whatsapp_conversations_external_chat_id;
create unique index if not exists whatsapp_conversations_provider_chat_uniq
  on public.whatsapp_conversations(provider, external_chat_id);

create unique index if not exists whatsapp_messages_external_message_id_uniq
  on public.whatsapp_messages(external_message_id)
  where external_message_id is not null;

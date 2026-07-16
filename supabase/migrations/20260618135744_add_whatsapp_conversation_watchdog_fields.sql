alter table public.whatsapp_conversations
  add column if not exists requires_human boolean not null default false,
  add column if not exists pending_reason text,
  add column if not exists sla_status text not null default 'ok',
  add column if not exists sla_due_at timestamptz,
  add column if not exists watchdog_checked_at timestamptz,
  add column if not exists last_inbound_at timestamptz,
  add column if not exists last_outbound_at timestamptz,
  add column if not exists last_message_direction text;

create table if not exists public.conversation_notes (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'whatsapp_web',
  external_chat_id text not null,
  note text not null,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversation_notes_external_chat_id
  on public.conversation_notes(external_chat_id);

alter table public.conversation_notes enable row level security;

drop policy if exists "public_read_conversation_notes" on public.conversation_notes;
create policy "public_read_conversation_notes" on public.conversation_notes for select using (true);

drop policy if exists "service_all_conversation_notes" on public.conversation_notes;
create policy "service_all_conversation_notes" on public.conversation_notes
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

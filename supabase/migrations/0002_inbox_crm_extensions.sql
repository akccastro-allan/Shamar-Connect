alter table public.whatsapp_conversations
  add column if not exists stage text not null default 'novo',
  add column if not exists priority text not null default 'normal' check (priority in ('baixa', 'normal', 'alta', 'urgente')),
  add column if not exists assigned_to text;

create table if not exists public.crm_contact_notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.crm_contacts(id) on delete cascade,
  conversation_id uuid references public.whatsapp_conversations(id) on delete set null,
  note text not null,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.quick_replies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text not null default 'geral',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.quick_replies (title, body, category)
select 'Saudação inicial', 'Olá! Tudo bem? Obrigado por entrar em contato. Vou te ajudar por aqui.', 'atendimento'
where not exists (select 1 from public.quick_replies where title = 'Saudação inicial');

insert into public.quick_replies (title, body, category)
select 'Pedir mais informações', 'Perfeito. Para eu te orientar melhor, me envie mais detalhes sobre o que você precisa.', 'atendimento'
where not exists (select 1 from public.quick_replies where title = 'Pedir mais informações');

insert into public.quick_replies (title, body, category)
select 'Encaminhar para orçamento', 'Consigo preparar uma proposta para você. Me confirme, por favor, o melhor telefone e o principal objetivo do projeto.', 'comercial'
where not exists (select 1 from public.quick_replies where title = 'Encaminhar para orçamento');

create index if not exists idx_crm_contact_notes_contact_id on public.crm_contact_notes(contact_id);
create index if not exists idx_crm_contact_notes_conversation_id on public.crm_contact_notes(conversation_id);
create index if not exists idx_quick_replies_active on public.quick_replies(is_active);

alter table public.crm_contact_notes enable row level security;
alter table public.quick_replies enable row level security;

drop policy if exists "public_read_crm_contact_notes" on public.crm_contact_notes;
create policy "public_read_crm_contact_notes" on public.crm_contact_notes for select using (true);

drop policy if exists "public_read_quick_replies" on public.quick_replies;
create policy "public_read_quick_replies" on public.quick_replies for select using (true);

drop policy if exists "service_all_crm_contact_notes" on public.crm_contact_notes;
create policy "service_all_crm_contact_notes" on public.crm_contact_notes for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service_all_quick_replies" on public.quick_replies;
create policy "service_all_quick_replies" on public.quick_replies for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

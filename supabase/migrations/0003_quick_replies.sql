create table if not exists public.quick_replies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text not null default 'geral',
  tags text[] not null default '{}',
  usage_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quick_replies
  add column if not exists tags text[] not null default '{}';

alter table public.quick_replies
  add column if not exists usage_count integer not null default 0;

create index if not exists idx_quick_replies_category on public.quick_replies(category);
create index if not exists idx_quick_replies_is_active on public.quick_replies(is_active);

alter table public.quick_replies enable row level security;

drop policy if exists "public_read_quick_replies" on public.quick_replies;
create policy "public_read_quick_replies" on public.quick_replies for select using (is_active = true);

drop policy if exists "service_all_quick_replies" on public.quick_replies;
create policy "service_all_quick_replies" on public.quick_replies
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

insert into public.quick_replies (title, body, category, tags)
values
  ('Saudação inicial', 'Olá! Tudo bem? Como posso te ajudar hoje?', 'atendimento', array['inicio','atendimento']),
  ('Retorno em breve', 'Recebi sua mensagem. Vou verificar aqui e já te retorno.', 'atendimento', array['retorno','atendimento']),
  ('Pedir mais detalhes', 'Pode me passar mais detalhes para eu te orientar melhor?', 'atendimento', array['qualificacao','atendimento']),
  ('Encaminhar para atendimento', 'Vou encaminhar suas informações para seguirmos com o atendimento.', 'comercial', array['comercial','encaminhamento']),
  ('Agradecimento', 'Obrigado pelo contato! Fico à disposição.', 'relacionamento', array['agradecimento'])
on conflict do nothing;

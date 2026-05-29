create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document_type text not null,
  document_number text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_document_type_check check (document_type in ('cpf', 'cnpj')),
  constraint companies_status_check check (status in ('active', 'paused', 'blocked', 'archived'))
);

create table if not exists public.company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  email text,
  cpf text,
  phone text,
  role text not null default 'attendant',
  access_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_users_role_check check (role in ('owner', 'admin', 'attendant', 'viewer'))
);

create index if not exists idx_companies_document_number on public.companies(document_number);
create index if not exists idx_company_users_company_id on public.company_users(company_id);
create index if not exists idx_company_users_cpf on public.company_users(cpf);
create index if not exists idx_company_users_email on public.company_users(email);

alter table public.companies enable row level security;
alter table public.company_users enable row level security;

drop policy if exists "service_all_companies" on public.companies;
create policy "service_all_companies" on public.companies
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service_all_company_users" on public.company_users;
create policy "service_all_company_users" on public.company_users
for all using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

insert into public.companies (name, document_type, document_number, status)
values ('ShamarConnect Teste', 'cnpj', '00000000000100', 'active')
on conflict (document_number) do nothing;

insert into public.company_users (company_id, name, email, cpf, phone, role, access_code, is_active)
select id, 'Administrador Teste', 'admin@shamarconnect.local', '00000000000', '21999999999', 'owner', '123456', true
from public.companies
where document_number = '00000000000100'
on conflict do nothing;

insert into public.company_users (company_id, name, email, cpf, phone, role, access_code, is_active)
select id, 'Atendente Teste 1', 'atendente1@shamarconnect.local', '11111111111', '21988888888', 'attendant', '123456', true
from public.companies
where document_number = '00000000000100'
on conflict do nothing;

insert into public.company_users (company_id, name, email, cpf, phone, role, access_code, is_active)
select id, 'Atendente Teste 2', 'atendente2@shamarconnect.local', '22222222222', '21977777777', 'attendant', '123456', true
from public.companies
where document_number = '00000000000100'
on conflict do nothing;

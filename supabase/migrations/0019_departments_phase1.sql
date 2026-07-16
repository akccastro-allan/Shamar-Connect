-- Fase 1 (clínica médica) — Departamentos e escopo por setor.
-- Reaproveita o que já existe: tenant_users (papéis/convite) e
-- whatsapp_conversations.assigned_to (atribuição/lock). Aqui só adicionamos a
-- noção de DEPARTAMENTO (setor) e o vínculo dele em atendentes e conversas.

create table if not exists public.departments (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null,
  organization_id uuid not null,
  name            text not null,
  color           text not null default '#2ABFAB',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_departments_tenant_org
  on public.departments (tenant_id, organization_id);

alter table public.departments enable row level security;

-- Convenção do projeto: leitura pública (nomes de setor não são segredo) e
-- escrita só por service_role.
drop policy if exists "public_read_departments" on public.departments;
create policy "public_read_departments" on public.departments
  for select using (true);

drop policy if exists "service_all_departments" on public.departments;
create policy "service_all_departments" on public.departments
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Vínculo do atendente ao seu setor.
alter table public.tenant_users
  add column if not exists department_id uuid references public.departments(id) on delete set null;

-- Vínculo da conversa ao setor (fila por departamento).
alter table public.whatsapp_conversations
  add column if not exists tenant_id uuid references public.tenants(id) on delete set null,
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists department_id uuid references public.departments(id) on delete set null;

create index if not exists idx_conv_department
  on public.whatsapp_conversations (department_id, organization_id);
create index if not exists idx_tenant_users_department
  on public.tenant_users (department_id);

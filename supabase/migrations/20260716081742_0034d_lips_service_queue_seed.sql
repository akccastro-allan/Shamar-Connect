-- 0034d: Seed idempotente da fila de atendimento produtiva Lips.
-- Escopo resolvido por lips-main e slug da organizacao, sem UUID fixo.

set search_path = public, pg_temp;

insert into public.departments (tenant_id, organization_id, name, color, is_active)
select c.tenant_id, c.organization_id, d.name, d.color, true
from public.channels c
join public.organizations o on o.id = c.organization_id and o.slug = 'auto-pecas-auto-center-lips'
cross join (values
  ('Balcão', '#2ABFAB'),
  ('Oficina', '#1B2F5B'),
  ('Financeiro', '#0F766E'),
  ('Supervisão', '#C9952A')
) as d(name, color)
where c.session_id = 'lips-main'
  and not exists (
    select 1 from public.departments existing
    where existing.tenant_id = c.tenant_id
      and existing.organization_id = c.organization_id
      and public.normalize_department_name(existing.name) = public.normalize_department_name(d.name)
  );

update public.departments d
set is_active = true,
    updated_at = now()
from public.channels c
join public.organizations o on o.id = c.organization_id and o.slug = 'auto-pecas-auto-center-lips'
where c.session_id = 'lips-main'
  and d.tenant_id = c.tenant_id
  and d.organization_id = c.organization_id
  and public.normalize_department_name(d.name) in ('balcao', 'oficina', 'financeiro', 'supervisao')
  and d.is_active is distinct from true;

insert into public.queue_business_hours (tenant_id, organization_id)
select c.tenant_id, c.organization_id
from public.channels c
join public.organizations o on o.id = c.organization_id and o.slug = 'auto-pecas-auto-center-lips'
where c.session_id = 'lips-main'
on conflict (organization_id) do nothing;

insert into public.department_memberships (tenant_id, organization_id, department_id, tenant_user_id, app_user_id, status, capacity)
select c.tenant_id, c.organization_id, d.id, tu.id, au.id, 'active', 3
from public.channels c
join public.organizations o on o.id = c.organization_id and o.slug = 'auto-pecas-auto-center-lips'
join public.app_users au on au.email = 'lips@moriahsystems.com.br' and au.status = 'active'
join public.tenant_users tu on tu.tenant_id = c.tenant_id and tu.app_user_id = au.id and tu.role = 'owner' and tu.status = 'active'
join public.departments d on d.tenant_id = c.tenant_id and d.organization_id = c.organization_id and public.normalize_department_name(d.name) in ('balcao', 'oficina', 'financeiro', 'supervisao') and d.is_active = true
where c.session_id = 'lips-main'
on conflict (department_id, app_user_id)
do update set
  status = 'active',
  capacity = excluded.capacity,
  updated_at = now();

insert into public.agent_availability (tenant_id, organization_id, app_user_id, status, accepting_new_conversations, current_load, active_conversations, capacity, updated_at)
select c.tenant_id, c.organization_id, au.id, 'offline', false, 0, 0, 3, now()
from public.channels c
join public.organizations o on o.id = c.organization_id and o.slug = 'auto-pecas-auto-center-lips'
join public.app_users au on au.email = 'lips@moriahsystems.com.br' and au.status = 'active'
join public.tenant_users tu on tu.tenant_id = c.tenant_id and tu.app_user_id = au.id and tu.role = 'owner' and tu.status = 'active'
where c.session_id = 'lips-main'
on conflict (organization_id, app_user_id)
do update set
  status = 'offline',
  accepting_new_conversations = false,
  current_load = 0,
  active_conversations = 0,
  updated_at = now();

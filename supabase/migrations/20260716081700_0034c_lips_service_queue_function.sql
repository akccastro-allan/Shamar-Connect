-- 0034c: Funcao de SLA da fila de atendimento produtiva Lips.
-- Escopo resolvido por lips-main e slug da organizacao, sem UUID fixo.

set search_path = public, pg_temp;

create or replace function public.mark_lips_sla_breaches(escalate_to_supervision boolean default false)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed_count integer := 0;
begin
  with candidates as (
    select distinct c.tenant_id, c.organization_id
    from public.channels c
    join public.organizations o on o.id = c.organization_id and o.slug = 'auto-pecas-auto-center-lips'
    where c.session_id = 'lips-main'
  ), lips_scope as (
    select tenant_id, organization_id
    from candidates
    where (select count(*) from candidates) = 1
  ), lips_supervision as (
    select d.id, d.tenant_id, d.organization_id
    from public.departments d
    join lips_scope scope on scope.tenant_id = d.tenant_id and scope.organization_id = d.organization_id
    where public.normalize_department_name(d.name) = 'supervisao'
      and d.is_active = true
    limit 1
  ), changed as (
    update public.whatsapp_conversations c
    set sla_status = 'breached',
        sla_breached_at = coalesce(c.sla_breached_at, now()),
        priority = 'urgent',
        department_id = case when escalate_to_supervision then coalesce((select id from lips_supervision), c.department_id) else c.department_id end,
        updated_at = now()
    from lips_scope scope
    where c.tenant_id = scope.tenant_id
      and c.organization_id = scope.organization_id
      and c.queue_status in ('waiting', 'in_progress', 'awaiting_customer')
      and c.sla_due_at is not null
      and c.sla_due_at <= now()
      and c.sla_breached_at is null
    returning c.id, c.tenant_id, c.organization_id
  ), events as (
    insert into public.whatsapp_conversation_events (tenant_id, organization_id, conversation_id, actor_type, event_type, event_source, previous_state, new_state, description, metadata)
    select tenant_id, organization_id, id, 'system', 'sla_breached', 'queue', 'on_time', 'breached', 'SLA vencido marcado de forma idempotente.', jsonb_build_object('escalatedToSupervision', escalate_to_supervision)
    from changed
    returning id
  )
  select count(*) into changed_count from changed;

  return changed_count;
end;
$$;

revoke all on function public.mark_lips_sla_breaches(boolean) from public, anon, authenticated;
grant execute on function public.mark_lips_sla_breaches(boolean) to service_role;

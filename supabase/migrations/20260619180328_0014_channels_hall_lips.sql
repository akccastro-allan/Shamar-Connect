-- Add missing channels for Hall Donous (hall-main) and Lips (lips-main).
-- Migration 0008 seeded the other 6 sessions but omitted these two.
-- Without channel rows, conversations from these sessions have channel_id = null
-- and cannot be isolated from each other in diagnostics or automation.

insert into public.channels (tenant_id, organization_id, name, slug, session_id, color, description)
select o.tenant_id, o.id, ch.name, ch.slug, ch.session_id, ch.color, ch.description
from public.organizations o
cross join (values
  ('Hall Donous', 'hall',  'hall-main',  '#C9952A', 'Hall Donous — sessão principal'),
  ('Lips',        'lips',  'lips-main',  '#2ABFAB', 'Lips — sessão principal')
) as ch(name, slug, session_id, color, description)
where o.status = 'active'
on conflict (tenant_id, organization_id, slug) do nothing;

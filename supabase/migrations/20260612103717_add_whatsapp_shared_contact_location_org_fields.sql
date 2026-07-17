alter table public.whatsapp_shared_contacts
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists tenant_id uuid references public.tenants(id) on delete set null;

alter table public.whatsapp_shared_locations
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists tenant_id uuid references public.tenants(id) on delete set null;

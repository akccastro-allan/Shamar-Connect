alter table public.provider_events
  add column if not exists processing_status text not null default 'pending',
  add column if not exists processing_error text,
  add column if not exists processed_payload jsonb,
  add column if not exists external_event_id text,
  add column if not exists payload_hash text,
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists tenant_id uuid references public.tenants(id) on delete set null;

create index if not exists provider_events_processing_status_idx
  on public.provider_events(processing_status, created_at);

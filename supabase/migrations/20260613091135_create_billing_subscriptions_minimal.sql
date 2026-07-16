create table if not exists public.billing_subscriptions (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_slug text not null,
  billing_cycle text not null default 'monthly',
  status text not null default 'active',
  total_amount numeric(10,2) not null default 0,
  currency text not null default 'BRL',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

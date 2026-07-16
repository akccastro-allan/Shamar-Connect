alter table public.billing_checkout_sessions
  add column if not exists billing_provider text,
  add column if not exists provider_customer_id text,
  add column if not exists provider_payment_id text,
  add column if not exists payment_url text,
  add column if not exists raw_payload jsonb not null default '{}'::jsonb;

alter table public.finance_payments
  add column if not exists billing_provider text,
  add column if not exists provider_payment_id text,
  add column if not exists provider_customer_id text,
  add column if not exists checkout_session_id uuid references public.billing_checkout_sessions(id) on delete set null,
  add column if not exists raw_payload jsonb not null default '{}'::jsonb;

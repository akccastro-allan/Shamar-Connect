-- Add relationship and campaign tracking fields to crm_contacts
alter table public.crm_contacts
  add column if not exists birth_date date null,
  add column if not exists birthday_month integer null generated always as (extract(month from birth_date)::integer) stored,
  add column if not exists birthday_day integer null generated always as (extract(day from birth_date)::integer) stored,
  add column if not exists last_purchase_at timestamptz null,
  add column if not exists last_service_at timestamptz null,
  add column if not exists last_quote_at timestamptz null,
  add column if not exists last_campaign_sent_at timestamptz null,
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists marketing_opt_out_at timestamptz null,
  add column if not exists relationship_status text null;

-- Indexes for segment queries
create index if not exists idx_crm_contacts_birthday_month on public.crm_contacts(birthday_month);
create index if not exists idx_crm_contacts_birthday_month_day on public.crm_contacts(birthday_month, birthday_day);
create index if not exists idx_crm_contacts_last_purchase_at on public.crm_contacts(last_purchase_at);
create index if not exists idx_crm_contacts_last_service_at on public.crm_contacts(last_service_at);
create index if not exists idx_crm_contacts_marketing_opt_in on public.crm_contacts(marketing_opt_in);

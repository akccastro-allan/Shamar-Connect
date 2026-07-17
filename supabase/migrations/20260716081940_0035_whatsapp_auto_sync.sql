-- 0035: Sincronizacao automatica WhatsApp Web.
-- Aditiva e idempotente. Nao armazena segredos, QR, cookies ou tokens.

set search_path = public, pg_temp;

create table if not exists public.whatsapp_channel_sync_state (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  provider text not null default 'whatsapp_web',
  session_id text,
  sync_status text not null default 'idle' check (sync_status in ('idle', 'queued', 'syncing', 'ready', 'degraded', 'failed', 'disabled')),
  last_mode text check (last_mode is null or last_mode in ('bootstrap', 'incremental', 'reconciliation', 'manual_diagnostic')),
  last_run_id uuid,
  last_queued_at timestamptz,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  bootstrap_completed_at timestamptz,
  last_chat_checkpoint timestamptz,
  last_message_checkpoint timestamptz,
  last_provider_status text,
  last_provider_seen_at timestamptz,
  next_reconciliation_at timestamptz,
  locked_at timestamptz,
  lock_expires_at timestamptz,
  locked_by text,
  cursor jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_id)
);

create table if not exists public.whatsapp_sync_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  sync_state_id uuid references public.whatsapp_channel_sync_state(id) on delete set null,
  mode text not null check (mode in ('bootstrap', 'incremental', 'reconciliation', 'manual_diagnostic')),
  trigger_source text not null default 'system',
  requested_by_app_user_id uuid references public.app_users(id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'partial', 'failed', 'skipped')),
  selected_chat_ids text[] not null default '{}',
  chat_limit integer not null default 20 check (chat_limit between 1 and 100),
  message_limit integer not null default 50 check (message_limit between 1 and 100),
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  chats_scanned integer not null default 0,
  chats_synced integer not null default 0,
  chats_skipped integer not null default 0,
  messages_scanned integer not null default 0,
  messages_saved integer not null default 0,
  messages_updated integer not null default 0,
  errors_count integer not null default 0,
  error_message text,
  diagnostics jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  lock_id text,
  locked_at timestamptz,
  lock_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'whatsapp_channel_sync_state_last_run_id_fkey'
  ) then
    alter table public.whatsapp_channel_sync_state
      add constraint whatsapp_channel_sync_state_last_run_id_fkey
      foreign key (last_run_id) references public.whatsapp_sync_runs(id) on delete set null;
  end if;
end $$;

alter table public.whatsapp_channel_sync_state enable row level security;
alter table public.whatsapp_sync_runs enable row level security;

revoke all on table public.whatsapp_channel_sync_state from public, anon, authenticated;
revoke all on table public.whatsapp_sync_runs from public, anon, authenticated;
grant all on table public.whatsapp_channel_sync_state to service_role;
grant all on table public.whatsapp_sync_runs to service_role;

drop policy if exists "service_all_whatsapp_channel_sync_state" on public.whatsapp_channel_sync_state;
create policy "service_all_whatsapp_channel_sync_state" on public.whatsapp_channel_sync_state
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service_all_whatsapp_sync_runs" on public.whatsapp_sync_runs;
create policy "service_all_whatsapp_sync_runs" on public.whatsapp_sync_runs
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create index if not exists whatsapp_channel_sync_state_org_status_idx
  on public.whatsapp_channel_sync_state (organization_id, sync_status, updated_at desc);
create index if not exists whatsapp_channel_sync_state_next_reconciliation_idx
  on public.whatsapp_channel_sync_state (next_reconciliation_at)
  where next_reconciliation_at is not null and sync_status <> 'disabled';
create index if not exists whatsapp_sync_runs_channel_created_idx
  on public.whatsapp_sync_runs (channel_id, created_at desc);
create index if not exists whatsapp_sync_runs_status_scheduled_idx
  on public.whatsapp_sync_runs (status, scheduled_at, created_at);
create unique index if not exists whatsapp_sync_runs_one_active_per_channel_idx
  on public.whatsapp_sync_runs (channel_id)
  where status in ('queued', 'running');

comment on table public.whatsapp_channel_sync_state is
  'Estado operacional da sincronizacao WhatsApp por canal. Nunca guardar segredos, QR, cookies ou tokens.';
comment on table public.whatsapp_sync_runs is
  'Jobs/runs de sincronizacao WhatsApp. Payloads devem conter apenas metadados operacionais nao secretos.';

-- FRESH ENVIRONMENT SCHEMA RECONCILIATION
-- Production already records migration 20260716081940 as applied.
-- Keep this reconciliation inside 0035 so new Supabase environments converge to
-- the current Production schema without requiring migration repair or writes to Production.

drop policy "service_all_ai_response_logs" on "public"."ai_response_logs";

drop policy "public_read_app_users" on "public"."app_users";

drop policy "service_all_billing_checkout_sessions" on "public"."billing_checkout_sessions";

drop policy "service_all_billing_subscriptions" on "public"."billing_subscriptions";

drop policy "public_read_channels" on "public"."channels";

drop policy "public_read_broadcast_targets" on "public"."content_broadcast_targets";

drop policy "public_read_content_broadcasts" on "public"."content_broadcasts";

drop policy "public_read_crm_contact_notes" on "public"."crm_contact_notes";

drop policy "public_read_crm_contacts" on "public"."crm_contacts";

drop policy "public_read_distribution_channels" on "public"."distribution_channels";

drop policy "public_read_group_contact_list_items" on "public"."group_contact_list_items";

drop policy "public_read_group_contact_lists" on "public"."group_contact_lists";

drop policy "public_read_active_organizations" on "public"."organizations";

drop policy "public_read_pipeline_items" on "public"."pipeline_items";

drop policy "public_read_pipeline_stages" on "public"."pipeline_stages";

drop policy "public_read_quick_replies" on "public"."quick_replies";

drop policy "public_read_tenant_users" on "public"."tenant_users";

drop policy "public_read_tenants" on "public"."tenants";

drop policy "service_all_whatsapp_connections" on "public"."whatsapp_connections";

drop policy "public_read_whatsapp_conversations" on "public"."whatsapp_conversations";

drop policy "public_read_whatsapp_groups" on "public"."whatsapp_groups";

drop policy "public_read_whatsapp_messages" on "public"."whatsapp_messages";

alter table "public"."crm_contacts" drop constraint "crm_contacts_phone_key";

alter table "public"."whatsapp_connections" drop constraint "whatsapp_connections_session_id_key";

alter table "public"."whatsapp_conversation_events" drop constraint "whatsapp_conversation_events_organization_id_fkey";

alter table "public"."whatsapp_conversation_events" drop constraint "whatsapp_conversation_events_tenant_id_fkey";

alter table "public"."whatsapp_conversations" drop constraint "whatsapp_conversations_external_chat_id_key";

alter table "public"."whatsapp_messages" drop constraint "whatsapp_messages_external_message_id_key";

alter table "public"."app_users" drop constraint "app_users_role_check";

alter table "public"."app_users" drop constraint "app_users_status_check";

alter table "public"."billing_checkout_sessions" drop constraint "billing_checkout_sessions_organization_id_fkey";

alter table "public"."billing_checkout_sessions" drop constraint "billing_checkout_sessions_tenant_id_fkey";

alter table "public"."billing_subscriptions" drop constraint "billing_subscriptions_organization_id_fkey";

alter table "public"."billing_subscriptions" drop constraint "billing_subscriptions_tenant_id_fkey";

alter table "public"."finance_payments" drop constraint "finance_payments_checkout_session_id_fkey";

alter table "public"."organizations" drop constraint "organizations_status_check";

alter table "public"."organizations" drop constraint "organizations_tenant_id_fkey";

alter table "public"."tenant_users" drop constraint "tenant_users_role_check";

alter table "public"."tenant_users" drop constraint "tenant_users_status_check";

alter table "public"."tenants" drop constraint "tenants_status_check";

alter table "public"."whatsapp_connections" drop constraint "whatsapp_connections_organization_id_fkey";

alter table "public"."whatsapp_connections" drop constraint "whatsapp_connections_tenant_id_fkey";

alter table "public"."whatsapp_media_files" drop constraint "whatsapp_media_files_conversation_id_fkey";

alter table "public"."whatsapp_media_files" drop constraint "whatsapp_media_files_organization_id_fkey";

alter table "public"."whatsapp_media_files" drop constraint "whatsapp_media_files_tenant_id_fkey";

alter table "public"."whatsapp_shared_contacts" drop constraint "whatsapp_shared_contacts_conversation_id_fkey";

alter table "public"."whatsapp_shared_contacts" drop constraint "whatsapp_shared_contacts_organization_id_fkey";

alter table "public"."whatsapp_shared_contacts" drop constraint "whatsapp_shared_contacts_tenant_id_fkey";

alter table "public"."whatsapp_shared_locations" drop constraint "whatsapp_shared_locations_conversation_id_fkey";

alter table "public"."whatsapp_shared_locations" drop constraint "whatsapp_shared_locations_organization_id_fkey";

alter table "public"."whatsapp_shared_locations" drop constraint "whatsapp_shared_locations_tenant_id_fkey";

drop index if exists "public"."crm_contacts_phone_key";

drop index if exists "public"."whatsapp_connections_session_id_key";

drop index if exists "public"."whatsapp_conversations_external_chat_id_key";

drop index if exists "public"."whatsapp_conversations_provider_chat_uniq";

drop index if exists "public"."whatsapp_conversations_tenant_org_updated_idx";

drop index if exists "public"."whatsapp_media_files_message_id_idx";

drop index if exists "public"."whatsapp_messages_external_message_id_key";

drop index if exists "public"."whatsapp_messages_external_message_id_uniq";

drop index if exists "public"."whatsapp_messages_tenant_org_created_idx";

drop index if exists "public"."whatsapp_shared_contacts_message_id_idx";

drop index if exists "public"."whatsapp_shared_locations_message_id_idx";

drop index if exists "public"."provider_events_processing_status_idx";


  create table "public"."access_attempts" (
    "id" uuid not null default gen_random_uuid(),
    "email" text,
    "phone" text,
    "ip_address" text,
    "user_agent" text,
    "attempt_type" text not null default 'login'::text,
    "status" text not null default 'failed'::text,
    "failure_reason" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."access_attempts" enable row level security;


  create table "public"."agent_automation_cooldown" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "conversation_id" uuid not null,
    "last_automated_response_at" timestamp with time zone not null default now(),
    "last_response_type" text,
    "last_response_text" text,
    "response_hash" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."agent_automation_cooldown" enable row level security;


  create table "public"."agent_automation_jobs" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "organization_id" uuid not null,
    "channel_id" uuid not null,
    "conversation_id" uuid not null,
    "message_id" uuid not null,
    "status" text not null default 'pending'::text,
    "agent_type" text not null default 'lips-auto'::text,
    "intent" text,
    "intent_confidence" numeric(3,2),
    "extracted_data" jsonb,
    "catalog_matches_count" integer,
    "selected_item_id" uuid,
    "catalog_confidence" numeric(3,2),
    "response_type" text,
    "response_text" text,
    "sent_to_evolution" boolean not null default false,
    "evolution_message_id" text,
    "evolution_error" text,
    "outbound_message_id" uuid,
    "error_message" text,
    "error_code" text,
    "error_context" jsonb,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."agent_automation_jobs" enable row level security;


  create table "public"."agent_catalog_products" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "organization_id" uuid,
    "agent_installation_id" uuid,
    "source_code" text not null,
    "external_id" text not null,
    "sku" text,
    "barcode" text,
    "name" text not null,
    "description" text,
    "unit" text,
    "brand" text,
    "category" text,
    "price" numeric(14,2),
    "promotional_price" numeric(14,2),
    "cost_price" numeric(14,2),
    "stock_quantity" numeric(14,3),
    "stock_available" numeric(14,3),
    "is_active" boolean not null default true,
    "is_available" boolean not null default true,
    "source_updated_at" timestamp with time zone,
    "last_synced_at" timestamp with time zone not null default now(),
    "raw_data" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."agent_catalog_products" enable row level security;


  create table "public"."agent_connector_types" (
    "id" uuid not null default gen_random_uuid(),
    "code" text not null,
    "name" text not null,
    "description" text,
    "is_active" boolean not null default true,
    "default_sync_interval_minutes" integer not null default 60,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."agent_connector_types" enable row level security;


  create table "public"."agent_dialog_templates" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "organization_id" uuid,
    "connector_type_id" uuid,
    "scope" text not null default 'catalog_products'::text,
    "intent_code" text not null,
    "intent_name" text not null,
    "required_query" text not null,
    "customer_question_examples" jsonb not null default '[]'::jsonb,
    "template_text" text not null,
    "fallback_text" text,
    "variables" jsonb not null default '[]'::jsonb,
    "is_active" boolean not null default true,
    "sort_order" integer not null default 0,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."agent_dialog_templates" enable row level security;


  create table "public"."agent_installations" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "organization_id" uuid,
    "connector_type_id" uuid not null,
    "name" text not null default 'Shamar Agent'::text,
    "status" text not null default 'pending'::text,
    "installation_key_hash" text,
    "agent_version" text,
    "machine_name" text,
    "windows_user" text,
    "sync_interval_minutes" integer not null default 60,
    "last_heartbeat_at" timestamp with time zone,
    "last_sync_at" timestamp with time zone,
    "last_success_sync_at" timestamp with time zone,
    "last_error_at" timestamp with time zone,
    "last_error_message" text,
    "read_only" boolean not null default true,
    "config" jsonb not null default '{}'::jsonb,
    "metadata" jsonb not null default '{}'::jsonb,
    "activated_at" timestamp with time zone,
    "disabled_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."agent_installations" enable row level security;


  create table "public"."agent_presence" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "status" text not null default 'offline'::text,
    "current_queue_id" uuid,
    "last_seen_at" timestamp with time zone not null default now(),
    "metadata" jsonb not null default '{}'::jsonb,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."agent_presence" enable row level security;


  create table "public"."agent_sync_runs" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "organization_id" uuid,
    "agent_installation_id" uuid not null,
    "sync_type" text not null default 'catalog_products'::text,
    "status" text not null default 'started'::text,
    "started_at" timestamp with time zone not null default now(),
    "finished_at" timestamp with time zone,
    "records_read" integer not null default 0,
    "records_created" integer not null default 0,
    "records_updated" integer not null default 0,
    "records_skipped" integer not null default 0,
    "records_failed" integer not null default 0,
    "error_message" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."agent_sync_runs" enable row level security;


  create table "public"."ai_conversation_summaries" (
    "id" uuid not null default gen_random_uuid(),
    "provider" text not null default 'openai'::text,
    "external_chat_id" text not null,
    "conversation_id" uuid,
    "contact_id" uuid,
    "summary" text not null,
    "key_points" text[] not null default '{}'::text[],
    "next_steps" text[] not null default '{}'::text[],
    "sentiment" text not null default 'neutral'::text,
    "urgency" text not null default 'normal'::text,
    "model" text,
    "tokens_used" integer,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ai_conversation_summaries" enable row level security;


  create table "public"."ai_extracted_customer_data" (
    "id" uuid not null default gen_random_uuid(),
    "contact_id" uuid,
    "conversation_id" uuid,
    "external_chat_id" text,
    "extracted_name" text,
    "extracted_phone" text,
    "extracted_email" text,
    "extracted_company" text,
    "extracted_location" text,
    "extracted_need" text,
    "extracted_budget" text,
    "extracted_deadline" text,
    "extracted_metadata" jsonb not null default '{}'::jsonb,
    "confidence" numeric(5,2) not null default 0,
    "reviewed_status" text not null default 'pending'::text,
    "created_at" timestamp with time zone not null default now(),
    "reviewed_at" timestamp with time zone
      );


alter table "public"."ai_extracted_customer_data" enable row level security;


  create table "public"."ai_lead_scores" (
    "id" uuid not null default gen_random_uuid(),
    "contact_id" uuid,
    "conversation_id" uuid,
    "external_chat_id" text,
    "score" integer not null default 0,
    "temperature" text not null default 'cold'::text,
    "intent" text not null default 'unknown'::text,
    "confidence" numeric(5,2) not null default 0,
    "reasons" text[] not null default '{}'::text[],
    "recommended_action" text,
    "model" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ai_lead_scores" enable row level security;


  create table "public"."ai_objections" (
    "id" uuid not null default gen_random_uuid(),
    "contact_id" uuid,
    "conversation_id" uuid,
    "external_chat_id" text,
    "objection_type" text not null,
    "objection_text" text,
    "suggested_response" text,
    "status" text not null default 'open'::text,
    "created_at" timestamp with time zone not null default now(),
    "resolved_at" timestamp with time zone
      );


alter table "public"."ai_objections" enable row level security;


  create table "public"."ai_prompt_templates" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "run_type" text not null,
    "system_prompt" text not null,
    "user_prompt_template" text not null,
    "model" text not null default 'gpt-4.1-mini'::text,
    "temperature" numeric(3,2) not null default 0.30,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."ai_prompt_templates" enable row level security;


  create table "public"."ai_reply_suggestions" (
    "id" uuid not null default gen_random_uuid(),
    "external_chat_id" text not null,
    "conversation_id" uuid,
    "contact_id" uuid,
    "suggestion" text not null,
    "tone" text not null default 'professional'::text,
    "objective" text not null default 'reply'::text,
    "status" text not null default 'draft'::text,
    "model" text,
    "tokens_used" integer,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ai_reply_suggestions" enable row level security;


  create table "public"."ai_runs" (
    "id" uuid not null default gen_random_uuid(),
    "run_type" text not null,
    "provider" text not null default 'openai'::text,
    "model" text,
    "input_ref_type" text,
    "input_ref_id" text,
    "status" text not null default 'pending'::text,
    "prompt_tokens" integer,
    "completion_tokens" integer,
    "total_tokens" integer,
    "error_message" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ai_runs" enable row level security;


  create table "public"."api_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "token_hash" text not null,
    "token_prefix" text,
    "token_type" text not null default 'api'::text,
    "status" text not null default 'active'::text,
    "scopes" text[] not null default '{}'::text[],
    "last_used_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "created_by" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."api_tokens" enable row level security;


  create table "public"."app_permissions" (
    "id" uuid not null default gen_random_uuid(),
    "code" text not null,
    "name" text not null,
    "description" text,
    "module" text not null default 'general'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."app_permissions" enable row level security;


  create table "public"."app_settings" (
    "id" uuid not null default gen_random_uuid(),
    "setting_key" text not null,
    "setting_value" jsonb not null default '{}'::jsonb,
    "setting_type" text not null default 'json'::text,
    "module" text not null default 'general'::text,
    "description" text,
    "is_public" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."app_settings" enable row level security;


  create table "public"."app_user_permissions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "permission_id" uuid not null,
    "granted_at" timestamp with time zone not null default now()
      );


alter table "public"."app_user_permissions" enable row level security;


  create table "public"."application_logs" (
    "id" uuid not null default gen_random_uuid(),
    "level" text not null default 'info'::text,
    "source" text not null default 'app'::text,
    "module" text not null default 'general'::text,
    "message" text not null,
    "error_name" text,
    "error_stack" text,
    "request_id" text,
    "path" text,
    "method" text,
    "user_id" uuid,
    "external_chat_id" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."application_logs" enable row level security;


  create table "public"."audit_trail" (
    "id" uuid not null default gen_random_uuid(),
    "actor_user_id" uuid,
    "actor_name" text,
    "actor_email" text,
    "action" text not null,
    "entity_type" text not null,
    "entity_id" text,
    "old_values" jsonb,
    "new_values" jsonb,
    "changed_fields" text[] not null default '{}'::text[],
    "ip_address" text,
    "user_agent" text,
    "request_id" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."audit_trail" enable row level security;


  create table "public"."automation_action_logs" (
    "id" uuid not null default gen_random_uuid(),
    "run_id" uuid,
    "flow_id" uuid,
    "action_id" uuid,
    "action_type" text not null,
    "status" text not null default 'pending'::text,
    "input_payload" jsonb not null default '{}'::jsonb,
    "output_payload" jsonb not null default '{}'::jsonb,
    "error_message" text,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."automation_action_logs" enable row level security;


  create table "public"."automation_actions" (
    "id" uuid not null default gen_random_uuid(),
    "flow_id" uuid not null,
    "action_type" text not null,
    "action_order" integer not null default 1,
    "config" jsonb not null default '{}'::jsonb,
    "delay_seconds" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."automation_actions" enable row level security;


  create table "public"."automation_cooldowns" (
    "id" uuid not null default gen_random_uuid(),
    "flow_id" uuid,
    "contact_id" uuid,
    "external_chat_id" text,
    "cooldown_key" text not null,
    "expires_at" timestamp with time zone not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."automation_cooldowns" enable row level security;


  create table "public"."automation_flows" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "channel" text not null default 'whatsapp'::text,
    "trigger_type" text not null,
    "status" text not null default 'draft'::text,
    "priority" integer not null default 0,
    "is_active" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."automation_flows" enable row level security;


  create table "public"."automation_runs" (
    "id" uuid not null default gen_random_uuid(),
    "flow_id" uuid,
    "status" text not null default 'pending'::text,
    "trigger_source" text not null default 'system'::text,
    "contact_id" uuid,
    "conversation_id" uuid,
    "message_id" uuid,
    "deal_id" uuid,
    "task_id" uuid,
    "external_chat_id" text,
    "input_payload" jsonb not null default '{}'::jsonb,
    "output_payload" jsonb not null default '{}'::jsonb,
    "error_message" text,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."automation_runs" enable row level security;


  create table "public"."automation_triggers" (
    "id" uuid not null default gen_random_uuid(),
    "flow_id" uuid not null,
    "trigger_key" text not null,
    "operator" text not null default 'contains'::text,
    "trigger_value" text,
    "config" jsonb not null default '{}'::jsonb,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."automation_triggers" enable row level security;


  create table "public"."backup_configs" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "backup_type" text not null default 'database'::text,
    "frequency" text not null default 'daily'::text,
    "target_tables" text[] not null default '{}'::text[],
    "storage_provider" text not null default 'supabase'::text,
    "storage_bucket" text,
    "storage_path" text,
    "retention_days" integer not null default 30,
    "is_active" boolean not null default true,
    "last_run_at" timestamp with time zone,
    "next_run_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."backup_configs" enable row level security;


  create table "public"."backup_runs" (
    "id" uuid not null default gen_random_uuid(),
    "backup_config_id" uuid,
    "backup_name" text not null,
    "backup_type" text not null default 'database'::text,
    "status" text not null default 'pending'::text,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "storage_provider" text,
    "storage_bucket" text,
    "storage_path" text,
    "file_url" text,
    "file_size_bytes" bigint,
    "checksum" text,
    "total_records" integer,
    "total_tables" integer,
    "error_message" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."backup_runs" enable row level security;


  create table "public"."billing_plan_price_rules" (
    "id" uuid not null default gen_random_uuid(),
    "plan_slug" text not null,
    "plan_name" text not null,
    "monthly_price" numeric(12,2) not null,
    "annual_price" numeric(12,2),
    "setup_fee" numeric(12,2) not null default 0,
    "included_companies" integer not null default 1,
    "included_users" integer not null default 1,
    "included_whatsapp_connections" integer not null default 1,
    "extra_user_price" numeric(12,2) not null default 0,
    "extra_whatsapp_price" numeric(12,2) not null default 0,
    "ai_addon_price" numeric(12,2) not null default 79.90,
    "storage_limit_gb" integer not null default 5,
    "fair_use_messages_month" integer,
    "refund_policy_days" integer not null default 7,
    "is_active" boolean not null default true,
    "public_description" text,
    "legal_notes" text,
    "features" jsonb not null default '[]'::jsonb,
    "limits" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."billing_plan_price_rules" enable row level security;


  create table "public"."blocked_contacts" (
    "id" uuid not null default gen_random_uuid(),
    "contact_id" uuid,
    "phone" text,
    "email" text,
    "reason" text,
    "blocked_by" text,
    "source" text not null default 'manual'::text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."blocked_contacts" enable row level security;


  create table "public"."business_holidays" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "holiday_date" date not null,
    "description" text,
    "is_closed" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."business_holidays" enable row level security;


  create table "public"."business_hours" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "timezone" text not null default 'America/Sao_Paulo'::text,
    "day_of_week" integer not null,
    "opens_at" time without time zone,
    "closes_at" time without time zone,
    "is_closed" boolean not null default false,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."business_hours" enable row level security;


  create table "public"."calendar_event_participants" (
    "id" uuid not null default gen_random_uuid(),
    "event_id" uuid not null,
    "participant_type" text not null default 'user'::text,
    "user_id" uuid,
    "contact_id" uuid,
    "name" text,
    "email" text,
    "phone" text,
    "response_status" text not null default 'pending'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."calendar_event_participants" enable row level security;


  create table "public"."calendar_event_templates" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "event_type" text not null default 'follow_up'::text,
    "default_title" text not null,
    "default_description" text,
    "default_duration_minutes" integer not null default 30,
    "default_reminder_minutes" integer[] not null default ARRAY[15],
    "priority" text not null default 'normal'::text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."calendar_event_templates" enable row level security;


  create table "public"."calendar_events" (
    "id" uuid not null default gen_random_uuid(),
    "calendar_id" uuid,
    "tenant_id" uuid,
    "organization_id" uuid,
    "title" text not null,
    "description" text,
    "event_type" text not null default 'follow_up'::text,
    "status" text not null default 'scheduled'::text,
    "priority" text not null default 'normal'::text,
    "starts_at" timestamp with time zone not null,
    "ends_at" timestamp with time zone,
    "all_day" boolean not null default false,
    "timezone" text not null default 'America/Sao_Paulo'::text,
    "location" text,
    "meeting_url" text,
    "contact_id" uuid,
    "conversation_id" uuid,
    "deal_id" uuid,
    "task_id" uuid,
    "proposal_id" uuid,
    "invoice_id" uuid,
    "assigned_to" uuid,
    "created_by" text,
    "recurrence_rule" text,
    "reminder_minutes" integer[] not null default ARRAY[15],
    "completed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."calendar_events" enable row level security;


  create table "public"."calendars" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "organization_id" uuid,
    "name" text not null,
    "description" text,
    "calendar_type" text not null default 'general'::text,
    "owner_user_id" uuid,
    "color" text,
    "timezone" text not null default 'America/Sao_Paulo'::text,
    "is_default" boolean not null default false,
    "is_active" boolean not null default true,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."calendars" enable row level security;


  create table "public"."catalog_categories" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "slug" text,
    "color" text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "tenant_id" uuid,
    "organization_id" uuid,
    "external_source" text,
    "external_id" text,
    "metadata" jsonb not null default '{}'::jsonb
      );


alter table "public"."catalog_categories" enable row level security;


  create table "public"."catalog_items" (
    "id" uuid not null default gen_random_uuid(),
    "category_id" uuid,
    "name" text not null,
    "slug" text,
    "description" text,
    "short_description" text,
    "item_type" text not null default 'service'::text,
    "status" text not null default 'active'::text,
    "price" numeric(12,2),
    "compare_at_price" numeric(12,2),
    "cost" numeric(12,2),
    "currency" text not null default 'BRL'::text,
    "sku" text,
    "unit" text,
    "duration_minutes" integer,
    "image_url" text,
    "external_url" text,
    "tags" text[] not null default '{}'::text[],
    "metadata" jsonb not null default '{}'::jsonb,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "tenant_id" uuid,
    "organization_id" uuid,
    "external_source" text,
    "external_id" text,
    "barcode" text,
    "brand" text,
    "stock_quantity" numeric(12,3),
    "source_updated_at" timestamp with time zone,
    "last_synced_at" timestamp with time zone,
    "raw_payload" jsonb not null default '{}'::jsonb,
    "promotional_price" numeric(12,2),
    "cost_price" numeric(12,2),
    "stock_available" numeric(14,3) not null default 0,
    "is_available" boolean not null default true
      );


alter table "public"."catalog_items" enable row level security;


  create table "public"."commercial_agent_profiles" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "organization_id" uuid not null,
    "name" text not null,
    "business_name" text not null,
    "enabled" boolean not null default false,
    "stage" text not null default 'internal_alpha'::text,
    "response_mode" text not null default 'observer'::text,
    "pricing_authority" text not null default 'human'::text,
    "stock_authority" text not null default 'human'::text,
    "profile" jsonb not null default '{}'::jsonb,
    "status" text not null default 'draft'::text,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."commercial_agent_profiles" enable row level security;


  create table "public"."commercial_conversation_analysis" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "organization_id" uuid not null,
    "channel_id" uuid,
    "conversation_id" uuid not null,
    "profile_id" uuid,
    "status" text not null default 'generated'::text,
    "analysis" jsonb not null default '{}'::jsonb,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "conversation_content_hash" text,
    "profile_version" text,
    "prompt_version" text,
    "model" text,
    "provider" text,
    "provider_response_id" text,
    "request_status" text,
    "latency_ms" integer,
    "input_tokens" integer,
    "output_tokens" integer,
    "total_tokens" integer,
    "estimated_cost_usd" numeric(12,8),
    "error_code" text,
    "guardrail_reasons" text[] not null default '{}'::text[]
      );


alter table "public"."commercial_conversation_analysis" enable row level security;


  create table "public"."commercial_follow_ups" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "organization_id" uuid not null,
    "channel_id" uuid,
    "conversation_id" uuid not null,
    "profile_id" uuid,
    "opportunity_id" uuid,
    "status" text not null default 'pending'::text,
    "reason" text not null,
    "priority" text not null default 'normal'::text,
    "suggested_at" timestamp with time zone,
    "due_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."commercial_follow_ups" enable row level security;


  create table "public"."commercial_offer_items" (
    "id" uuid not null default gen_random_uuid(),
    "offer_id" uuid not null,
    "catalog_item_id" uuid not null,
    "quantity" numeric(12,2) not null default 1,
    "unit_price" numeric(12,2),
    "discount_type" text,
    "discount_value" numeric(12,2),
    "sort_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."commercial_offer_items" enable row level security;


  create table "public"."commercial_offers" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "offer_type" text not null default 'manual'::text,
    "status" text not null default 'active'::text,
    "valid_from" timestamp with time zone,
    "valid_until" timestamp with time zone,
    "discount_type" text,
    "discount_value" numeric(12,2),
    "terms" text,
    "internal_notes" text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."commercial_offers" enable row level security;


  create table "public"."commercial_opportunities" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "organization_id" uuid not null,
    "channel_id" uuid,
    "conversation_id" uuid,
    "profile_id" uuid,
    "status" text not null default 'open'::text,
    "stage" text not null default 'new'::text,
    "temperature" text not null default 'cold'::text,
    "title" text not null,
    "potential_value" numeric(12,2),
    "currency" text not null default 'BRL'::text,
    "summary" text,
    "lost_reason" text,
    "won_at" timestamp with time zone,
    "lost_at" timestamp with time zone,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."commercial_opportunities" enable row level security;


  create table "public"."commercial_proposal_events" (
    "id" uuid not null default gen_random_uuid(),
    "proposal_id" uuid not null,
    "event_type" text not null,
    "title" text,
    "description" text,
    "actor" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."commercial_proposal_events" enable row level security;


  create table "public"."commercial_proposal_items" (
    "id" uuid not null default gen_random_uuid(),
    "proposal_id" uuid not null,
    "catalog_item_id" uuid,
    "item_name" text not null,
    "description" text,
    "quantity" numeric(12,2) not null default 1,
    "unit_price" numeric(12,2) not null default 0,
    "discount_type" text,
    "discount_value" numeric(12,2),
    "line_total" numeric(12,2) not null default 0,
    "sort_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."commercial_proposal_items" enable row level security;


  create table "public"."commercial_proposals" (
    "id" uuid not null default gen_random_uuid(),
    "proposal_number" text,
    "contact_id" uuid,
    "conversation_id" uuid,
    "deal_id" uuid,
    "offer_id" uuid,
    "title" text not null,
    "description" text,
    "status" text not null default 'draft'::text,
    "subtotal" numeric(12,2) not null default 0,
    "discount_total" numeric(12,2) not null default 0,
    "tax_total" numeric(12,2) not null default 0,
    "total" numeric(12,2) not null default 0,
    "currency" text not null default 'BRL'::text,
    "payment_terms" text,
    "delivery_terms" text,
    "validity_date" date,
    "public_url" text,
    "pdf_url" text,
    "sent_at" timestamp with time zone,
    "viewed_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "expired_at" timestamp with time zone,
    "rejection_reason" text,
    "internal_notes" text,
    "created_by" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."commercial_proposals" enable row level security;


  create table "public"."commercial_response_suggestions" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "organization_id" uuid not null,
    "channel_id" uuid,
    "conversation_id" uuid not null,
    "profile_id" uuid,
    "analysis_id" uuid,
    "status" text not null default 'draft'::text,
    "suggestion" jsonb not null default '{}'::jsonb,
    "edited_text" text,
    "rejection_reason" text,
    "created_by" uuid,
    "reviewed_by" uuid,
    "reviewed_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "conversation_content_hash" text,
    "profile_version" text,
    "prompt_version" text,
    "model" text,
    "provider" text,
    "provider_response_id" text,
    "request_status" text,
    "latency_ms" integer,
    "input_tokens" integer,
    "output_tokens" integer,
    "total_tokens" integer,
    "estimated_cost_usd" numeric(12,8),
    "error_code" text,
    "guardrail_reasons" text[] not null default '{}'::text[]
      );


alter table "public"."commercial_response_suggestions" enable row level security;


  create table "public"."consent_keywords" (
    "id" uuid not null default gen_random_uuid(),
    "keyword" text not null,
    "action" text not null,
    "channel" text not null default 'whatsapp'::text,
    "description" text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."consent_keywords" enable row level security;


  create table "public"."consent_message_templates" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "channel" text not null default 'whatsapp'::text,
    "template_type" text not null,
    "body" text not null,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."consent_message_templates" enable row level security;


  create table "public"."contact_identities" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "organization_id" uuid not null,
    "contact_id" uuid not null,
    "channel_id" uuid not null,
    "provider" text not null,
    "identity_type" text not null,
    "external_id" text not null,
    "display_name" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."contact_identities" enable row level security;


  create table "public"."conversation_assignment_events" (
    "id" uuid not null default gen_random_uuid(),
    "assignment_id" uuid,
    "external_chat_id" text not null,
    "event_type" text not null,
    "from_user_id" uuid,
    "to_user_id" uuid,
    "from_queue_id" uuid,
    "to_queue_id" uuid,
    "reason" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."conversation_assignment_events" enable row level security;


  create table "public"."conversation_assignments" (
    "id" uuid not null default gen_random_uuid(),
    "conversation_id" uuid,
    "external_chat_id" text not null,
    "queue_id" uuid,
    "assigned_to" uuid,
    "status" text not null default 'open'::text,
    "priority" text not null default 'normal'::text,
    "assigned_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "last_activity_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "organization_id" uuid,
    "tenant_id" uuid
      );


alter table "public"."conversation_assignments" enable row level security;


  create table "public"."conversation_flow_sessions" (
    "id" uuid not null default gen_random_uuid(),
    "flow_id" uuid not null,
    "conversation_id" uuid,
    "contact_id" uuid,
    "current_step_order" integer not null default 1,
    "status" text not null default 'active'::text,
    "started_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone,
    "last_sent_at" timestamp with time zone,
    "metadata" jsonb not null default '{}'::jsonb,
    "organization_id" uuid,
    "tenant_id" uuid
      );


alter table "public"."conversation_flow_sessions" enable row level security;


  create table "public"."conversation_flow_steps" (
    "id" uuid not null default gen_random_uuid(),
    "flow_id" uuid not null,
    "step_order" integer not null default 1,
    "title" text not null,
    "message_body" text not null,
    "wait_minutes" integer not null default 0,
    "step_type" text not null default 'message'::text,
    "quick_reply_id" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "organization_id" uuid,
    "tenant_id" uuid
      );


alter table "public"."conversation_flow_steps" enable row level security;


  create table "public"."conversation_flows" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "trigger_type" text not null default 'manual'::text,
    "status" text not null default 'draft'::text,
    "tags" text[] not null default '{}'::text[],
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "organization_id" uuid,
    "tenant_id" uuid,
    "language" text not null default 'pt-BR'::text
      );


alter table "public"."conversation_flows" enable row level security;


  create table "public"."conversation_notes" (
    "id" uuid not null default gen_random_uuid(),
    "provider" text not null default 'whatsapp_web'::text,
    "external_chat_id" text not null,
    "note" text not null,
    "created_by" text,
    "created_at" timestamp with time zone not null default now(),
    "organization_id" uuid,
    "tenant_id" uuid
      );


alter table "public"."conversation_notes" enable row level security;


  create table "public"."crm_activities" (
    "id" uuid not null default gen_random_uuid(),
    "contact_id" uuid,
    "conversation_id" uuid,
    "deal_id" uuid,
    "task_id" uuid,
    "activity_type" text not null,
    "title" text not null,
    "description" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_by" text,
    "created_at" timestamp with time zone not null default now(),
    "organization_id" uuid,
    "tenant_id" uuid
      );


alter table "public"."crm_activities" enable row level security;


  create table "public"."crm_campaign_recipients" (
    "id" uuid not null default gen_random_uuid(),
    "campaign_id" uuid not null,
    "contact_id" uuid not null,
    "status" text not null default 'pending'::text,
    "phone" text,
    "message_body" text,
    "provider_message_id" text,
    "error_message" text,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."crm_campaign_recipients" enable row level security;


  create table "public"."crm_campaigns" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "channel" text not null default 'whatsapp'::text,
    "status" text not null default 'draft'::text,
    "list_id" uuid,
    "message_template" text,
    "scheduled_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "total_recipients" integer not null default 0,
    "sent_count" integer not null default 0,
    "failed_count" integer not null default 0,
    "skipped_count" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."crm_campaigns" enable row level security;


  create table "public"."crm_consent_events" (
    "id" uuid not null default gen_random_uuid(),
    "contact_id" uuid,
    "phone" text,
    "old_status" text,
    "new_status" text not null,
    "source" text not null default 'manual'::text,
    "reason" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."crm_consent_events" enable row level security;


  create table "public"."crm_contact_list_items" (
    "id" uuid not null default gen_random_uuid(),
    "list_id" uuid not null,
    "contact_id" uuid not null,
    "review_status" text not null default 'pending'::text,
    "consent_status" text not null default 'unknown'::text,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "organization_id" uuid,
    "tenant_id" uuid
      );


alter table "public"."crm_contact_list_items" enable row level security;


  create table "public"."crm_contact_lists" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "source" text not null default 'manual'::text,
    "status" text not null default 'draft'::text,
    "total_contacts" integer not null default 0,
    "approved_contacts" integer not null default 0,
    "rejected_contacts" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "organization_id" uuid,
    "tenant_id" uuid
      );


alter table "public"."crm_contact_lists" enable row level security;


  create table "public"."crm_contact_tags" (
    "id" uuid not null default gen_random_uuid(),
    "contact_id" uuid not null,
    "tag_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "organization_id" uuid,
    "tenant_id" uuid
      );


alter table "public"."crm_contact_tags" enable row level security;


  create table "public"."crm_deals" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "contact_id" uuid,
    "conversation_id" uuid,
    "stage_id" uuid,
    "value" numeric(12,2),
    "currency" text not null default 'BRL'::text,
    "status" text not null default 'open'::text,
    "source" text not null default 'manual'::text,
    "priority" text not null default 'normal'::text,
    "expected_close_date" date,
    "closed_at" timestamp with time zone,
    "lost_reason" text,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "organization_id" uuid,
    "tenant_id" uuid
      );


alter table "public"."crm_deals" enable row level security;


  create table "public"."crm_pipeline_stages" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "position" integer not null default 0,
    "color" text,
    "is_won" boolean not null default false,
    "is_lost" boolean not null default false,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "organization_id" uuid,
    "tenant_id" uuid
      );


alter table "public"."crm_pipeline_stages" enable row level security;


  create table "public"."crm_tags" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "color" text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "organization_id" uuid,
    "tenant_id" uuid
      );


alter table "public"."crm_tags" enable row level security;


  create table "public"."crm_task_templates" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "task_type" text not null default 'follow_up'::text,
    "priority" text not null default 'normal'::text,
    "default_due_interval" text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."crm_task_templates" enable row level security;


  create table "public"."crm_tasks" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "contact_id" uuid,
    "conversation_id" uuid,
    "deal_id" uuid,
    "task_type" text not null default 'follow_up'::text,
    "status" text not null default 'pending'::text,
    "priority" text not null default 'normal'::text,
    "due_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "assigned_to" text,
    "created_by" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "organization_id" uuid,
    "tenant_id" uuid
      );


alter table "public"."crm_tasks" enable row level security;


  create table "public"."deploy_checklist_items" (
    "id" uuid not null default gen_random_uuid(),
    "checklist_id" uuid not null,
    "title" text not null,
    "description" text,
    "sort_order" integer not null default 0,
    "is_required" boolean not null default true,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."deploy_checklist_items" enable row level security;


  create table "public"."deploy_checklists" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "environment" text not null default 'production'::text,
    "status" text not null default 'active'::text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."deploy_checklists" enable row level security;


  create table "public"."deployments" (
    "id" uuid not null default gen_random_uuid(),
    "deployment_name" text,
    "environment" text not null default 'production'::text,
    "provider" text not null default 'vercel'::text,
    "repository" text,
    "branch" text,
    "commit_hash" text,
    "status" text not null default 'pending'::text,
    "deployment_url" text,
    "build_log_url" text,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "error_message" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."deployments" enable row level security;


  create table "public"."document_acceptances" (
    "id" uuid not null default gen_random_uuid(),
    "document_id" uuid not null,
    "contact_id" uuid,
    "signer_name" text,
    "signer_email" text,
    "signer_phone" text,
    "signer_document" text,
    "acceptance_type" text not null default 'click_accept'::text,
    "status" text not null default 'accepted'::text,
    "accepted_text" text,
    "ip_address" text,
    "user_agent" text,
    "accepted_at" timestamp with time zone not null default now(),
    "metadata" jsonb not null default '{}'::jsonb
      );


alter table "public"."document_acceptances" enable row level security;


  create table "public"."document_events" (
    "id" uuid not null default gen_random_uuid(),
    "document_id" uuid not null,
    "event_type" text not null,
    "title" text,
    "description" text,
    "actor" text,
    "ip_address" text,
    "user_agent" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."document_events" enable row level security;


  create table "public"."document_files" (
    "id" uuid not null default gen_random_uuid(),
    "document_id" uuid not null,
    "file_type" text not null default 'pdf'::text,
    "file_name" text,
    "mime_type" text,
    "file_size_bytes" bigint,
    "storage_bucket" text,
    "storage_path" text,
    "public_url" text,
    "checksum" text,
    "is_primary" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."document_files" enable row level security;


  create table "public"."document_public_links" (
    "id" uuid not null default gen_random_uuid(),
    "document_id" uuid not null,
    "token" text not null,
    "purpose" text not null default 'view'::text,
    "expires_at" timestamp with time zone,
    "max_views" integer,
    "view_count" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."document_public_links" enable row level security;


  create table "public"."document_templates" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "template_type" text not null default 'contract'::text,
    "title_template" text not null,
    "body_template" text not null,
    "variables" jsonb not null default '[]'::jsonb,
    "status" text not null default 'active'::text,
    "version" integer not null default 1,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."document_templates" enable row level security;


  create table "public"."documents" (
    "id" uuid not null default gen_random_uuid(),
    "template_id" uuid,
    "contact_id" uuid,
    "conversation_id" uuid,
    "deal_id" uuid,
    "proposal_id" uuid,
    "invoice_id" uuid,
    "document_number" text,
    "title" text not null,
    "document_type" text not null default 'contract'::text,
    "status" text not null default 'draft'::text,
    "body" text,
    "rendered_html" text,
    "public_url" text,
    "pdf_url" text,
    "storage_bucket" text,
    "storage_path" text,
    "expires_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "viewed_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "rejection_reason" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_by" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."documents" enable row level security;


  create table "public"."external_integrations" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "provider" text not null,
    "integration_type" text not null default 'webhook'::text,
    "status" text not null default 'active'::text,
    "base_url" text,
    "auth_type" text not null default 'none'::text,
    "config" jsonb not null default '{}'::jsonb,
    "secrets_ref" text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."external_integrations" enable row level security;


  create table "public"."file_access_logs" (
    "id" uuid not null default gen_random_uuid(),
    "file_id" uuid,
    "share_id" uuid,
    "action" text not null,
    "actor" text,
    "ip_address" text,
    "user_agent" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."file_access_logs" enable row level security;


  create table "public"."file_folders" (
    "id" uuid not null default gen_random_uuid(),
    "parent_id" uuid,
    "name" text not null,
    "description" text,
    "folder_type" text not null default 'general'::text,
    "path" text,
    "is_system" boolean not null default false,
    "is_active" boolean not null default true,
    "created_by" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."file_folders" enable row level security;


  create table "public"."file_shares" (
    "id" uuid not null default gen_random_uuid(),
    "file_id" uuid not null,
    "token" text not null,
    "share_type" text not null default 'view'::text,
    "recipient_email" text,
    "recipient_phone" text,
    "expires_at" timestamp with time zone,
    "max_views" integer,
    "view_count" integer not null default 0,
    "download_count" integer not null default 0,
    "is_active" boolean not null default true,
    "created_by" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."file_shares" enable row level security;


  create table "public"."file_tag_links" (
    "id" uuid not null default gen_random_uuid(),
    "file_id" uuid not null,
    "tag_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."file_tag_links" enable row level security;


  create table "public"."file_tags" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "color" text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."file_tags" enable row level security;


  create table "public"."file_versions" (
    "id" uuid not null default gen_random_uuid(),
    "file_id" uuid not null,
    "version_number" integer not null default 1,
    "file_name" text not null,
    "storage_bucket" text,
    "storage_path" text,
    "public_url" text,
    "file_size_bytes" bigint,
    "checksum" text,
    "change_note" text,
    "created_by" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."file_versions" enable row level security;


  create table "public"."files" (
    "id" uuid not null default gen_random_uuid(),
    "folder_id" uuid,
    "contact_id" uuid,
    "conversation_id" uuid,
    "message_id" uuid,
    "deal_id" uuid,
    "proposal_id" uuid,
    "invoice_id" uuid,
    "document_id" uuid,
    "file_name" text not null,
    "original_file_name" text,
    "title" text,
    "description" text,
    "file_type" text not null default 'other'::text,
    "mime_type" text,
    "file_extension" text,
    "file_size_bytes" bigint,
    "storage_provider" text not null default 'supabase'::text,
    "storage_bucket" text,
    "storage_path" text,
    "public_url" text,
    "signed_url" text,
    "checksum" text,
    "visibility" text not null default 'private'::text,
    "status" text not null default 'active'::text,
    "metadata" jsonb not null default '{}'::jsonb,
    "uploaded_by" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."files" enable row level security;


  create table "public"."finance_accounts" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "account_type" text not null default 'bank'::text,
    "currency" text not null default 'BRL'::text,
    "bank_name" text,
    "agency" text,
    "account_number" text,
    "pix_key" text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."finance_accounts" enable row level security;


  create table "public"."finance_events" (
    "id" uuid not null default gen_random_uuid(),
    "invoice_id" uuid,
    "installment_id" uuid,
    "payment_id" uuid,
    "contact_id" uuid,
    "event_type" text not null,
    "title" text,
    "description" text,
    "actor" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."finance_events" enable row level security;


  create table "public"."finance_installments" (
    "id" uuid not null default gen_random_uuid(),
    "invoice_id" uuid not null,
    "installment_number" integer not null,
    "title" text,
    "amount" numeric(12,2) not null default 0,
    "paid_amount" numeric(12,2) not null default 0,
    "status" text not null default 'pending'::text,
    "due_date" date not null,
    "paid_at" timestamp with time zone,
    "payment_method_id" uuid,
    "finance_account_id" uuid,
    "payment_url" text,
    "external_reference" text,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."finance_installments" enable row level security;


  create table "public"."finance_invoice_items" (
    "id" uuid not null default gen_random_uuid(),
    "invoice_id" uuid not null,
    "catalog_item_id" uuid,
    "item_name" text not null,
    "description" text,
    "quantity" numeric(12,2) not null default 1,
    "unit_price" numeric(12,2) not null default 0,
    "discount_type" text,
    "discount_value" numeric(12,2),
    "line_total" numeric(12,2) not null default 0,
    "sort_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."finance_invoice_items" enable row level security;


  create table "public"."finance_invoices" (
    "id" uuid not null default gen_random_uuid(),
    "invoice_number" text,
    "contact_id" uuid,
    "conversation_id" uuid,
    "deal_id" uuid,
    "proposal_id" uuid,
    "title" text not null,
    "description" text,
    "status" text not null default 'draft'::text,
    "subtotal" numeric(12,2) not null default 0,
    "discount_total" numeric(12,2) not null default 0,
    "tax_total" numeric(12,2) not null default 0,
    "total" numeric(12,2) not null default 0,
    "paid_total" numeric(12,2) not null default 0,
    "balance_due" numeric(12,2) not null default 0,
    "currency" text not null default 'BRL'::text,
    "issue_date" date not null default CURRENT_DATE,
    "due_date" date,
    "paid_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "payment_url" text,
    "pdf_url" text,
    "external_reference" text,
    "notes" text,
    "internal_notes" text,
    "created_by" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "organization_id" uuid,
    "tenant_id" uuid,
    "billing_provider" text,
    "provider_invoice_id" text,
    "provider_subscription_id" text,
    "provider_customer_id" text,
    "checkout_session_id" uuid,
    "refund_status" text default 'none'::text,
    "refund_requested_at" timestamp with time zone,
    "refunded_at" timestamp with time zone,
    "cancellation_reason" text
      );


alter table "public"."finance_invoices" enable row level security;


  create table "public"."global_search_index" (
    "id" uuid not null default gen_random_uuid(),
    "entity_type" text not null,
    "entity_id" text not null,
    "title" text not null,
    "subtitle" text,
    "content" text,
    "summary" text,
    "module" text not null default 'general'::text,
    "searchable_text" text not null,
    "tags" text[] not null default '{}'::text[],
    "url_path" text,
    "tenant_id" uuid,
    "organization_id" uuid,
    "contact_id" uuid,
    "conversation_id" uuid,
    "priority" integer not null default 0,
    "is_active" boolean not null default true,
    "metadata" jsonb not null default '{}'::jsonb,
    "indexed_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."global_search_index" enable row level security;


  create table "public"."import_column_mappings" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "import_type" text not null default 'contacts'::text,
    "source_type" text not null default 'csv'::text,
    "mapping" jsonb not null default '{}'::jsonb,
    "sample_headers" text[] not null default '{}'::text[],
    "is_default" boolean not null default false,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."import_column_mappings" enable row level security;


  create table "public"."import_deduplication_rules" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "import_type" text not null default 'contacts'::text,
    "match_fields" text[] not null default '{}'::text[],
    "strategy" text not null default 'skip_existing'::text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."import_deduplication_rules" enable row level security;


  create table "public"."import_jobs" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "import_type" text not null default 'contacts'::text,
    "source_type" text not null default 'manual'::text,
    "status" text not null default 'draft'::text,
    "original_file_name" text,
    "file_id" uuid,
    "total_rows" integer not null default 0,
    "parsed_rows" integer not null default 0,
    "valid_rows" integer not null default 0,
    "invalid_rows" integer not null default 0,
    "duplicate_rows" integer not null default 0,
    "imported_rows" integer not null default 0,
    "skipped_rows" integer not null default 0,
    "mapping_config" jsonb not null default '{}'::jsonb,
    "import_options" jsonb not null default '{}'::jsonb,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "created_by" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."import_jobs" enable row level security;


  create table "public"."import_logs" (
    "id" uuid not null default gen_random_uuid(),
    "job_id" uuid,
    "row_id" uuid,
    "log_level" text not null default 'info'::text,
    "message" text not null,
    "details" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."import_logs" enable row level security;


  create table "public"."import_rows" (
    "id" uuid not null default gen_random_uuid(),
    "job_id" uuid not null,
    "row_number" integer not null,
    "raw_data" jsonb not null default '{}'::jsonb,
    "normalized_data" jsonb not null default '{}'::jsonb,
    "status" text not null default 'pending'::text,
    "error_messages" text[] not null default '{}'::text[],
    "warning_messages" text[] not null default '{}'::text[],
    "duplicate_of_contact_id" uuid,
    "imported_contact_id" uuid,
    "review_status" text not null default 'pending'::text,
    "reviewed_at" timestamp with time zone,
    "reviewed_by" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."import_rows" enable row level security;


  create table "public"."inbound_webhook_endpoints" (
    "id" uuid not null default gen_random_uuid(),
    "integration_id" uuid,
    "name" text not null,
    "description" text,
    "endpoint_key" text not null,
    "provider" text not null,
    "status" text not null default 'active'::text,
    "verify_token_hash" text,
    "secret_header_name" text,
    "allowed_ip_ranges" text[] not null default '{}'::text[],
    "accepted_events" text[] not null default '{}'::text[],
    "config" jsonb not null default '{}'::jsonb,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."inbound_webhook_endpoints" enable row level security;


  create table "public"."inbound_webhook_events" (
    "id" uuid not null default gen_random_uuid(),
    "endpoint_id" uuid,
    "integration_id" uuid,
    "provider" text not null,
    "event_type" text not null,
    "event_id" text,
    "status" text not null default 'received'::text,
    "headers" jsonb not null default '{}'::jsonb,
    "query_params" jsonb not null default '{}'::jsonb,
    "payload" jsonb not null default '{}'::jsonb,
    "signature_valid" boolean,
    "signature_error" text,
    "processing_status" text not null default 'pending'::text,
    "processing_error" text,
    "related_contact_id" uuid,
    "related_conversation_id" uuid,
    "related_message_id" uuid,
    "received_at" timestamp with time zone not null default now(),
    "processed_at" timestamp with time zone
      );


alter table "public"."inbound_webhook_events" enable row level security;


  create table "public"."integration_agents" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "organization_id" uuid not null,
    "integration_source_id" uuid not null,
    "agent_name" text not null,
    "agent_version" text,
    "machine_name" text,
    "operating_system" text,
    "install_key_hash" text,
    "agent_token_hash" text,
    "status" text not null default 'pending'::text,
    "last_seen_at" timestamp with time zone,
    "last_ip" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "name" text
      );


alter table "public"."integration_agents" enable row level security;


  create table "public"."integration_event_mappings" (
    "id" uuid not null default gen_random_uuid(),
    "integration_id" uuid,
    "provider" text not null,
    "external_event_type" text not null,
    "internal_event_type" text not null,
    "mapping_config" jsonb not null default '{}'::jsonb,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."integration_event_mappings" enable row level security;


  create table "public"."integration_sources" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "organization_id" uuid not null,
    "name" text not null,
    "source_type" text not null,
    "status" text not null default 'active'::text,
    "description" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."integration_sources" enable row level security;


  create table "public"."integration_sync_logs" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "organization_id" uuid,
    "integration_source_id" uuid,
    "agent_id" uuid,
    "sync_run_id" uuid,
    "level" text not null default 'info'::text,
    "message" text not null,
    "context" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."integration_sync_logs" enable row level security;


  create table "public"."integration_sync_runs" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "organization_id" uuid not null,
    "integration_source_id" uuid not null,
    "agent_id" uuid,
    "sync_type" text not null default 'catalog'::text,
    "status" text not null default 'running'::text,
    "started_at" timestamp with time zone not null default now(),
    "finished_at" timestamp with time zone,
    "items_received" integer not null default 0,
    "items_created" integer not null default 0,
    "items_updated" integer not null default 0,
    "items_failed" integer not null default 0,
    "error_message" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."integration_sync_runs" enable row level security;


  create table "public"."internal_messaging_gateways" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "name" text not null,
    "slug" text not null,
    "provider" text not null,
    "base_url" text not null,
    "environment" text not null,
    "status" text not null,
    "version" text,
    "max_sessions" integer not null default 9,
    "last_health_check_at" timestamp with time zone,
    "last_error" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."internal_messaging_gateways" enable row level security;


  create table "public"."job_queue_status" (
    "id" uuid not null default gen_random_uuid(),
    "queue_name" text not null,
    "queue_type" text not null default 'general'::text,
    "status" text not null default 'healthy'::text,
    "pending_jobs" integer not null default 0,
    "running_jobs" integer not null default 0,
    "failed_jobs" integer not null default 0,
    "completed_jobs" integer not null default 0,
    "oldest_pending_at" timestamp with time zone,
    "last_processed_at" timestamp with time zone,
    "metadata" jsonb not null default '{}'::jsonb,
    "checked_at" timestamp with time zone not null default now()
      );


alter table "public"."job_queue_status" enable row level security;


  create table "public"."knowledge_article_versions" (
    "id" uuid not null default gen_random_uuid(),
    "article_id" uuid not null,
    "version" integer not null,
    "title" text not null,
    "summary" text,
    "content" text not null,
    "change_note" text,
    "created_by" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."knowledge_article_versions" enable row level security;


  create table "public"."knowledge_articles" (
    "id" uuid not null default gen_random_uuid(),
    "category_id" uuid,
    "title" text not null,
    "slug" text,
    "summary" text,
    "content" text not null,
    "article_type" text not null default 'article'::text,
    "status" text not null default 'draft'::text,
    "visibility" text not null default 'internal'::text,
    "module" text not null default 'general'::text,
    "tags" text[] not null default '{}'::text[],
    "difficulty" text not null default 'beginner'::text,
    "estimated_read_minutes" integer,
    "version" integer not null default 1,
    "published_at" timestamp with time zone,
    "created_by" text,
    "updated_by" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."knowledge_articles" enable row level security;


  create table "public"."knowledge_categories" (
    "id" uuid not null default gen_random_uuid(),
    "parent_id" uuid,
    "name" text not null,
    "slug" text not null,
    "description" text,
    "category_type" text not null default 'general'::text,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."knowledge_categories" enable row level security;


  create table "public"."knowledge_faqs" (
    "id" uuid not null default gen_random_uuid(),
    "category_id" uuid,
    "article_id" uuid,
    "question" text not null,
    "answer" text not null,
    "module" text not null default 'general'::text,
    "tags" text[] not null default '{}'::text[],
    "sort_order" integer not null default 0,
    "status" text not null default 'published'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."knowledge_faqs" enable row level security;


  create table "public"."knowledge_feedback" (
    "id" uuid not null default gen_random_uuid(),
    "article_id" uuid,
    "faq_id" uuid,
    "user_id" uuid,
    "rating" integer,
    "feedback_text" text,
    "was_helpful" boolean,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."knowledge_feedback" enable row level security;


  create table "public"."maintenance_runs" (
    "id" uuid not null default gen_random_uuid(),
    "maintenance_task_id" uuid,
    "task_name" text not null,
    "task_type" text not null,
    "status" text not null default 'pending'::text,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "result" jsonb not null default '{}'::jsonb,
    "error_message" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."maintenance_runs" enable row level security;


  create table "public"."maintenance_tasks" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "task_type" text not null,
    "frequency" text not null default 'manual'::text,
    "status" text not null default 'active'::text,
    "priority" text not null default 'normal'::text,
    "config" jsonb not null default '{}'::jsonb,
    "last_run_at" timestamp with time zone,
    "next_run_at" timestamp with time zone,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."maintenance_tasks" enable row level security;


  create table "public"."media_access_logs" (
    "id" uuid not null default gen_random_uuid(),
    "media_file_id" uuid,
    "action" text not null,
    "actor" text,
    "ip_address" text,
    "user_agent" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."media_access_logs" enable row level security;


  create table "public"."media_processing_jobs" (
    "id" uuid not null default gen_random_uuid(),
    "media_file_id" uuid,
    "job_type" text not null,
    "status" text not null default 'pending'::text,
    "attempts" integer not null default 0,
    "max_attempts" integer not null default 3,
    "scheduled_at" timestamp with time zone not null default now(),
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "error_message" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."media_processing_jobs" enable row level security;


  create table "public"."message_media" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "organization_id" uuid,
    "channel_id" uuid,
    "message_id" uuid not null,
    "provider" text not null,
    "provider_media_id" text,
    "external_url" text,
    "media_type" text not null,
    "mime_type" text,
    "file_name" text,
    "size_bytes" bigint,
    "duration_seconds" numeric(10,2),
    "storage_bucket" text,
    "storage_path" text,
    "sha256" text,
    "download_status" text not null default 'pending'::text,
    "download_error" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."message_media" enable row level security;


  create table "public"."message_outbox" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "organization_id" uuid not null,
    "channel_id" uuid not null,
    "conversation_id" uuid,
    "message_id" uuid,
    "to_external_id" text not null,
    "body" text not null,
    "message_type" text not null default 'text'::text,
    "status" text not null default 'queued'::text,
    "attempts" integer not null default 0,
    "max_attempts" integer not null default 5,
    "provider_message_id" text,
    "last_error" text,
    "scheduled_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."message_outbox" enable row level security;


  create table "public"."message_transcriptions" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "organization_id" uuid,
    "channel_id" uuid,
    "message_id" uuid not null,
    "media_id" uuid,
    "provider" text not null default 'openai'::text,
    "model" text,
    "language" text,
    "confidence" numeric(5,4),
    "status" text not null default 'pending'::text,
    "transcript_text" text,
    "error_code" text,
    "error_message" text,
    "requested_by" uuid,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."message_transcriptions" enable row level security;


  create table "public"."messaging_policies" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "channel" text not null default 'whatsapp'::text,
    "policy_type" text not null,
    "value" jsonb not null default '{}'::jsonb,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."messaging_policies" enable row level security;


  create table "public"."navigation_items" (
    "id" uuid not null default gen_random_uuid(),
    "parent_id" uuid,
    "label" text not null,
    "translation_key" text,
    "href" text,
    "icon" text,
    "module" text not null default 'general'::text,
    "required_permission" text,
    "sort_order" integer not null default 0,
    "is_external" boolean not null default false,
    "is_active" boolean not null default true,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."navigation_items" enable row level security;


  create table "public"."notification_channels" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "channel_key" text not null,
    "channel_type" text not null default 'in_app'::text,
    "description" text,
    "is_active" boolean not null default true,
    "config" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."notification_channels" enable row level security;


  create table "public"."notification_deliveries" (
    "id" uuid not null default gen_random_uuid(),
    "notification_id" uuid not null,
    "channel_id" uuid,
    "channel_key" text not null,
    "status" text not null default 'pending'::text,
    "recipient" text,
    "payload" jsonb not null default '{}'::jsonb,
    "attempts" integer not null default 0,
    "max_attempts" integer not null default 3,
    "error_message" text,
    "scheduled_at" timestamp with time zone not null default now(),
    "sent_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."notification_deliveries" enable row level security;


  create table "public"."notification_rules" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "module" text not null default 'general'::text,
    "event_type" text not null,
    "condition_config" jsonb not null default '{}'::jsonb,
    "template_key" text,
    "target_type" text not null default 'owner'::text,
    "target_config" jsonb not null default '{}'::jsonb,
    "channels" text[] not null default ARRAY['in_app'::text],
    "priority" text not null default 'normal'::text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."notification_rules" enable row level security;


  create table "public"."notification_templates" (
    "id" uuid not null default gen_random_uuid(),
    "template_key" text not null,
    "name" text not null,
    "description" text,
    "module" text not null default 'general'::text,
    "event_type" text not null,
    "title_template" text not null,
    "body_template" text not null,
    "priority" text not null default 'normal'::text,
    "default_channels" text[] not null default ARRAY['in_app'::text],
    "is_active" boolean not null default true,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."notification_templates" enable row level security;


  create table "public"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "organization_id" uuid,
    "recipient_user_id" uuid,
    "recipient_email" text,
    "recipient_phone" text,
    "template_id" uuid,
    "title" text not null,
    "body" text not null,
    "notification_type" text not null default 'info'::text,
    "module" text not null default 'general'::text,
    "priority" text not null default 'normal'::text,
    "status" text not null default 'unread'::text,
    "related_entity_type" text,
    "related_entity_id" text,
    "action_label" text,
    "action_url" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "scheduled_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "read_at" timestamp with time zone,
    "archived_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."notifications" enable row level security;


  create table "public"."onboarding_flows" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "flow_type" text not null default 'tenant_setup'::text,
    "status" text not null default 'active'::text,
    "target_role" text not null default 'owner'::text,
    "is_default" boolean not null default false,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."onboarding_flows" enable row level security;


  create table "public"."onboarding_steps" (
    "id" uuid not null default gen_random_uuid(),
    "flow_id" uuid not null,
    "title" text not null,
    "description" text,
    "step_key" text not null,
    "step_type" text not null default 'manual'::text,
    "module" text not null default 'general'::text,
    "sort_order" integer not null default 0,
    "is_required" boolean not null default true,
    "is_active" boolean not null default true,
    "action_label" text,
    "action_href" text,
    "validation_type" text not null default 'manual'::text,
    "validation_config" jsonb not null default '{}'::jsonb,
    "help_text" text,
    "video_url" text,
    "docs_url" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."onboarding_steps" enable row level security;


  create table "public"."operational_checklist_items" (
    "id" uuid not null default gen_random_uuid(),
    "checklist_id" uuid not null,
    "title" text not null,
    "description" text,
    "sort_order" integer not null default 0,
    "is_required" boolean not null default true,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."operational_checklist_items" enable row level security;


  create table "public"."operational_checklist_runs" (
    "id" uuid not null default gen_random_uuid(),
    "checklist_id" uuid,
    "status" text not null default 'open'::text,
    "run_date" date not null default CURRENT_DATE,
    "completed_by" text,
    "completed_at" timestamp with time zone,
    "notes" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."operational_checklist_runs" enable row level security;


  create table "public"."operational_checklists" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "checklist_type" text not null default 'daily'::text,
    "status" text not null default 'active'::text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."operational_checklists" enable row level security;


  create table "public"."organization_pipeline_stages" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "pipeline_id" uuid not null,
    "name" text not null,
    "stage_order" integer not null default 1,
    "color" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."organization_pipeline_stages" enable row level security;


  create table "public"."organization_pipelines" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "name" text not null default 'Funil comercial'::text,
    "status" text not null default 'active'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."organization_pipelines" enable row level security;


  create table "public"."organization_products_services" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "name" text not null,
    "category" text,
    "description" text,
    "price_label" text,
    "language" text not null default 'pt-BR'::text,
    "sales_link" text,
    "availability" text,
    "notes" text,
    "status" text not null default 'active'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."organization_products_services" enable row level security;


  create table "public"."organization_profiles" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "short_description" text,
    "tone_of_voice" text,
    "business_rules" jsonb not null default '{}'::jsonb,
    "opening_hours" jsonb not null default '{}'::jsonb,
    "greeting_message" text,
    "away_message" text,
    "commercial_policy" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."organization_profiles" enable row level security;


  create table "public"."organization_tags" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "name" text not null,
    "color" text,
    "description" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."organization_tags" enable row level security;


  create table "public"."outbound_webhook_attempts" (
    "id" uuid not null default gen_random_uuid(),
    "delivery_id" uuid not null,
    "attempt_number" integer not null,
    "status" text not null default 'pending'::text,
    "request_headers" jsonb not null default '{}'::jsonb,
    "request_payload" jsonb not null default '{}'::jsonb,
    "response_status" integer,
    "response_headers" jsonb not null default '{}'::jsonb,
    "response_body" text,
    "error_message" text,
    "duration_ms" integer,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."outbound_webhook_attempts" enable row level security;


  create table "public"."outbound_webhook_deliveries" (
    "id" uuid not null default gen_random_uuid(),
    "webhook_id" uuid,
    "integration_id" uuid,
    "event_type" text not null,
    "event_id" text,
    "status" text not null default 'pending'::text,
    "payload" jsonb not null default '{}'::jsonb,
    "headers" jsonb not null default '{}'::jsonb,
    "attempts" integer not null default 0,
    "max_attempts" integer not null default 3,
    "target_url" text,
    "response_status" integer,
    "response_body" text,
    "error_message" text,
    "scheduled_at" timestamp with time zone not null default now(),
    "sent_at" timestamp with time zone,
    "next_retry_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."outbound_webhook_deliveries" enable row level security;


  create table "public"."outbound_webhooks" (
    "id" uuid not null default gen_random_uuid(),
    "integration_id" uuid,
    "name" text not null,
    "description" text,
    "target_url" text not null,
    "event_types" text[] not null default '{}'::text[],
    "auth_type" text not null default 'none'::text,
    "headers" jsonb not null default '{}'::jsonb,
    "status" text not null default 'active'::text,
    "max_attempts" integer not null default 3,
    "timeout_seconds" integer not null default 15,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."outbound_webhooks" enable row level security;


  create table "public"."payment_methods" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "method_type" text not null,
    "description" text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."payment_methods" enable row level security;


  create table "public"."qa_bugs" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "module" text not null default 'general'::text,
    "feature" text,
    "severity" text not null default 'medium'::text,
    "priority" text not null default 'normal'::text,
    "status" text not null default 'open'::text,
    "environment" text not null default 'production'::text,
    "steps_to_reproduce" text[] not null default '{}'::text[],
    "expected_result" text,
    "actual_result" text,
    "error_message" text,
    "stack_trace" text,
    "related_test_case_id" uuid,
    "related_test_run_id" uuid,
    "related_commit_hash" text,
    "related_deployment_url" text,
    "screenshot_url" text,
    "evidence_url" text,
    "reported_by" text,
    "assigned_to" text,
    "resolved_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."qa_bugs" enable row level security;


  create table "public"."qa_test_cases" (
    "id" uuid not null default gen_random_uuid(),
    "test_plan_id" uuid,
    "title" text not null,
    "description" text,
    "module" text not null default 'general'::text,
    "feature" text,
    "preconditions" text,
    "steps" text[] not null default '{}'::text[],
    "expected_result" text,
    "status" text not null default 'not_run'::text,
    "priority" text not null default 'normal'::text,
    "last_run_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."qa_test_cases" enable row level security;


  create table "public"."qa_test_plans" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "module" text not null default 'general'::text,
    "test_type" text not null default 'manual'::text,
    "status" text not null default 'draft'::text,
    "priority" text not null default 'normal'::text,
    "owner" text,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."qa_test_plans" enable row level security;


  create table "public"."qa_test_results" (
    "id" uuid not null default gen_random_uuid(),
    "test_run_id" uuid not null,
    "test_case_id" uuid,
    "status" text not null,
    "actual_result" text,
    "error_message" text,
    "evidence_url" text,
    "screenshot_url" text,
    "executed_by" text,
    "executed_at" timestamp with time zone not null default now(),
    "metadata" jsonb not null default '{}'::jsonb
      );


alter table "public"."qa_test_results" enable row level security;


  create table "public"."qa_test_runs" (
    "id" uuid not null default gen_random_uuid(),
    "test_plan_id" uuid,
    "name" text not null,
    "environment" text not null default 'production'::text,
    "status" text not null default 'running'::text,
    "total_cases" integer not null default 0,
    "passed_cases" integer not null default 0,
    "failed_cases" integer not null default 0,
    "blocked_cases" integer not null default 0,
    "skipped_cases" integer not null default 0,
    "executed_by" text,
    "started_at" timestamp with time zone not null default now(),
    "finished_at" timestamp with time zone,
    "notes" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."qa_test_runs" enable row level security;


  create table "public"."reminders" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "event_id" uuid,
    "task_id" uuid,
    "invoice_id" uuid,
    "recipient_user_id" uuid,
    "title" text not null,
    "body" text,
    "reminder_type" text not null default 'in_app'::text,
    "scheduled_at" timestamp with time zone not null,
    "sent_at" timestamp with time zone,
    "status" text not null default 'pending'::text,
    "priority" text not null default 'normal'::text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."reminders" enable row level security;


  create table "public"."saved_searches" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "app_user_id" uuid,
    "name" text not null,
    "description" text,
    "query_text" text,
    "filters" jsonb not null default '{}'::jsonb,
    "module" text not null default 'global'::text,
    "is_shared" boolean not null default false,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."saved_searches" enable row level security;


  create table "public"."search_queries" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "app_user_id" uuid,
    "query_text" text not null,
    "module_filter" text,
    "entity_type_filter" text,
    "results_count" integer not null default 0,
    "clicked_entity_type" text,
    "clicked_entity_id" text,
    "ip_address" text,
    "user_agent" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."search_queries" enable row level security;


  create table "public"."search_settings" (
    "id" uuid not null default gen_random_uuid(),
    "setting_key" text not null,
    "setting_value" jsonb not null default '{}'::jsonb,
    "module" text not null default 'search'::text,
    "description" text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."search_settings" enable row level security;


  create table "public"."security_events" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "session_id" uuid,
    "event_type" text not null,
    "severity" text not null default 'info'::text,
    "title" text not null,
    "description" text,
    "ip_address" text,
    "user_agent" text,
    "entity_type" text,
    "entity_id" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "status" text not null default 'open'::text,
    "occurred_at" timestamp with time zone not null default now(),
    "resolved_at" timestamp with time zone
      );


alter table "public"."security_events" enable row level security;


  create table "public"."security_rules" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "rule_type" text not null,
    "config" jsonb not null default '{}'::jsonb,
    "severity" text not null default 'medium'::text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."security_rules" enable row level security;


  create table "public"."setup_answers" (
    "id" uuid not null default gen_random_uuid(),
    "session_id" uuid not null,
    "question_id" uuid not null,
    "tenant_id" uuid,
    "answer_value" jsonb not null default '{}'::jsonb,
    "answered_by" text,
    "answered_at" timestamp with time zone not null default now()
      );


alter table "public"."setup_answers" enable row level security;


  create table "public"."setup_assistant_sessions" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "app_user_id" uuid,
    "session_type" text not null default 'initial_setup'::text,
    "status" text not null default 'active'::text,
    "current_module" text,
    "current_step_key" text,
    "answers" jsonb not null default '{}'::jsonb,
    "recommendations" jsonb not null default '{}'::jsonb,
    "started_at" timestamp with time zone not null default now(),
    "finished_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."setup_assistant_sessions" enable row level security;


  create table "public"."setup_questions" (
    "id" uuid not null default gen_random_uuid(),
    "question_key" text not null,
    "module" text not null default 'general'::text,
    "question_text" text not null,
    "helper_text" text,
    "answer_type" text not null default 'text'::text,
    "options" jsonb not null default '[]'::jsonb,
    "is_required" boolean not null default false,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."setup_questions" enable row level security;


  create table "public"."setup_validation_checks" (
    "id" uuid not null default gen_random_uuid(),
    "check_key" text not null,
    "name" text not null,
    "description" text,
    "module" text not null default 'general'::text,
    "check_type" text not null default 'manual'::text,
    "target" text,
    "expected_result" text,
    "query_or_endpoint" text,
    "severity" text not null default 'normal'::text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."setup_validation_checks" enable row level security;


  create table "public"."setup_validation_results" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "check_id" uuid,
    "status" text not null default 'not_checked'::text,
    "result_message" text,
    "result_payload" jsonb not null default '{}'::jsonb,
    "checked_by" text,
    "checked_at" timestamp with time zone not null default now()
      );


alter table "public"."setup_validation_results" enable row level security;


  create table "public"."subscription_plans" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "description" text,
    "plan_type" text not null default 'monthly'::text,
    "price" numeric(12,2) not null default 0,
    "currency" text not null default 'BRL'::text,
    "billing_interval" text not null default 'monthly'::text,
    "max_users" integer,
    "max_contacts" integer,
    "max_messages_per_month" integer,
    "max_campaigns_per_month" integer,
    "max_ai_runs_per_month" integer,
    "max_storage_mb" integer,
    "features" jsonb not null default '{}'::jsonb,
    "limits" jsonb not null default '{}'::jsonb,
    "is_public" boolean not null default true,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."subscription_plans" enable row level security;


  create table "public"."support_queue_agents" (
    "id" uuid not null default gen_random_uuid(),
    "queue_id" uuid not null,
    "user_id" uuid not null,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."support_queue_agents" enable row level security;


  create table "public"."support_queues" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "channel" text not null default 'whatsapp'::text,
    "priority" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."support_queues" enable row level security;


  create table "public"."support_scripts" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "script_type" text not null default 'support'::text,
    "opening_text" text,
    "qualification_questions" text[] not null default '{}'::text[],
    "main_script" text not null,
    "objection_responses" jsonb not null default '{}'::jsonb,
    "closing_text" text,
    "module" text not null default 'support'::text,
    "tags" text[] not null default '{}'::text[],
    "status" text not null default 'active'::text,
    "is_active" boolean not null default true,
    "created_by" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."support_scripts" enable row level security;


  create table "public"."supported_locales" (
    "id" uuid not null default gen_random_uuid(),
    "locale_code" text not null,
    "language_name" text not null,
    "native_name" text not null,
    "direction" text not null default 'ltr'::text,
    "is_default" boolean not null default false,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."supported_locales" enable row level security;


  create table "public"."system_alerts" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "alert_type" text not null default 'system'::text,
    "severity" text not null default 'info'::text,
    "status" text not null default 'open'::text,
    "source" text,
    "module" text,
    "related_entity_type" text,
    "related_entity_id" text,
    "assigned_to" uuid,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "acknowledged_at" timestamp with time zone,
    "resolved_at" timestamp with time zone
      );


alter table "public"."system_alerts" enable row level security;


  create table "public"."system_health_checks" (
    "id" uuid not null default gen_random_uuid(),
    "check_name" text not null,
    "check_type" text not null,
    "target" text not null,
    "status" text not null default 'unknown'::text,
    "severity" text not null default 'info'::text,
    "response_time_ms" integer,
    "checked_at" timestamp with time zone not null default now(),
    "details" jsonb not null default '{}'::jsonb,
    "error_message" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."system_health_checks" enable row level security;


  create table "public"."system_messages" (
    "id" uuid not null default gen_random_uuid(),
    "message_key" text not null,
    "module" text not null default 'general'::text,
    "title" text,
    "body" text not null,
    "message_type" text not null default 'info'::text,
    "is_dismissible" boolean not null default true,
    "is_active" boolean not null default true,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."system_messages" enable row level security;


  create table "public"."tenant_domains" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "organization_id" uuid,
    "domain" text not null,
    "domain_type" text not null default 'custom'::text,
    "status" text not null default 'pending'::text,
    "ssl_status" text not null default 'pending'::text,
    "verification_token" text,
    "verified_at" timestamp with time zone,
    "dns_instructions" jsonb not null default '{}'::jsonb,
    "is_primary" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."tenant_domains" enable row level security;


  create table "public"."tenant_navigation_overrides" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "navigation_item_id" uuid not null,
    "custom_label" text,
    "custom_href" text,
    "is_visible" boolean not null default true,
    "sort_order" integer,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."tenant_navigation_overrides" enable row level security;


  create table "public"."tenant_onboarding_progress" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "flow_id" uuid not null,
    "status" text not null default 'not_started'::text,
    "total_steps" integer not null default 0,
    "completed_steps" integer not null default 0,
    "skipped_steps" integer not null default 0,
    "required_steps" integer not null default 0,
    "completed_required_steps" integer not null default 0,
    "progress_percent" numeric(5,2) not null default 0,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "last_step_id" uuid,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."tenant_onboarding_progress" enable row level security;


  create table "public"."tenant_onboarding_step_status" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "flow_id" uuid not null,
    "step_id" uuid not null,
    "status" text not null default 'pending'::text,
    "completed_by" text,
    "completed_at" timestamp with time zone,
    "skipped_at" timestamp with time zone,
    "validation_status" text not null default 'not_checked'::text,
    "validation_message" text,
    "validation_payload" jsonb not null default '{}'::jsonb,
    "validated_at" timestamp with time zone,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."tenant_onboarding_step_status" enable row level security;


  create table "public"."tenant_settings" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "setting_key" text not null,
    "setting_value" jsonb not null default '{}'::jsonb,
    "module" text not null default 'general'::text,
    "is_public" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."tenant_settings" enable row level security;


  create table "public"."tenant_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "plan_id" uuid,
    "status" text not null default 'trial'::text,
    "started_at" timestamp with time zone not null default now(),
    "trial_ends_at" timestamp with time zone,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "price" numeric(12,2),
    "currency" text not null default 'BRL'::text,
    "external_subscription_id" text,
    "payment_provider" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."tenant_subscriptions" enable row level security;


  create table "public"."tenant_ui_preferences" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "organization_id" uuid,
    "theme_id" uuid,
    "locale_code" text,
    "app_name" text,
    "page_title" text,
    "sidebar_collapsed" boolean not null default false,
    "show_branding" boolean not null default true,
    "show_powered_by" boolean not null default true,
    "custom_logo_url" text,
    "custom_icon_url" text,
    "custom_favicon_url" text,
    "custom_primary_color" text,
    "custom_secondary_color" text,
    "custom_accent_color" text,
    "custom_settings" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."tenant_ui_preferences" enable row level security;


  create table "public"."tenant_usage_metrics" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "metric_month" date not null,
    "users_count" integer not null default 0,
    "contacts_count" integer not null default 0,
    "messages_count" integer not null default 0,
    "campaigns_count" integer not null default 0,
    "ai_runs_count" integer not null default 0,
    "storage_used_mb" numeric(12,2) not null default 0,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."tenant_usage_metrics" enable row level security;


  create table "public"."training_lessons" (
    "id" uuid not null default gen_random_uuid(),
    "program_id" uuid not null,
    "article_id" uuid,
    "title" text not null,
    "description" text,
    "lesson_type" text not null default 'article'::text,
    "content" text,
    "video_url" text,
    "file_url" text,
    "sort_order" integer not null default 0,
    "estimated_duration_minutes" integer,
    "is_required" boolean not null default true,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."training_lessons" enable row level security;


  create table "public"."training_programs" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "program_type" text not null default 'internal'::text,
    "target_role" text,
    "status" text not null default 'draft'::text,
    "estimated_duration_minutes" integer,
    "is_required" boolean not null default false,
    "is_active" boolean not null default true,
    "created_by" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."training_programs" enable row level security;


  create table "public"."training_progress" (
    "id" uuid not null default gen_random_uuid(),
    "program_id" uuid not null,
    "lesson_id" uuid,
    "user_id" uuid,
    "status" text not null default 'not_started'::text,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "progress_percent" numeric(5,2) not null default 0,
    "score" numeric(5,2),
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."training_progress" enable row level security;


  create table "public"."transcription_jobs" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "organization_id" uuid,
    "channel_id" uuid,
    "message_id" uuid not null,
    "media_id" uuid not null,
    "transcription_id" uuid,
    "status" text not null default 'queued'::text,
    "priority" integer not null default 100,
    "attempt_count" integer not null default 0,
    "max_attempts" integer not null default 3,
    "scheduled_at" timestamp with time zone not null default now(),
    "locked_at" timestamp with time zone,
    "locked_by" text,
    "last_error" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."transcription_jobs" enable row level security;


  create table "public"."translation_keys" (
    "id" uuid not null default gen_random_uuid(),
    "key" text not null,
    "module" text not null default 'general'::text,
    "description" text,
    "default_text" text,
    "is_system" boolean not null default false,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."translation_keys" enable row level security;


  create table "public"."translations" (
    "id" uuid not null default gen_random_uuid(),
    "translation_key_id" uuid not null,
    "locale_code" text not null,
    "text_value" text not null,
    "status" text not null default 'published'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."translations" enable row level security;


  create table "public"."ui_themes" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "description" text,
    "theme_type" text not null default 'light'::text,
    "primary_color" text not null default '#0f172a'::text,
    "secondary_color" text not null default '#10b981'::text,
    "accent_color" text not null default '#22c55e'::text,
    "background_color" text not null default '#ffffff'::text,
    "foreground_color" text not null default '#0f172a'::text,
    "muted_color" text not null default '#64748b'::text,
    "border_color" text not null default '#e2e8f0'::text,
    "logo_url" text,
    "icon_url" text,
    "favicon_url" text,
    "login_background_url" text,
    "custom_css" text,
    "is_default" boolean not null default false,
    "is_active" boolean not null default true,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."ui_themes" enable row level security;


  create table "public"."user_calendar_preferences" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "default_calendar_id" uuid,
    "timezone" text not null default 'America/Sao_Paulo'::text,
    "working_days" integer[] not null default ARRAY[1, 2, 3, 4, 5],
    "working_start" time without time zone not null default '08:00:00'::time without time zone,
    "working_end" time without time zone not null default '18:00:00'::time without time zone,
    "default_reminder_minutes" integer[] not null default ARRAY[15],
    "show_completed_events" boolean not null default true,
    "show_cancelled_events" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."user_calendar_preferences" enable row level security;


  create table "public"."user_notification_preferences" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "module" text not null default 'general'::text,
    "notification_type" text not null default 'info'::text,
    "in_app_enabled" boolean not null default true,
    "email_enabled" boolean not null default false,
    "whatsapp_enabled" boolean not null default false,
    "webhook_enabled" boolean not null default false,
    "quiet_hours_enabled" boolean not null default false,
    "quiet_hours_start" time without time zone,
    "quiet_hours_end" time without time zone,
    "timezone" text not null default 'America/Sao_Paulo'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."user_notification_preferences" enable row level security;


  create table "public"."user_sessions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "session_token_hash" text,
    "status" text not null default 'active'::text,
    "ip_address" text,
    "user_agent" text,
    "device_type" text,
    "browser" text,
    "os" text,
    "location" text,
    "started_at" timestamp with time zone not null default now(),
    "last_seen_at" timestamp with time zone not null default now(),
    "ended_at" timestamp with time zone,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."user_sessions" enable row level security;


  create table "public"."whatsapp_audio_transcriptions" (
    "id" uuid not null default gen_random_uuid(),
    "media_file_id" uuid not null,
    "message_id" uuid,
    "conversation_id" uuid,
    "contact_id" uuid,
    "provider" text not null default 'openai'::text,
    "model" text,
    "language" text default 'pt'::text,
    "transcription" text not null,
    "confidence" numeric(5,2),
    "status" text not null default 'completed'::text,
    "error_message" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."whatsapp_audio_transcriptions" enable row level security;


  create table "public"."whatsapp_media_text_extractions" (
    "id" uuid not null default gen_random_uuid(),
    "media_file_id" uuid not null,
    "message_id" uuid,
    "conversation_id" uuid,
    "contact_id" uuid,
    "extraction_type" text not null default 'ocr'::text,
    "provider" text not null default 'openai'::text,
    "model" text,
    "extracted_text" text,
    "extracted_metadata" jsonb not null default '{}'::jsonb,
    "status" text not null default 'completed'::text,
    "error_message" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."whatsapp_media_text_extractions" enable row level security;


  create table "public"."white_label_brands" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "organization_id" uuid,
    "brand_name" text not null,
    "app_name" text,
    "logo_url" text,
    "icon_url" text,
    "favicon_url" text,
    "primary_color" text,
    "secondary_color" text,
    "accent_color" text,
    "login_background_url" text,
    "support_email" text,
    "support_phone" text,
    "support_whatsapp" text,
    "terms_url" text,
    "privacy_url" text,
    "status" text not null default 'active'::text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."white_label_brands" enable row level security;

alter table "public"."billing_checkout_sessions" add column "expires_at" timestamp with time zone;

alter table "public"."billing_checkout_sessions" add column "paid_at" timestamp with time zone;

alter table "public"."billing_checkout_sessions" add column "plan_id" uuid;

alter table "public"."billing_checkout_sessions" add column "provider_checkout_id" text;

alter table "public"."billing_checkout_sessions" add column "provider_subscription_id" text;

alter table "public"."billing_checkout_sessions" alter column "base_amount" set data type numeric(12,2) using "base_amount"::numeric(12,2);

alter table "public"."billing_checkout_sessions" alter column "billing_provider" set default 'asaas'::text;

alter table "public"."billing_checkout_sessions" alter column "billing_provider" set not null;

alter table "public"."billing_checkout_sessions" alter column "plan_slug" drop not null;

alter table "public"."billing_checkout_sessions" alter column "setup_amount" set data type numeric(12,2) using "setup_amount"::numeric(12,2);

alter table "public"."billing_checkout_sessions" alter column "total_amount" set data type numeric(12,2) using "total_amount"::numeric(12,2);

alter table "public"."billing_subscriptions" add column "ai_addon_enabled" boolean not null default false;

alter table "public"."billing_subscriptions" add column "base_amount" numeric(12,2) not null default 0;

alter table "public"."billing_subscriptions" add column "billing_provider" text not null default 'asaas'::text;

alter table "public"."billing_subscriptions" add column "cancellation_reason" text;

alter table "public"."billing_subscriptions" add column "cancelled_at" timestamp with time zone;

alter table "public"."billing_subscriptions" add column "current_period_end" timestamp with time zone;

alter table "public"."billing_subscriptions" add column "current_period_start" timestamp with time zone not null default now();

alter table "public"."billing_subscriptions" add column "extra_users" integer not null default 0;

alter table "public"."billing_subscriptions" add column "extra_whatsapp_connections" integer not null default 0;

alter table "public"."billing_subscriptions" add column "provider_customer_id" text;

alter table "public"."billing_subscriptions" add column "provider_payment_id" text;

alter table "public"."billing_subscriptions" add column "provider_subscription_id" text;

alter table "public"."billing_subscriptions" add column "raw_payload" jsonb not null default '{}'::jsonb;

alter table "public"."billing_subscriptions" add column "setup_amount" numeric(12,2) not null default 0;

alter table "public"."billing_subscriptions" add column "started_at" timestamp with time zone not null default now();

alter table "public"."billing_subscriptions" alter column "organization_id" drop not null;

alter table "public"."billing_subscriptions" alter column "tenant_id" drop not null;

alter table "public"."billing_subscriptions" alter column "total_amount" set data type numeric(12,2) using "total_amount"::numeric(12,2);

alter table "public"."channels" add column "external_instance" text;

alter table "public"."channels" add column "gateway_id" uuid;

alter table "public"."channels" add column "transcription_enabled" boolean not null default false;

alter table "public"."crm_contact_notes" add column "organization_id" uuid;

alter table "public"."crm_contact_notes" add column "tenant_id" uuid;

alter table "public"."crm_contacts" add column "organization_id" uuid;

alter table "public"."crm_contacts" add column "tenant_id" uuid;

alter table "public"."finance_payments" add column "cancelled_at" timestamp with time zone;

alter table "public"."finance_payments" add column "contact_id" uuid;

alter table "public"."finance_payments" add column "deal_id" uuid;

alter table "public"."finance_payments" add column "finance_account_id" uuid;

alter table "public"."finance_payments" add column "installment_id" uuid;

alter table "public"."finance_payments" add column "invoice_id" uuid;

alter table "public"."finance_payments" add column "notes" text;

alter table "public"."finance_payments" add column "organization_id" uuid;

alter table "public"."finance_payments" add column "payment_method_id" uuid;

alter table "public"."finance_payments" add column "proof_url" text;

alter table "public"."finance_payments" add column "proposal_id" uuid;

alter table "public"."finance_payments" add column "receipt_url" text;

alter table "public"."finance_payments" add column "refund_status" text default 'none'::text;

alter table "public"."finance_payments" add column "refunded_at" timestamp with time zone;

alter table "public"."finance_payments" add column "tenant_id" uuid;

alter table "public"."finance_payments" alter column "amount" drop default;

alter table "public"."finance_payments" alter column "amount" set data type numeric(12,2) using "amount"::numeric(12,2);

alter table "public"."group_contact_list_items" add column "organization_id" uuid;

alter table "public"."group_contact_list_items" add column "review_status" text not null default 'pending'::text;

alter table "public"."group_contact_list_items" add column "tenant_id" uuid;

alter table "public"."group_contact_lists" add column "organization_id" uuid;

alter table "public"."group_contact_lists" add column "tenant_id" uuid;

alter table "public"."provider_events" add column "channel_id" uuid;

alter table "public"."provider_events" alter column "processed_payload" set default '{}'::jsonb;

alter table "public"."provider_events" alter column "processed_payload" set not null;

alter table "public"."quick_replies" add column "language" text not null default 'pt-BR'::text;

alter table "public"."quick_replies" add column "organization_id" uuid;

alter table "public"."quick_replies" add column "tags" text[] not null default '{}'::text[];

alter table "public"."quick_replies" add column "tenant_id" uuid;

alter table "public"."quick_replies" add column "usage_count" integer not null default 0;

alter table "public"."social_accounts" add column "channel_id" uuid;

alter table "public"."whatsapp_connections" add column "connection_key" text;

alter table "public"."whatsapp_connections" add column "display_name" text;

update public.whatsapp_connections
set
  connection_key = coalesce(nullif(session_id, ''), id::text),
  display_name = coalesce(nullif(name, ''), display_name)
where connection_key is null;

alter table "public"."whatsapp_connections" alter column "connection_key" set not null;

alter table "public"."whatsapp_connections" drop column "name";

alter table "public"."whatsapp_connections" drop column "session_id";

alter table "public"."whatsapp_connections" add column "is_active" boolean not null default true;

alter table "public"."whatsapp_connections" add column "last_connected_at" timestamp with time zone;

alter table "public"."whatsapp_connections" add column "last_seen_at" timestamp with time zone;

alter table "public"."whatsapp_connections" add column "phone_number" text;

alter table "public"."whatsapp_connections" add column "provider" text not null default 'whatsapp_web'::text;

delete from public.whatsapp_connections
where tenant_id is null or organization_id is null;

alter table "public"."whatsapp_connections" alter column "organization_id" set not null;

alter table "public"."whatsapp_connections" alter column "tenant_id" set not null;

alter table "public"."whatsapp_conversation_events" alter column "event_source" set default 'system'::text;

alter table "public"."whatsapp_conversation_events" alter column "event_source" set not null;

alter table "public"."whatsapp_conversations" add column "crm_stage" text not null default 'novo'::text;

alter table "public"."whatsapp_conversations" add column "next_follow_up_at" timestamp with time zone;

alter table "public"."whatsapp_groups" add column "organization_id" uuid;

alter table "public"."whatsapp_groups" add column "tenant_id" uuid;

alter table "public"."whatsapp_media_files" add column "checksum" text;

alter table "public"."whatsapp_media_files" add column "contact_id" uuid;

alter table "public"."whatsapp_media_files" add column "downloaded_at" timestamp with time zone;

alter table "public"."whatsapp_media_files" add column "file_extension" text;

alter table "public"."whatsapp_media_files" add column "processed_at" timestamp with time zone;

alter table "public"."whatsapp_media_files" add column "storage_bucket" text;

alter table "public"."whatsapp_media_files" add column "storage_path" text;

alter table "public"."whatsapp_media_files" add column "transcription" text;

alter table "public"."whatsapp_media_files" alter column "direction" set default 'inbound'::text;

alter table "public"."whatsapp_media_files" alter column "direction" set not null;

alter table "public"."whatsapp_media_files" alter column "media_type" set not null;

alter table "public"."whatsapp_messages" add column "delivered_at" timestamp with time zone;

alter table "public"."whatsapp_messages" add column "delivery_status" text;

alter table "public"."whatsapp_messages" add column "failed_at" timestamp with time zone;

alter table "public"."whatsapp_messages" add column "failure_code" text;

alter table "public"."whatsapp_messages" add column "failure_message" text;

alter table "public"."whatsapp_messages" add column "media_duration_seconds" numeric(10,2);

alter table "public"."whatsapp_messages" add column "media_kind" text;

alter table "public"."whatsapp_messages" add column "media_mime_type" text;

alter table "public"."whatsapp_messages" add column "media_size_bytes" bigint;

alter table "public"."whatsapp_messages" add column "media_status" text default 'none'::text;

alter table "public"."whatsapp_messages" add column "media_storage_bucket" text;

alter table "public"."whatsapp_messages" add column "media_storage_path" text;

alter table "public"."whatsapp_messages" add column "outbox_id" uuid;

alter table "public"."whatsapp_messages" add column "read_at" timestamp with time zone;

alter table "public"."whatsapp_messages" add column "sent_at" timestamp with time zone;

alter table "public"."whatsapp_messages" add column "transcribed_at" timestamp with time zone;

alter table "public"."whatsapp_messages" add column "transcription_error" text;

alter table "public"."whatsapp_messages" add column "transcription_language" text;

alter table "public"."whatsapp_messages" add column "transcription_status" text default 'none'::text;

alter table "public"."whatsapp_messages" add column "transcription_text" text;

alter table "public"."whatsapp_messages" alter column "revoked_payload" set default '{}'::jsonb;

alter table "public"."whatsapp_messages" alter column "revoked_payload" set not null;

alter table "public"."whatsapp_shared_contacts" add column "contact_id" uuid;

alter table "public"."whatsapp_shared_contacts" add column "imported_contact_id" uuid;

alter table "public"."whatsapp_shared_locations" add column "contact_id" uuid;

alter table "public"."whatsapp_shared_locations" alter column "latitude" set data type numeric(12,8) using "latitude"::numeric(12,8);

alter table "public"."whatsapp_shared_locations" alter column "longitude" set data type numeric(12,8) using "longitude"::numeric(12,8);

CREATE UNIQUE INDEX access_attempts_pkey ON public.access_attempts USING btree (id);

CREATE UNIQUE INDEX agent_automation_cooldown_conversation_id_key ON public.agent_automation_cooldown USING btree (conversation_id);

CREATE UNIQUE INDEX agent_automation_cooldown_pkey ON public.agent_automation_cooldown USING btree (id);

CREATE UNIQUE INDEX agent_automation_jobs_pkey ON public.agent_automation_jobs USING btree (id);

CREATE UNIQUE INDEX agent_catalog_products_pkey ON public.agent_catalog_products USING btree (id);

CREATE UNIQUE INDEX agent_catalog_products_unique_source ON public.agent_catalog_products USING btree (tenant_id, source_code, external_id);

CREATE UNIQUE INDEX agent_connector_types_code_key ON public.agent_connector_types USING btree (code);

CREATE UNIQUE INDEX agent_connector_types_pkey ON public.agent_connector_types USING btree (id);

CREATE UNIQUE INDEX agent_dialog_templates_pkey ON public.agent_dialog_templates USING btree (id);

CREATE UNIQUE INDEX agent_installations_pkey ON public.agent_installations USING btree (id);

CREATE UNIQUE INDEX agent_presence_pkey ON public.agent_presence USING btree (id);

CREATE UNIQUE INDEX agent_presence_user_id_key ON public.agent_presence USING btree (user_id);

CREATE UNIQUE INDEX agent_sync_runs_pkey ON public.agent_sync_runs USING btree (id);

CREATE UNIQUE INDEX ai_conversation_summaries_pkey ON public.ai_conversation_summaries USING btree (id);

CREATE UNIQUE INDEX ai_extracted_customer_data_pkey ON public.ai_extracted_customer_data USING btree (id);

CREATE UNIQUE INDEX ai_lead_scores_pkey ON public.ai_lead_scores USING btree (id);

CREATE UNIQUE INDEX ai_objections_pkey ON public.ai_objections USING btree (id);

CREATE UNIQUE INDEX ai_prompt_templates_name_key ON public.ai_prompt_templates USING btree (name);

CREATE UNIQUE INDEX ai_prompt_templates_pkey ON public.ai_prompt_templates USING btree (id);

CREATE UNIQUE INDEX ai_reply_suggestions_pkey ON public.ai_reply_suggestions USING btree (id);

CREATE UNIQUE INDEX ai_runs_pkey ON public.ai_runs USING btree (id);

CREATE UNIQUE INDEX api_tokens_name_key ON public.api_tokens USING btree (name);

CREATE UNIQUE INDEX api_tokens_pkey ON public.api_tokens USING btree (id);

CREATE UNIQUE INDEX app_permissions_code_key ON public.app_permissions USING btree (code);

CREATE UNIQUE INDEX app_permissions_pkey ON public.app_permissions USING btree (id);

CREATE UNIQUE INDEX app_settings_pkey ON public.app_settings USING btree (id);

CREATE UNIQUE INDEX app_settings_setting_key_key ON public.app_settings USING btree (setting_key);

CREATE UNIQUE INDEX app_user_permissions_pkey ON public.app_user_permissions USING btree (id);

CREATE UNIQUE INDEX app_user_permissions_user_id_permission_id_key ON public.app_user_permissions USING btree (user_id, permission_id);

CREATE UNIQUE INDEX application_logs_pkey ON public.application_logs USING btree (id);

CREATE UNIQUE INDEX audit_trail_pkey ON public.audit_trail USING btree (id);

CREATE UNIQUE INDEX automation_action_logs_pkey ON public.automation_action_logs USING btree (id);

CREATE UNIQUE INDEX automation_actions_pkey ON public.automation_actions USING btree (id);

CREATE UNIQUE INDEX automation_cooldowns_cooldown_key_external_chat_id_key ON public.automation_cooldowns USING btree (cooldown_key, external_chat_id);

CREATE UNIQUE INDEX automation_cooldowns_pkey ON public.automation_cooldowns USING btree (id);

CREATE UNIQUE INDEX automation_flows_name_key ON public.automation_flows USING btree (name);

CREATE UNIQUE INDEX automation_flows_pkey ON public.automation_flows USING btree (id);

CREATE UNIQUE INDEX automation_runs_pkey ON public.automation_runs USING btree (id);

CREATE UNIQUE INDEX automation_triggers_pkey ON public.automation_triggers USING btree (id);

CREATE UNIQUE INDEX backup_configs_name_key ON public.backup_configs USING btree (name);

CREATE UNIQUE INDEX backup_configs_pkey ON public.backup_configs USING btree (id);

CREATE UNIQUE INDEX backup_runs_pkey ON public.backup_runs USING btree (id);

CREATE INDEX billing_checkout_sessions_org_status_idx ON public.billing_checkout_sessions USING btree (organization_id, status);

CREATE INDEX billing_checkout_sessions_provider_checkout_idx ON public.billing_checkout_sessions USING btree (billing_provider, provider_checkout_id);

CREATE INDEX billing_checkout_sessions_provider_payment_idx ON public.billing_checkout_sessions USING btree (billing_provider, provider_payment_id);

CREATE INDEX billing_plan_price_rules_active_idx ON public.billing_plan_price_rules USING btree (is_active, plan_slug);

CREATE UNIQUE INDEX billing_plan_price_rules_pkey ON public.billing_plan_price_rules USING btree (id);

CREATE UNIQUE INDEX billing_plan_price_rules_plan_slug_key ON public.billing_plan_price_rules USING btree (plan_slug);

CREATE UNIQUE INDEX billing_subscriptions_checkout_session_key ON public.billing_subscriptions USING btree (checkout_session_id) WHERE (checkout_session_id IS NOT NULL);

CREATE INDEX billing_subscriptions_org_status_idx ON public.billing_subscriptions USING btree (organization_id, status, created_at DESC);

CREATE INDEX billing_subscriptions_tenant_status_idx ON public.billing_subscriptions USING btree (tenant_id, status, created_at DESC);

CREATE UNIQUE INDEX blocked_contacts_pkey ON public.blocked_contacts USING btree (id);

CREATE UNIQUE INDEX business_holidays_holiday_date_name_key ON public.business_holidays USING btree (holiday_date, name);

CREATE UNIQUE INDEX business_holidays_pkey ON public.business_holidays USING btree (id);

CREATE UNIQUE INDEX business_hours_pkey ON public.business_hours USING btree (id);

CREATE UNIQUE INDEX calendar_event_participants_pkey ON public.calendar_event_participants USING btree (id);

CREATE UNIQUE INDEX calendar_event_templates_name_key ON public.calendar_event_templates USING btree (name);

CREATE UNIQUE INDEX calendar_event_templates_pkey ON public.calendar_event_templates USING btree (id);

CREATE UNIQUE INDEX calendar_events_pkey ON public.calendar_events USING btree (id);

CREATE UNIQUE INDEX calendars_pkey ON public.calendars USING btree (id);

CREATE UNIQUE INDEX catalog_categories_name_key ON public.catalog_categories USING btree (name);

CREATE UNIQUE INDEX catalog_categories_pkey ON public.catalog_categories USING btree (id);

CREATE UNIQUE INDEX catalog_categories_slug_key ON public.catalog_categories USING btree (slug);

CREATE UNIQUE INDEX catalog_items_pkey ON public.catalog_items USING btree (id);

CREATE UNIQUE INDEX catalog_items_slug_key ON public.catalog_items USING btree (slug);

CREATE INDEX channels_gateway_id_idx ON public.channels USING btree (gateway_id);

CREATE UNIQUE INDEX channels_provider_external_instance_uniq ON public.channels USING btree (provider, external_instance) WHERE (external_instance IS NOT NULL);

CREATE UNIQUE INDEX channels_provider_phone_number_id_uniq ON public.channels USING btree (provider, phone_number_id) WHERE (phone_number_id IS NOT NULL);

CREATE INDEX channels_tenant_gateway_id_idx ON public.channels USING btree (tenant_id, gateway_id);

CREATE UNIQUE INDEX channels_tenant_gateway_session_uniq ON public.channels USING btree (tenant_id, gateway_id, session_id) WHERE ((gateway_id IS NOT NULL) AND (session_id IS NOT NULL));

CREATE UNIQUE INDEX commercial_agent_profiles_pkey ON public.commercial_agent_profiles USING btree (id);

CREATE INDEX commercial_agent_profiles_scope_idx ON public.commercial_agent_profiles USING btree (tenant_id, organization_id, status);

CREATE UNIQUE INDEX commercial_agent_profiles_scope_name_uniq ON public.commercial_agent_profiles USING btree (tenant_id, organization_id, name);

CREATE UNIQUE INDEX commercial_analysis_dedupe_uniq ON public.commercial_conversation_analysis USING btree (tenant_id, organization_id, conversation_id, conversation_content_hash, profile_version, prompt_version, model) WHERE ((status = 'generated'::text) AND (conversation_content_hash IS NOT NULL) AND (profile_version IS NOT NULL) AND (prompt_version IS NOT NULL) AND (model IS NOT NULL));

CREATE INDEX commercial_analysis_usage_idx ON public.commercial_conversation_analysis USING btree (tenant_id, organization_id, request_status, created_at DESC);

CREATE UNIQUE INDEX commercial_conversation_analysis_pkey ON public.commercial_conversation_analysis USING btree (id);

CREATE INDEX commercial_conversation_analysis_scope_idx ON public.commercial_conversation_analysis USING btree (tenant_id, organization_id, conversation_id, created_at DESC);

CREATE UNIQUE INDEX commercial_follow_ups_pkey ON public.commercial_follow_ups USING btree (id);

CREATE INDEX commercial_follow_ups_scope_idx ON public.commercial_follow_ups USING btree (tenant_id, organization_id, status, due_at);

CREATE UNIQUE INDEX commercial_offer_items_offer_id_catalog_item_id_key ON public.commercial_offer_items USING btree (offer_id, catalog_item_id);

CREATE UNIQUE INDEX commercial_offer_items_pkey ON public.commercial_offer_items USING btree (id);

CREATE UNIQUE INDEX commercial_offers_pkey ON public.commercial_offers USING btree (id);

CREATE UNIQUE INDEX commercial_opportunities_pkey ON public.commercial_opportunities USING btree (id);

CREATE INDEX commercial_opportunities_scope_idx ON public.commercial_opportunities USING btree (tenant_id, organization_id, status, stage, updated_at DESC);

CREATE INDEX commercial_opportunities_temperature_idx ON public.commercial_opportunities USING btree (tenant_id, organization_id, temperature) WHERE (status = 'open'::text);

CREATE UNIQUE INDEX commercial_proposal_events_pkey ON public.commercial_proposal_events USING btree (id);

CREATE UNIQUE INDEX commercial_proposal_items_pkey ON public.commercial_proposal_items USING btree (id);

CREATE UNIQUE INDEX commercial_proposals_pkey ON public.commercial_proposals USING btree (id);

CREATE UNIQUE INDEX commercial_proposals_proposal_number_key ON public.commercial_proposals USING btree (proposal_number);

CREATE UNIQUE INDEX commercial_response_suggestions_pkey ON public.commercial_response_suggestions USING btree (id);

CREATE INDEX commercial_response_suggestions_scope_idx ON public.commercial_response_suggestions USING btree (tenant_id, organization_id, conversation_id, status, created_at DESC);

CREATE INDEX commercial_suggestions_usage_idx ON public.commercial_response_suggestions USING btree (tenant_id, organization_id, request_status, created_at DESC);

CREATE UNIQUE INDEX consent_keywords_keyword_key ON public.consent_keywords USING btree (keyword);

CREATE UNIQUE INDEX consent_keywords_pkey ON public.consent_keywords USING btree (id);

CREATE UNIQUE INDEX consent_message_templates_name_key ON public.consent_message_templates USING btree (name);

CREATE UNIQUE INDEX consent_message_templates_pkey ON public.consent_message_templates USING btree (id);

CREATE UNIQUE INDEX contact_identities_channel_external_uniq ON public.contact_identities USING btree (channel_id, external_id);

CREATE INDEX contact_identities_contact_idx ON public.contact_identities USING btree (contact_id);

CREATE INDEX contact_identities_org_idx ON public.contact_identities USING btree (organization_id);

CREATE UNIQUE INDEX contact_identities_pkey ON public.contact_identities USING btree (id);

CREATE UNIQUE INDEX conversation_assignment_events_pkey ON public.conversation_assignment_events USING btree (id);

CREATE UNIQUE INDEX conversation_assignments_pkey ON public.conversation_assignments USING btree (id);

CREATE UNIQUE INDEX conversation_flow_sessions_pkey ON public.conversation_flow_sessions USING btree (id);

CREATE UNIQUE INDEX conversation_flow_steps_pkey ON public.conversation_flow_steps USING btree (id);

CREATE UNIQUE INDEX conversation_flows_pkey ON public.conversation_flows USING btree (id);

CREATE UNIQUE INDEX conversation_notes_pkey ON public.conversation_notes USING btree (id);

CREATE UNIQUE INDEX crm_activities_pkey ON public.crm_activities USING btree (id);

CREATE UNIQUE INDEX crm_campaign_recipients_campaign_id_contact_id_key ON public.crm_campaign_recipients USING btree (campaign_id, contact_id);

CREATE UNIQUE INDEX crm_campaign_recipients_pkey ON public.crm_campaign_recipients USING btree (id);

CREATE UNIQUE INDEX crm_campaigns_pkey ON public.crm_campaigns USING btree (id);

CREATE UNIQUE INDEX crm_consent_events_pkey ON public.crm_consent_events USING btree (id);

CREATE UNIQUE INDEX crm_contact_list_items_list_id_contact_id_key ON public.crm_contact_list_items USING btree (list_id, contact_id);

CREATE UNIQUE INDEX crm_contact_list_items_pkey ON public.crm_contact_list_items USING btree (id);

CREATE UNIQUE INDEX crm_contact_lists_pkey ON public.crm_contact_lists USING btree (id);

CREATE INDEX crm_contact_notes_org_contact_created_idx ON public.crm_contact_notes USING btree (organization_id, tenant_id, contact_id, created_at DESC) WHERE ((organization_id IS NOT NULL) AND (tenant_id IS NOT NULL));

CREATE INDEX crm_contact_notes_org_conversation_created_idx ON public.crm_contact_notes USING btree (organization_id, tenant_id, conversation_id, created_at DESC) WHERE ((organization_id IS NOT NULL) AND (tenant_id IS NOT NULL));

CREATE UNIQUE INDEX crm_contact_tags_contact_id_tag_id_key ON public.crm_contact_tags USING btree (contact_id, tag_id);

CREATE UNIQUE INDEX crm_contact_tags_pkey ON public.crm_contact_tags USING btree (id);

CREATE INDEX crm_contacts_org_phone_idx ON public.crm_contacts USING btree (organization_id, tenant_id, phone) WHERE ((organization_id IS NOT NULL) AND (tenant_id IS NOT NULL) AND (phone IS NOT NULL));

CREATE UNIQUE INDEX crm_contacts_org_phone_unique ON public.crm_contacts USING btree (organization_id, phone) WHERE ((organization_id IS NOT NULL) AND (phone IS NOT NULL));

CREATE UNIQUE INDEX crm_deals_pkey ON public.crm_deals USING btree (id);

CREATE UNIQUE INDEX crm_pipeline_stages_name_key ON public.crm_pipeline_stages USING btree (name);

CREATE UNIQUE INDEX crm_pipeline_stages_pkey ON public.crm_pipeline_stages USING btree (id);

CREATE UNIQUE INDEX crm_tags_name_key ON public.crm_tags USING btree (name);

CREATE UNIQUE INDEX crm_tags_pkey ON public.crm_tags USING btree (id);

CREATE UNIQUE INDEX crm_task_templates_pkey ON public.crm_task_templates USING btree (id);

CREATE UNIQUE INDEX crm_tasks_pkey ON public.crm_tasks USING btree (id);

CREATE UNIQUE INDEX deploy_checklist_items_pkey ON public.deploy_checklist_items USING btree (id);

CREATE UNIQUE INDEX deploy_checklists_name_key ON public.deploy_checklists USING btree (name);

CREATE UNIQUE INDEX deploy_checklists_pkey ON public.deploy_checklists USING btree (id);

CREATE UNIQUE INDEX deployments_pkey ON public.deployments USING btree (id);

CREATE UNIQUE INDEX document_acceptances_pkey ON public.document_acceptances USING btree (id);

CREATE UNIQUE INDEX document_events_pkey ON public.document_events USING btree (id);

CREATE UNIQUE INDEX document_files_pkey ON public.document_files USING btree (id);

CREATE UNIQUE INDEX document_public_links_pkey ON public.document_public_links USING btree (id);

CREATE UNIQUE INDEX document_public_links_token_key ON public.document_public_links USING btree (token);

CREATE UNIQUE INDEX document_templates_name_key ON public.document_templates USING btree (name);

CREATE UNIQUE INDEX document_templates_pkey ON public.document_templates USING btree (id);

CREATE UNIQUE INDEX documents_document_number_key ON public.documents USING btree (document_number);

CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id);

CREATE UNIQUE INDEX external_integrations_name_key ON public.external_integrations USING btree (name);

CREATE UNIQUE INDEX external_integrations_pkey ON public.external_integrations USING btree (id);

CREATE UNIQUE INDEX file_access_logs_pkey ON public.file_access_logs USING btree (id);

CREATE UNIQUE INDEX file_folders_pkey ON public.file_folders USING btree (id);

CREATE UNIQUE INDEX file_shares_pkey ON public.file_shares USING btree (id);

CREATE UNIQUE INDEX file_shares_token_key ON public.file_shares USING btree (token);

CREATE UNIQUE INDEX file_tag_links_file_id_tag_id_key ON public.file_tag_links USING btree (file_id, tag_id);

CREATE UNIQUE INDEX file_tag_links_pkey ON public.file_tag_links USING btree (id);

CREATE UNIQUE INDEX file_tags_name_key ON public.file_tags USING btree (name);

CREATE UNIQUE INDEX file_tags_pkey ON public.file_tags USING btree (id);

CREATE UNIQUE INDEX file_versions_file_id_version_number_key ON public.file_versions USING btree (file_id, version_number);

CREATE UNIQUE INDEX file_versions_pkey ON public.file_versions USING btree (id);

CREATE UNIQUE INDEX files_pkey ON public.files USING btree (id);

CREATE UNIQUE INDEX finance_accounts_name_key ON public.finance_accounts USING btree (name);

CREATE UNIQUE INDEX finance_accounts_pkey ON public.finance_accounts USING btree (id);

CREATE UNIQUE INDEX finance_events_pkey ON public.finance_events USING btree (id);

CREATE UNIQUE INDEX finance_installments_invoice_id_installment_number_key ON public.finance_installments USING btree (invoice_id, installment_number);

CREATE UNIQUE INDEX finance_installments_pkey ON public.finance_installments USING btree (id);

CREATE UNIQUE INDEX finance_invoice_items_pkey ON public.finance_invoice_items USING btree (id);

CREATE UNIQUE INDEX finance_invoices_invoice_number_key ON public.finance_invoices USING btree (invoice_number);

CREATE INDEX finance_invoices_org_status_idx ON public.finance_invoices USING btree (organization_id, status);

CREATE UNIQUE INDEX finance_invoices_pkey ON public.finance_invoices USING btree (id);

CREATE INDEX finance_invoices_provider_invoice_idx ON public.finance_invoices USING btree (billing_provider, provider_invoice_id);

CREATE INDEX finance_payments_org_status_idx ON public.finance_payments USING btree (organization_id, status);

CREATE INDEX finance_payments_provider_payment_idx ON public.finance_payments USING btree (billing_provider, provider_payment_id);

CREATE UNIQUE INDEX global_search_index_entity_type_entity_id_key ON public.global_search_index USING btree (entity_type, entity_id);

CREATE UNIQUE INDEX global_search_index_pkey ON public.global_search_index USING btree (id);

CREATE INDEX idx_access_attempts_created_at ON public.access_attempts USING btree (created_at DESC);

CREATE INDEX idx_access_attempts_email ON public.access_attempts USING btree (email);

CREATE INDEX idx_access_attempts_ip_address ON public.access_attempts USING btree (ip_address);

CREATE INDEX idx_access_attempts_status ON public.access_attempts USING btree (status);

CREATE INDEX idx_agent_automation_cooldown_org ON public.agent_automation_cooldown USING btree (organization_id);

CREATE INDEX idx_agent_automation_jobs_conversation ON public.agent_automation_jobs USING btree (conversation_id);

CREATE INDEX idx_agent_automation_jobs_org ON public.agent_automation_jobs USING btree (organization_id, created_at DESC);

CREATE INDEX idx_agent_automation_jobs_status ON public.agent_automation_jobs USING btree (status, created_at DESC);

CREATE INDEX idx_agent_catalog_products_available ON public.agent_catalog_products USING btree (tenant_id, is_active, is_available);

CREATE INDEX idx_agent_catalog_products_barcode ON public.agent_catalog_products USING btree (tenant_id, barcode);

CREATE INDEX idx_agent_catalog_products_name_search ON public.agent_catalog_products USING gin (to_tsvector('portuguese'::regconfig, ((((((COALESCE(name, ''::text) || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || COALESCE(sku, ''::text)) || ' '::text) || COALESCE(barcode, ''::text))));

CREATE INDEX idx_agent_catalog_products_organization_id ON public.agent_catalog_products USING btree (organization_id);

CREATE INDEX idx_agent_catalog_products_sku ON public.agent_catalog_products USING btree (tenant_id, sku);

CREATE INDEX idx_agent_catalog_products_source ON public.agent_catalog_products USING btree (tenant_id, source_code);

CREATE INDEX idx_agent_catalog_products_tenant_id ON public.agent_catalog_products USING btree (tenant_id);

CREATE INDEX idx_agent_dialog_templates_active ON public.agent_dialog_templates USING btree (is_active);

CREATE INDEX idx_agent_dialog_templates_intent_code ON public.agent_dialog_templates USING btree (intent_code);

CREATE INDEX idx_agent_dialog_templates_organization_id ON public.agent_dialog_templates USING btree (organization_id);

CREATE INDEX idx_agent_dialog_templates_tenant_id ON public.agent_dialog_templates USING btree (tenant_id);

CREATE INDEX idx_agent_installations_connector_type_id ON public.agent_installations USING btree (connector_type_id);

CREATE INDEX idx_agent_installations_organization_id ON public.agent_installations USING btree (organization_id);

CREATE INDEX idx_agent_installations_status ON public.agent_installations USING btree (status);

CREATE INDEX idx_agent_installations_tenant_id ON public.agent_installations USING btree (tenant_id);

CREATE INDEX idx_agent_presence_status ON public.agent_presence USING btree (status);

CREATE INDEX idx_agent_sync_runs_agent_installation_id ON public.agent_sync_runs USING btree (agent_installation_id);

CREATE INDEX idx_agent_sync_runs_started_at ON public.agent_sync_runs USING btree (started_at DESC);

CREATE INDEX idx_agent_sync_runs_tenant_id ON public.agent_sync_runs USING btree (tenant_id);

CREATE INDEX idx_ai_conversation_summaries_conversation_id ON public.ai_conversation_summaries USING btree (conversation_id);

CREATE INDEX idx_ai_conversation_summaries_created_at ON public.ai_conversation_summaries USING btree (created_at DESC);

CREATE INDEX idx_ai_conversation_summaries_external_chat_id ON public.ai_conversation_summaries USING btree (external_chat_id);

CREATE INDEX idx_ai_extracted_customer_data_contact_id ON public.ai_extracted_customer_data USING btree (contact_id);

CREATE INDEX idx_ai_extracted_customer_data_external_chat_id ON public.ai_extracted_customer_data USING btree (external_chat_id);

CREATE INDEX idx_ai_lead_scores_contact_id ON public.ai_lead_scores USING btree (contact_id);

CREATE INDEX idx_ai_lead_scores_external_chat_id ON public.ai_lead_scores USING btree (external_chat_id);

CREATE INDEX idx_ai_lead_scores_temperature ON public.ai_lead_scores USING btree (temperature);

CREATE INDEX idx_ai_objections_external_chat_id ON public.ai_objections USING btree (external_chat_id);

CREATE INDEX idx_ai_objections_status ON public.ai_objections USING btree (status);

CREATE INDEX idx_ai_objections_type ON public.ai_objections USING btree (objection_type);

CREATE INDEX idx_ai_reply_suggestions_external_chat_id ON public.ai_reply_suggestions USING btree (external_chat_id);

CREATE INDEX idx_ai_reply_suggestions_status ON public.ai_reply_suggestions USING btree (status);

CREATE INDEX idx_ai_runs_created_at ON public.ai_runs USING btree (created_at DESC);

CREATE INDEX idx_ai_runs_run_type ON public.ai_runs USING btree (run_type);

CREATE INDEX idx_ai_runs_status ON public.ai_runs USING btree (status);

CREATE INDEX idx_api_tokens_status ON public.api_tokens USING btree (status);

CREATE INDEX idx_api_tokens_token_prefix ON public.api_tokens USING btree (token_prefix);

CREATE INDEX idx_api_tokens_token_type ON public.api_tokens USING btree (token_type);

CREATE INDEX idx_app_settings_module ON public.app_settings USING btree (module);

CREATE INDEX idx_app_user_permissions_permission_id ON public.app_user_permissions USING btree (permission_id);

CREATE INDEX idx_app_user_permissions_user_id ON public.app_user_permissions USING btree (user_id);

CREATE INDEX idx_application_logs_created_at ON public.application_logs USING btree (created_at DESC);

CREATE INDEX idx_application_logs_level ON public.application_logs USING btree (level);

CREATE INDEX idx_application_logs_module ON public.application_logs USING btree (module);

CREATE INDEX idx_application_logs_request_id ON public.application_logs USING btree (request_id);

CREATE INDEX idx_application_logs_source ON public.application_logs USING btree (source);

CREATE INDEX idx_audit_trail_action ON public.audit_trail USING btree (action);

CREATE INDEX idx_audit_trail_actor_user_id ON public.audit_trail USING btree (actor_user_id);

CREATE INDEX idx_audit_trail_created_at ON public.audit_trail USING btree (created_at DESC);

CREATE INDEX idx_audit_trail_entity_id ON public.audit_trail USING btree (entity_id);

CREATE INDEX idx_audit_trail_entity_type ON public.audit_trail USING btree (entity_type);

CREATE INDEX idx_automation_action_logs_flow_id ON public.automation_action_logs USING btree (flow_id);

CREATE INDEX idx_automation_action_logs_run_id ON public.automation_action_logs USING btree (run_id);

CREATE INDEX idx_automation_action_logs_status ON public.automation_action_logs USING btree (status);

CREATE INDEX idx_automation_actions_action_type ON public.automation_actions USING btree (action_type);

CREATE INDEX idx_automation_actions_flow_id ON public.automation_actions USING btree (flow_id);

CREATE INDEX idx_automation_cooldowns_expires_at ON public.automation_cooldowns USING btree (expires_at);

CREATE INDEX idx_automation_cooldowns_external_chat_id ON public.automation_cooldowns USING btree (external_chat_id);

CREATE INDEX idx_automation_cooldowns_flow_id ON public.automation_cooldowns USING btree (flow_id);

CREATE INDEX idx_automation_flows_is_active ON public.automation_flows USING btree (is_active);

CREATE INDEX idx_automation_flows_trigger_type ON public.automation_flows USING btree (trigger_type);

CREATE INDEX idx_automation_runs_created_at ON public.automation_runs USING btree (created_at DESC);

CREATE INDEX idx_automation_runs_external_chat_id ON public.automation_runs USING btree (external_chat_id);

CREATE INDEX idx_automation_runs_flow_id ON public.automation_runs USING btree (flow_id);

CREATE INDEX idx_automation_runs_status ON public.automation_runs USING btree (status);

CREATE INDEX idx_automation_triggers_flow_id ON public.automation_triggers USING btree (flow_id);

CREATE INDEX idx_automation_triggers_trigger_key ON public.automation_triggers USING btree (trigger_key);

CREATE INDEX idx_backup_configs_backup_type ON public.backup_configs USING btree (backup_type);

CREATE INDEX idx_backup_configs_is_active ON public.backup_configs USING btree (is_active);

CREATE INDEX idx_backup_runs_backup_config_id ON public.backup_runs USING btree (backup_config_id);

CREATE INDEX idx_backup_runs_created_at ON public.backup_runs USING btree (created_at DESC);

CREATE INDEX idx_backup_runs_status ON public.backup_runs USING btree (status);

CREATE INDEX idx_blocked_contacts_contact_id ON public.blocked_contacts USING btree (contact_id);

CREATE INDEX idx_blocked_contacts_is_active ON public.blocked_contacts USING btree (is_active);

CREATE INDEX idx_blocked_contacts_phone ON public.blocked_contacts USING btree (phone);

CREATE INDEX idx_business_hours_day_of_week ON public.business_hours USING btree (day_of_week);

CREATE INDEX idx_calendar_event_participants_contact_id ON public.calendar_event_participants USING btree (contact_id);

CREATE INDEX idx_calendar_event_participants_event_id ON public.calendar_event_participants USING btree (event_id);

CREATE INDEX idx_calendar_event_participants_user_id ON public.calendar_event_participants USING btree (user_id);

CREATE INDEX idx_calendar_events_assigned_to ON public.calendar_events USING btree (assigned_to);

CREATE INDEX idx_calendar_events_calendar_id ON public.calendar_events USING btree (calendar_id);

CREATE INDEX idx_calendar_events_contact_id ON public.calendar_events USING btree (contact_id);

CREATE INDEX idx_calendar_events_conversation_id ON public.calendar_events USING btree (conversation_id);

CREATE INDEX idx_calendar_events_starts_at ON public.calendar_events USING btree (starts_at);

CREATE INDEX idx_calendar_events_status ON public.calendar_events USING btree (status);

CREATE INDEX idx_calendar_events_tenant_id ON public.calendar_events USING btree (tenant_id);

CREATE INDEX idx_calendars_owner_user_id ON public.calendars USING btree (owner_user_id);

CREATE INDEX idx_calendars_tenant_id ON public.calendars USING btree (tenant_id);

CREATE INDEX idx_catalog_categories_external ON public.catalog_categories USING btree (organization_id, external_source, external_id);

CREATE INDEX idx_catalog_categories_external_source ON public.catalog_categories USING btree (external_source);

CREATE INDEX idx_catalog_categories_is_active ON public.catalog_categories USING btree (is_active);

CREATE INDEX idx_catalog_categories_org ON public.catalog_categories USING btree (organization_id);

CREATE INDEX idx_catalog_categories_tenant_org ON public.catalog_categories USING btree (tenant_id, organization_id);

CREATE INDEX idx_catalog_items_available ON public.catalog_items USING btree (organization_id, is_active, is_available) WHERE ((is_active = true) AND (is_available = true));

CREATE INDEX idx_catalog_items_barcode ON public.catalog_items USING btree (organization_id, barcode);

CREATE INDEX idx_catalog_items_category_id ON public.catalog_items USING btree (category_id);

CREATE INDEX idx_catalog_items_external ON public.catalog_items USING btree (organization_id, external_source, external_id);

CREATE INDEX idx_catalog_items_is_active ON public.catalog_items USING btree (is_active);

CREATE INDEX idx_catalog_items_item_type ON public.catalog_items USING btree (item_type);

CREATE INDEX idx_catalog_items_last_synced ON public.catalog_items USING btree (last_synced_at DESC);

CREATE INDEX idx_catalog_items_name ON public.catalog_items USING gin (to_tsvector('portuguese'::regconfig, name));

CREATE INDEX idx_catalog_items_org ON public.catalog_items USING btree (organization_id);

CREATE INDEX idx_catalog_items_search ON public.catalog_items USING gin (to_tsvector('portuguese'::regconfig, ((((((((COALESCE(name, ''::text) || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || COALESCE(sku, ''::text)) || ' '::text) || COALESCE(barcode, ''::text)) || ' '::text) || COALESCE(brand, ''::text))));

CREATE INDEX idx_catalog_items_sku ON public.catalog_items USING btree (organization_id, sku);

CREATE INDEX idx_catalog_items_status ON public.catalog_items USING btree (status);

CREATE INDEX idx_catalog_items_synced ON public.catalog_items USING btree (last_synced_at);

CREATE INDEX idx_catalog_items_tenant ON public.catalog_items USING btree (tenant_id);

CREATE INDEX idx_catalog_items_tenant_org ON public.catalog_items USING btree (tenant_id, organization_id);

CREATE INDEX idx_commercial_offer_items_catalog_item_id ON public.commercial_offer_items USING btree (catalog_item_id);

CREATE INDEX idx_commercial_offer_items_offer_id ON public.commercial_offer_items USING btree (offer_id);

CREATE INDEX idx_commercial_offers_is_active ON public.commercial_offers USING btree (is_active);

CREATE INDEX idx_commercial_offers_status ON public.commercial_offers USING btree (status);

CREATE INDEX idx_commercial_proposal_events_event_type ON public.commercial_proposal_events USING btree (event_type);

CREATE INDEX idx_commercial_proposal_events_proposal_id ON public.commercial_proposal_events USING btree (proposal_id);

CREATE INDEX idx_commercial_proposal_items_catalog_item_id ON public.commercial_proposal_items USING btree (catalog_item_id);

CREATE INDEX idx_commercial_proposal_items_proposal_id ON public.commercial_proposal_items USING btree (proposal_id);

CREATE INDEX idx_commercial_proposals_contact_id ON public.commercial_proposals USING btree (contact_id);

CREATE INDEX idx_commercial_proposals_conversation_id ON public.commercial_proposals USING btree (conversation_id);

CREATE INDEX idx_commercial_proposals_deal_id ON public.commercial_proposals USING btree (deal_id);

CREATE INDEX idx_commercial_proposals_status ON public.commercial_proposals USING btree (status);

CREATE INDEX idx_conversation_assignment_events_assignment_id ON public.conversation_assignment_events USING btree (assignment_id);

CREATE INDEX idx_conversation_assignment_events_external_chat_id ON public.conversation_assignment_events USING btree (external_chat_id);

CREATE INDEX idx_conversation_assignments_assigned_to ON public.conversation_assignments USING btree (assigned_to);

CREATE INDEX idx_conversation_assignments_external_chat_id ON public.conversation_assignments USING btree (external_chat_id);

CREATE INDEX idx_conversation_assignments_queue_id ON public.conversation_assignments USING btree (queue_id);

CREATE INDEX idx_conversation_assignments_status ON public.conversation_assignments USING btree (status);

CREATE INDEX idx_conversation_flow_sessions_conversation_id ON public.conversation_flow_sessions USING btree (conversation_id);

CREATE INDEX idx_conversation_flow_sessions_flow_id ON public.conversation_flow_sessions USING btree (flow_id);

CREATE INDEX idx_conversation_flow_sessions_organization_id ON public.conversation_flow_sessions USING btree (organization_id);

CREATE INDEX idx_conversation_flow_steps_flow_id ON public.conversation_flow_steps USING btree (flow_id);

CREATE INDEX idx_conversation_flow_steps_organization_id ON public.conversation_flow_steps USING btree (organization_id);

CREATE INDEX idx_conversation_flows_language ON public.conversation_flows USING btree (language);

CREATE INDEX idx_conversation_flows_org ON public.conversation_flows USING btree (organization_id);

CREATE INDEX idx_conversation_flows_organization_id ON public.conversation_flows USING btree (organization_id);

CREATE INDEX idx_conversation_flows_status ON public.conversation_flows USING btree (status);

CREATE INDEX idx_conversation_notes_external_chat_id ON public.conversation_notes USING btree (external_chat_id);

CREATE INDEX idx_crm_activities_contact_id ON public.crm_activities USING btree (contact_id);

CREATE INDEX idx_crm_activities_conversation_id ON public.crm_activities USING btree (conversation_id);

CREATE INDEX idx_crm_activities_created_at ON public.crm_activities USING btree (created_at DESC);

CREATE INDEX idx_crm_activities_deal_id ON public.crm_activities USING btree (deal_id);

CREATE INDEX idx_crm_campaign_recipients_campaign_id ON public.crm_campaign_recipients USING btree (campaign_id);

CREATE INDEX idx_crm_campaign_recipients_contact_id ON public.crm_campaign_recipients USING btree (contact_id);

CREATE INDEX idx_crm_campaign_recipients_status ON public.crm_campaign_recipients USING btree (status);

CREATE INDEX idx_crm_campaigns_list_id ON public.crm_campaigns USING btree (list_id);

CREATE INDEX idx_crm_campaigns_status ON public.crm_campaigns USING btree (status);

CREATE INDEX idx_crm_consent_events_contact_id ON public.crm_consent_events USING btree (contact_id);

CREATE INDEX idx_crm_consent_events_phone ON public.crm_consent_events USING btree (phone);

CREATE INDEX idx_crm_contact_list_items_contact_id ON public.crm_contact_list_items USING btree (contact_id);

CREATE INDEX idx_crm_contact_list_items_list_id ON public.crm_contact_list_items USING btree (list_id);

CREATE INDEX idx_crm_contact_list_items_review_status ON public.crm_contact_list_items USING btree (review_status);

CREATE INDEX idx_crm_contact_lists_status ON public.crm_contact_lists USING btree (status);

CREATE INDEX idx_crm_contact_tags_contact_id ON public.crm_contact_tags USING btree (contact_id);

CREATE INDEX idx_crm_contact_tags_tag_id ON public.crm_contact_tags USING btree (tag_id);

CREATE INDEX idx_crm_contacts_org ON public.crm_contacts USING btree (organization_id);

CREATE INDEX idx_crm_contacts_organization_id ON public.crm_contacts USING btree (organization_id);

CREATE INDEX idx_crm_deals_contact_id ON public.crm_deals USING btree (contact_id);

CREATE INDEX idx_crm_deals_conversation_id ON public.crm_deals USING btree (conversation_id);

CREATE INDEX idx_crm_deals_org ON public.crm_deals USING btree (organization_id);

CREATE INDEX idx_crm_deals_stage_id ON public.crm_deals USING btree (stage_id);

CREATE INDEX idx_crm_deals_status ON public.crm_deals USING btree (status);

CREATE INDEX idx_crm_pipeline_stages_position ON public.crm_pipeline_stages USING btree ("position");

CREATE INDEX idx_crm_tasks_contact_id ON public.crm_tasks USING btree (contact_id);

CREATE INDEX idx_crm_tasks_conversation_id ON public.crm_tasks USING btree (conversation_id);

CREATE INDEX idx_crm_tasks_deal_id ON public.crm_tasks USING btree (deal_id);

CREATE INDEX idx_crm_tasks_due_at ON public.crm_tasks USING btree (due_at);

CREATE INDEX idx_crm_tasks_status ON public.crm_tasks USING btree (status);

CREATE INDEX idx_deploy_checklist_items_checklist_id ON public.deploy_checklist_items USING btree (checklist_id);

CREATE INDEX idx_deployments_created_at ON public.deployments USING btree (created_at DESC);

CREATE INDEX idx_deployments_environment ON public.deployments USING btree (environment);

CREATE INDEX idx_deployments_provider ON public.deployments USING btree (provider);

CREATE INDEX idx_deployments_status ON public.deployments USING btree (status);

CREATE INDEX idx_document_acceptances_contact_id ON public.document_acceptances USING btree (contact_id);

CREATE INDEX idx_document_acceptances_document_id ON public.document_acceptances USING btree (document_id);

CREATE INDEX idx_document_events_created_at ON public.document_events USING btree (created_at DESC);

CREATE INDEX idx_document_events_document_id ON public.document_events USING btree (document_id);

CREATE INDEX idx_document_events_event_type ON public.document_events USING btree (event_type);

CREATE INDEX idx_document_files_document_id ON public.document_files USING btree (document_id);

CREATE INDEX idx_document_files_is_primary ON public.document_files USING btree (is_primary);

CREATE INDEX idx_document_public_links_document_id ON public.document_public_links USING btree (document_id);

CREATE INDEX idx_document_public_links_is_active ON public.document_public_links USING btree (is_active);

CREATE INDEX idx_document_public_links_token ON public.document_public_links USING btree (token);

CREATE INDEX idx_document_templates_is_active ON public.document_templates USING btree (is_active);

CREATE INDEX idx_document_templates_type ON public.document_templates USING btree (template_type);

CREATE INDEX idx_documents_contact_id ON public.documents USING btree (contact_id);

CREATE INDEX idx_documents_conversation_id ON public.documents USING btree (conversation_id);

CREATE INDEX idx_documents_deal_id ON public.documents USING btree (deal_id);

CREATE INDEX idx_documents_invoice_id ON public.documents USING btree (invoice_id);

CREATE INDEX idx_documents_proposal_id ON public.documents USING btree (proposal_id);

CREATE INDEX idx_documents_status ON public.documents USING btree (status);

CREATE INDEX idx_documents_type ON public.documents USING btree (document_type);

CREATE INDEX idx_external_integrations_is_active ON public.external_integrations USING btree (is_active);

CREATE INDEX idx_external_integrations_provider ON public.external_integrations USING btree (provider);

CREATE INDEX idx_external_integrations_type ON public.external_integrations USING btree (integration_type);

CREATE INDEX idx_file_access_logs_created_at ON public.file_access_logs USING btree (created_at DESC);

CREATE INDEX idx_file_access_logs_file_id ON public.file_access_logs USING btree (file_id);

CREATE INDEX idx_file_access_logs_share_id ON public.file_access_logs USING btree (share_id);

CREATE INDEX idx_file_folders_folder_type ON public.file_folders USING btree (folder_type);

CREATE INDEX idx_file_folders_is_active ON public.file_folders USING btree (is_active);

CREATE INDEX idx_file_folders_parent_id ON public.file_folders USING btree (parent_id);

CREATE INDEX idx_file_shares_file_id ON public.file_shares USING btree (file_id);

CREATE INDEX idx_file_shares_is_active ON public.file_shares USING btree (is_active);

CREATE INDEX idx_file_shares_token ON public.file_shares USING btree (token);

CREATE INDEX idx_file_tag_links_file_id ON public.file_tag_links USING btree (file_id);

CREATE INDEX idx_file_tag_links_tag_id ON public.file_tag_links USING btree (tag_id);

CREATE INDEX idx_file_versions_file_id ON public.file_versions USING btree (file_id);

CREATE INDEX idx_files_contact_id ON public.files USING btree (contact_id);

CREATE INDEX idx_files_conversation_id ON public.files USING btree (conversation_id);

CREATE INDEX idx_files_deal_id ON public.files USING btree (deal_id);

CREATE INDEX idx_files_document_id ON public.files USING btree (document_id);

CREATE INDEX idx_files_file_type ON public.files USING btree (file_type);

CREATE INDEX idx_files_folder_id ON public.files USING btree (folder_id);

CREATE INDEX idx_files_invoice_id ON public.files USING btree (invoice_id);

CREATE INDEX idx_files_message_id ON public.files USING btree (message_id);

CREATE INDEX idx_files_proposal_id ON public.files USING btree (proposal_id);

CREATE INDEX idx_files_status ON public.files USING btree (status);

CREATE INDEX idx_finance_accounts_is_active ON public.finance_accounts USING btree (is_active);

CREATE INDEX idx_finance_events_event_type ON public.finance_events USING btree (event_type);

CREATE INDEX idx_finance_events_invoice_id ON public.finance_events USING btree (invoice_id);

CREATE INDEX idx_finance_events_payment_id ON public.finance_events USING btree (payment_id);

CREATE INDEX idx_finance_installments_due_date ON public.finance_installments USING btree (due_date);

CREATE INDEX idx_finance_installments_invoice_id ON public.finance_installments USING btree (invoice_id);

CREATE INDEX idx_finance_installments_status ON public.finance_installments USING btree (status);

CREATE INDEX idx_finance_invoice_items_catalog_item_id ON public.finance_invoice_items USING btree (catalog_item_id);

CREATE INDEX idx_finance_invoice_items_invoice_id ON public.finance_invoice_items USING btree (invoice_id);

CREATE INDEX idx_finance_invoices_contact_id ON public.finance_invoices USING btree (contact_id);

CREATE INDEX idx_finance_invoices_conversation_id ON public.finance_invoices USING btree (conversation_id);

CREATE INDEX idx_finance_invoices_deal_id ON public.finance_invoices USING btree (deal_id);

CREATE INDEX idx_finance_invoices_due_date ON public.finance_invoices USING btree (due_date);

CREATE INDEX idx_finance_invoices_proposal_id ON public.finance_invoices USING btree (proposal_id);

CREATE INDEX idx_finance_invoices_status ON public.finance_invoices USING btree (status);

CREATE INDEX idx_finance_payments_contact_id ON public.finance_payments USING btree (contact_id);

CREATE INDEX idx_finance_payments_installment_id ON public.finance_payments USING btree (installment_id);

CREATE INDEX idx_finance_payments_invoice_id ON public.finance_payments USING btree (invoice_id);

CREATE INDEX idx_finance_payments_paid_at ON public.finance_payments USING btree (paid_at DESC);

CREATE INDEX idx_finance_payments_status ON public.finance_payments USING btree (status);

CREATE INDEX idx_global_search_index_contact_id ON public.global_search_index USING btree (contact_id);

CREATE INDEX idx_global_search_index_conversation_id ON public.global_search_index USING btree (conversation_id);

CREATE INDEX idx_global_search_index_entity_type ON public.global_search_index USING btree (entity_type);

CREATE INDEX idx_global_search_index_is_active ON public.global_search_index USING btree (is_active);

CREATE INDEX idx_global_search_index_module ON public.global_search_index USING btree (module);

CREATE INDEX idx_global_search_index_searchable_text ON public.global_search_index USING gin (to_tsvector('portuguese'::regconfig, searchable_text));

CREATE INDEX idx_global_search_index_tenant_id ON public.global_search_index USING btree (tenant_id);

CREATE INDEX idx_group_contact_list_items_organization_id ON public.group_contact_list_items USING btree (organization_id);

CREATE INDEX idx_group_contact_list_items_review_status ON public.group_contact_list_items USING btree (review_status);

CREATE INDEX idx_group_contact_lists_org ON public.group_contact_lists USING btree (organization_id);

CREATE INDEX idx_group_contact_lists_organization_id ON public.group_contact_lists USING btree (organization_id);

CREATE INDEX idx_import_column_mappings_import_type ON public.import_column_mappings USING btree (import_type);

CREATE INDEX idx_import_column_mappings_source_type ON public.import_column_mappings USING btree (source_type);

CREATE INDEX idx_import_jobs_created_at ON public.import_jobs USING btree (created_at DESC);

CREATE INDEX idx_import_jobs_import_type ON public.import_jobs USING btree (import_type);

CREATE INDEX idx_import_jobs_source_type ON public.import_jobs USING btree (source_type);

CREATE INDEX idx_import_jobs_status ON public.import_jobs USING btree (status);

CREATE INDEX idx_import_logs_job_id ON public.import_logs USING btree (job_id);

CREATE INDEX idx_import_logs_level ON public.import_logs USING btree (log_level);

CREATE INDEX idx_import_logs_row_id ON public.import_logs USING btree (row_id);

CREATE INDEX idx_import_rows_duplicate_of_contact_id ON public.import_rows USING btree (duplicate_of_contact_id);

CREATE INDEX idx_import_rows_job_id ON public.import_rows USING btree (job_id);

CREATE INDEX idx_import_rows_review_status ON public.import_rows USING btree (review_status);

CREATE INDEX idx_import_rows_status ON public.import_rows USING btree (status);

CREATE INDEX idx_inbound_webhook_endpoints_endpoint_key ON public.inbound_webhook_endpoints USING btree (endpoint_key);

CREATE INDEX idx_inbound_webhook_endpoints_integration_id ON public.inbound_webhook_endpoints USING btree (integration_id);

CREATE INDEX idx_inbound_webhook_endpoints_provider ON public.inbound_webhook_endpoints USING btree (provider);

CREATE INDEX idx_inbound_webhook_events_endpoint_id ON public.inbound_webhook_events USING btree (endpoint_id);

CREATE INDEX idx_inbound_webhook_events_event_id ON public.inbound_webhook_events USING btree (event_id);

CREATE INDEX idx_inbound_webhook_events_event_type ON public.inbound_webhook_events USING btree (event_type);

CREATE INDEX idx_inbound_webhook_events_processing_status ON public.inbound_webhook_events USING btree (processing_status);

CREATE INDEX idx_inbound_webhook_events_provider ON public.inbound_webhook_events USING btree (provider);

CREATE INDEX idx_inbound_webhook_events_received_at ON public.inbound_webhook_events USING btree (received_at DESC);

CREATE INDEX idx_integration_agents_hash ON public.integration_agents USING btree (agent_token_hash);

CREATE INDEX idx_integration_agents_org ON public.integration_agents USING btree (tenant_id, organization_id);

CREATE INDEX idx_integration_agents_source ON public.integration_agents USING btree (integration_source_id);

CREATE INDEX idx_integration_agents_status ON public.integration_agents USING btree (status);

CREATE INDEX idx_integration_agents_tenant_org ON public.integration_agents USING btree (tenant_id, organization_id);

CREATE INDEX idx_integration_event_mappings_external_event_type ON public.integration_event_mappings USING btree (external_event_type);

CREATE INDEX idx_integration_event_mappings_provider ON public.integration_event_mappings USING btree (provider);

CREATE INDEX idx_integration_sources_org ON public.integration_sources USING btree (tenant_id, organization_id);

CREATE INDEX idx_integration_sources_source_type ON public.integration_sources USING btree (source_type);

CREATE INDEX idx_integration_sources_tenant_org ON public.integration_sources USING btree (tenant_id, organization_id);

CREATE INDEX idx_integration_sync_logs_agent ON public.integration_sync_logs USING btree (agent_id);

CREATE INDEX idx_integration_sync_logs_created_at ON public.integration_sync_logs USING btree (created_at DESC);

CREATE INDEX idx_integration_sync_logs_run ON public.integration_sync_logs USING btree (sync_run_id, created_at DESC);

CREATE INDEX idx_integration_sync_logs_sync_run ON public.integration_sync_logs USING btree (sync_run_id);

CREATE INDEX idx_integration_sync_logs_tenant_org ON public.integration_sync_logs USING btree (tenant_id, organization_id);

CREATE INDEX idx_integration_sync_runs_agent ON public.integration_sync_runs USING btree (agent_id);

CREATE INDEX idx_integration_sync_runs_org ON public.integration_sync_runs USING btree (tenant_id, organization_id);

CREATE INDEX idx_integration_sync_runs_source ON public.integration_sync_runs USING btree (integration_source_id, started_at DESC);

CREATE INDEX idx_integration_sync_runs_started_at ON public.integration_sync_runs USING btree (started_at DESC);

CREATE INDEX idx_integration_sync_runs_tenant_org ON public.integration_sync_runs USING btree (tenant_id, organization_id);

CREATE INDEX idx_job_queue_status_checked_at ON public.job_queue_status USING btree (checked_at DESC);

CREATE INDEX idx_job_queue_status_queue_name ON public.job_queue_status USING btree (queue_name);

CREATE INDEX idx_job_queue_status_queue_type ON public.job_queue_status USING btree (queue_type);

CREATE INDEX idx_knowledge_article_versions_article_id ON public.knowledge_article_versions USING btree (article_id);

CREATE INDEX idx_knowledge_articles_article_type ON public.knowledge_articles USING btree (article_type);

CREATE INDEX idx_knowledge_articles_category_id ON public.knowledge_articles USING btree (category_id);

CREATE INDEX idx_knowledge_articles_module ON public.knowledge_articles USING btree (module);

CREATE INDEX idx_knowledge_articles_status ON public.knowledge_articles USING btree (status);

CREATE INDEX idx_knowledge_categories_parent_id ON public.knowledge_categories USING btree (parent_id);

CREATE INDEX idx_knowledge_categories_slug ON public.knowledge_categories USING btree (slug);

CREATE INDEX idx_knowledge_faqs_category_id ON public.knowledge_faqs USING btree (category_id);

CREATE INDEX idx_knowledge_faqs_module ON public.knowledge_faqs USING btree (module);

CREATE INDEX idx_knowledge_feedback_article_id ON public.knowledge_feedback USING btree (article_id);

CREATE INDEX idx_knowledge_feedback_faq_id ON public.knowledge_feedback USING btree (faq_id);

CREATE INDEX idx_maintenance_runs_created_at ON public.maintenance_runs USING btree (created_at DESC);

CREATE INDEX idx_maintenance_runs_status ON public.maintenance_runs USING btree (status);

CREATE INDEX idx_maintenance_runs_task_id ON public.maintenance_runs USING btree (maintenance_task_id);

CREATE INDEX idx_maintenance_tasks_is_active ON public.maintenance_tasks USING btree (is_active);

CREATE INDEX idx_maintenance_tasks_next_run_at ON public.maintenance_tasks USING btree (next_run_at);

CREATE INDEX idx_maintenance_tasks_task_type ON public.maintenance_tasks USING btree (task_type);

CREATE INDEX idx_media_access_logs_created_at ON public.media_access_logs USING btree (created_at DESC);

CREATE INDEX idx_media_access_logs_media_file_id ON public.media_access_logs USING btree (media_file_id);

CREATE INDEX idx_media_processing_jobs_media_file_id ON public.media_processing_jobs USING btree (media_file_id);

CREATE INDEX idx_media_processing_jobs_scheduled_at ON public.media_processing_jobs USING btree (scheduled_at);

CREATE INDEX idx_media_processing_jobs_status ON public.media_processing_jobs USING btree (status);

CREATE INDEX idx_message_media_channel_id ON public.message_media USING btree (channel_id);

CREATE INDEX idx_message_media_message_id ON public.message_media USING btree (message_id);

CREATE INDEX idx_message_media_provider_media_id ON public.message_media USING btree (provider, provider_media_id) WHERE (provider_media_id IS NOT NULL);

CREATE INDEX idx_message_media_tenant_org ON public.message_media USING btree (tenant_id, organization_id);

CREATE INDEX idx_message_transcriptions_channel_id ON public.message_transcriptions USING btree (channel_id);

CREATE INDEX idx_message_transcriptions_media_id ON public.message_transcriptions USING btree (media_id);

CREATE INDEX idx_message_transcriptions_message_id ON public.message_transcriptions USING btree (message_id);

CREATE INDEX idx_message_transcriptions_status ON public.message_transcriptions USING btree (status, created_at);

CREATE INDEX idx_message_transcriptions_tenant_org ON public.message_transcriptions USING btree (tenant_id, organization_id);

CREATE INDEX idx_messaging_policies_channel ON public.messaging_policies USING btree (channel);

CREATE INDEX idx_messaging_policies_type ON public.messaging_policies USING btree (policy_type);

CREATE INDEX idx_navigation_items_module ON public.navigation_items USING btree (module);

CREATE INDEX idx_navigation_items_parent_id ON public.navigation_items USING btree (parent_id);

CREATE INDEX idx_navigation_items_sort_order ON public.navigation_items USING btree (sort_order);

CREATE INDEX idx_notification_deliveries_channel_key ON public.notification_deliveries USING btree (channel_key);

CREATE INDEX idx_notification_deliveries_notification_id ON public.notification_deliveries USING btree (notification_id);

CREATE INDEX idx_notification_deliveries_status ON public.notification_deliveries USING btree (status);

CREATE INDEX idx_notification_rules_event_type ON public.notification_rules USING btree (event_type);

CREATE INDEX idx_notification_rules_module ON public.notification_rules USING btree (module);

CREATE INDEX idx_notification_templates_event_type ON public.notification_templates USING btree (event_type);

CREATE INDEX idx_notification_templates_module ON public.notification_templates USING btree (module);

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);

CREATE INDEX idx_notifications_module ON public.notifications USING btree (module);

CREATE INDEX idx_notifications_priority ON public.notifications USING btree (priority);

CREATE INDEX idx_notifications_recipient_user_id ON public.notifications USING btree (recipient_user_id);

CREATE INDEX idx_notifications_status ON public.notifications USING btree (status);

CREATE INDEX idx_notifications_tenant_id ON public.notifications USING btree (tenant_id);

CREATE INDEX idx_onboarding_steps_flow_id ON public.onboarding_steps USING btree (flow_id);

CREATE INDEX idx_onboarding_steps_module ON public.onboarding_steps USING btree (module);

CREATE INDEX idx_operational_checklist_items_checklist_id ON public.operational_checklist_items USING btree (checklist_id);

CREATE INDEX idx_operational_checklist_runs_checklist_id ON public.operational_checklist_runs USING btree (checklist_id);

CREATE INDEX idx_operational_checklist_runs_run_date ON public.operational_checklist_runs USING btree (run_date DESC);

CREATE INDEX idx_organization_pipeline_stages_organization_id ON public.organization_pipeline_stages USING btree (organization_id);

CREATE INDEX idx_organization_pipelines_organization_id ON public.organization_pipelines USING btree (organization_id);

CREATE INDEX idx_organization_products_services_organization_id ON public.organization_products_services USING btree (organization_id);

CREATE INDEX idx_organization_profiles_organization_id ON public.organization_profiles USING btree (organization_id);

CREATE INDEX idx_organization_tags_organization_id ON public.organization_tags USING btree (organization_id);

CREATE INDEX idx_outbound_webhook_attempts_delivery_id ON public.outbound_webhook_attempts USING btree (delivery_id);

CREATE INDEX idx_outbound_webhook_attempts_status ON public.outbound_webhook_attempts USING btree (status);

CREATE INDEX idx_outbound_webhook_deliveries_integration_id ON public.outbound_webhook_deliveries USING btree (integration_id);

CREATE INDEX idx_outbound_webhook_deliveries_next_retry_at ON public.outbound_webhook_deliveries USING btree (next_retry_at);

CREATE INDEX idx_outbound_webhook_deliveries_scheduled_at ON public.outbound_webhook_deliveries USING btree (scheduled_at);

CREATE INDEX idx_outbound_webhook_deliveries_status ON public.outbound_webhook_deliveries USING btree (status);

CREATE INDEX idx_outbound_webhook_deliveries_webhook_id ON public.outbound_webhook_deliveries USING btree (webhook_id);

CREATE INDEX idx_outbound_webhooks_integration_id ON public.outbound_webhooks USING btree (integration_id);

CREATE INDEX idx_outbound_webhooks_is_active ON public.outbound_webhooks USING btree (is_active);

CREATE INDEX idx_provider_events_event_created_at ON public.provider_events USING btree (event, created_at DESC);

CREATE INDEX idx_provider_events_message_revoke_lookup ON public.provider_events USING btree (((payload ->> 'id'::text))) WHERE (event = ANY (ARRAY['message_revoke'::text, 'message.revoked'::text, 'message.deleted'::text]));

CREATE INDEX idx_provider_events_organization_id ON public.provider_events USING btree (organization_id);

CREATE INDEX idx_qa_bugs_created_at ON public.qa_bugs USING btree (created_at DESC);

CREATE INDEX idx_qa_bugs_module ON public.qa_bugs USING btree (module);

CREATE INDEX idx_qa_bugs_severity ON public.qa_bugs USING btree (severity);

CREATE INDEX idx_qa_bugs_status ON public.qa_bugs USING btree (status);

CREATE INDEX idx_qa_test_cases_module ON public.qa_test_cases USING btree (module);

CREATE INDEX idx_qa_test_cases_status ON public.qa_test_cases USING btree (status);

CREATE INDEX idx_qa_test_cases_test_plan_id ON public.qa_test_cases USING btree (test_plan_id);

CREATE INDEX idx_qa_test_plans_module ON public.qa_test_plans USING btree (module);

CREATE INDEX idx_qa_test_plans_status ON public.qa_test_plans USING btree (status);

CREATE INDEX idx_qa_test_results_status ON public.qa_test_results USING btree (status);

CREATE INDEX idx_qa_test_results_test_case_id ON public.qa_test_results USING btree (test_case_id);

CREATE INDEX idx_qa_test_results_test_run_id ON public.qa_test_results USING btree (test_run_id);

CREATE INDEX idx_qa_test_runs_environment ON public.qa_test_runs USING btree (environment);

CREATE INDEX idx_qa_test_runs_status ON public.qa_test_runs USING btree (status);

CREATE INDEX idx_qa_test_runs_test_plan_id ON public.qa_test_runs USING btree (test_plan_id);

CREATE INDEX idx_quick_replies_category ON public.quick_replies USING btree (category);

CREATE INDEX idx_quick_replies_is_active ON public.quick_replies USING btree (is_active);

CREATE INDEX idx_quick_replies_language ON public.quick_replies USING btree (language);

CREATE INDEX idx_quick_replies_org ON public.quick_replies USING btree (organization_id);

CREATE INDEX idx_quick_replies_organization_id ON public.quick_replies USING btree (organization_id);

CREATE INDEX idx_reminders_event_id ON public.reminders USING btree (event_id);

CREATE INDEX idx_reminders_recipient_user_id ON public.reminders USING btree (recipient_user_id);

CREATE INDEX idx_reminders_scheduled_at ON public.reminders USING btree (scheduled_at);

CREATE INDEX idx_reminders_status ON public.reminders USING btree (status);

CREATE INDEX idx_reminders_task_id ON public.reminders USING btree (task_id);

CREATE INDEX idx_reminders_tenant_id ON public.reminders USING btree (tenant_id);

CREATE INDEX idx_saved_searches_app_user_id ON public.saved_searches USING btree (app_user_id);

CREATE INDEX idx_saved_searches_tenant_id ON public.saved_searches USING btree (tenant_id);

CREATE INDEX idx_search_queries_created_at ON public.search_queries USING btree (created_at DESC);

CREATE INDEX idx_search_queries_query_text ON public.search_queries USING btree (query_text);

CREATE INDEX idx_search_queries_tenant_id ON public.search_queries USING btree (tenant_id);

CREATE INDEX idx_security_events_event_type ON public.security_events USING btree (event_type);

CREATE INDEX idx_security_events_occurred_at ON public.security_events USING btree (occurred_at DESC);

CREATE INDEX idx_security_events_severity ON public.security_events USING btree (severity);

CREATE INDEX idx_security_events_status ON public.security_events USING btree (status);

CREATE INDEX idx_security_events_user_id ON public.security_events USING btree (user_id);

CREATE INDEX idx_setup_answers_session_id ON public.setup_answers USING btree (session_id);

CREATE INDEX idx_setup_answers_tenant_id ON public.setup_answers USING btree (tenant_id);

CREATE INDEX idx_setup_assistant_sessions_status ON public.setup_assistant_sessions USING btree (status);

CREATE INDEX idx_setup_assistant_sessions_tenant_id ON public.setup_assistant_sessions USING btree (tenant_id);

CREATE INDEX idx_setup_questions_module ON public.setup_questions USING btree (module);

CREATE INDEX idx_setup_validation_checks_module ON public.setup_validation_checks USING btree (module);

CREATE INDEX idx_setup_validation_results_status ON public.setup_validation_results USING btree (status);

CREATE INDEX idx_setup_validation_results_tenant_id ON public.setup_validation_results USING btree (tenant_id);

CREATE INDEX idx_support_queue_agents_queue_id ON public.support_queue_agents USING btree (queue_id);

CREATE INDEX idx_support_queue_agents_user_id ON public.support_queue_agents USING btree (user_id);

CREATE INDEX idx_support_queues_is_active ON public.support_queues USING btree (is_active);

CREATE INDEX idx_support_scripts_module ON public.support_scripts USING btree (module);

CREATE INDEX idx_support_scripts_script_type ON public.support_scripts USING btree (script_type);

CREATE INDEX idx_system_alerts_alert_type ON public.system_alerts USING btree (alert_type);

CREATE INDEX idx_system_alerts_created_at ON public.system_alerts USING btree (created_at DESC);

CREATE INDEX idx_system_alerts_severity ON public.system_alerts USING btree (severity);

CREATE INDEX idx_system_alerts_status ON public.system_alerts USING btree (status);

CREATE INDEX idx_system_health_checks_check_type ON public.system_health_checks USING btree (check_type);

CREATE INDEX idx_system_health_checks_checked_at ON public.system_health_checks USING btree (checked_at DESC);

CREATE INDEX idx_system_health_checks_status ON public.system_health_checks USING btree (status);

CREATE INDEX idx_system_messages_is_active ON public.system_messages USING btree (is_active);

CREATE INDEX idx_system_messages_module ON public.system_messages USING btree (module);

CREATE INDEX idx_tenant_domains_domain ON public.tenant_domains USING btree (domain);

CREATE INDEX idx_tenant_domains_tenant_id ON public.tenant_domains USING btree (tenant_id);

CREATE INDEX idx_tenant_navigation_overrides_tenant_id ON public.tenant_navigation_overrides USING btree (tenant_id);

CREATE INDEX idx_tenant_onboarding_progress_status ON public.tenant_onboarding_progress USING btree (status);

CREATE INDEX idx_tenant_onboarding_progress_tenant_id ON public.tenant_onboarding_progress USING btree (tenant_id);

CREATE INDEX idx_tenant_onboarding_step_status_status ON public.tenant_onboarding_step_status USING btree (status);

CREATE INDEX idx_tenant_onboarding_step_status_step_id ON public.tenant_onboarding_step_status USING btree (step_id);

CREATE INDEX idx_tenant_onboarding_step_status_tenant_id ON public.tenant_onboarding_step_status USING btree (tenant_id);

CREATE INDEX idx_tenant_settings_module ON public.tenant_settings USING btree (module);

CREATE INDEX idx_tenant_settings_tenant_id ON public.tenant_settings USING btree (tenant_id);

CREATE INDEX idx_tenant_subscriptions_plan_id ON public.tenant_subscriptions USING btree (plan_id);

CREATE INDEX idx_tenant_subscriptions_status ON public.tenant_subscriptions USING btree (status);

CREATE INDEX idx_tenant_subscriptions_tenant_id ON public.tenant_subscriptions USING btree (tenant_id);

CREATE INDEX idx_tenant_ui_preferences_tenant_id ON public.tenant_ui_preferences USING btree (tenant_id);

CREATE INDEX idx_tenant_usage_metrics_metric_month ON public.tenant_usage_metrics USING btree (metric_month DESC);

CREATE INDEX idx_tenant_usage_metrics_tenant_id ON public.tenant_usage_metrics USING btree (tenant_id);

CREATE INDEX idx_tenants_slug ON public.tenants USING btree (slug);

CREATE INDEX idx_tenants_status ON public.tenants USING btree (status);

CREATE INDEX idx_training_lessons_article_id ON public.training_lessons USING btree (article_id);

CREATE INDEX idx_training_lessons_program_id ON public.training_lessons USING btree (program_id);

CREATE INDEX idx_training_progress_program_id ON public.training_progress USING btree (program_id);

CREATE INDEX idx_training_progress_status ON public.training_progress USING btree (status);

CREATE INDEX idx_training_progress_user_id ON public.training_progress USING btree (user_id);

CREATE INDEX idx_transcription_jobs_channel_id ON public.transcription_jobs USING btree (channel_id);

CREATE INDEX idx_transcription_jobs_media_id ON public.transcription_jobs USING btree (media_id);

CREATE INDEX idx_transcription_jobs_message_id ON public.transcription_jobs USING btree (message_id);

CREATE INDEX idx_transcription_jobs_queue ON public.transcription_jobs USING btree (status, priority, scheduled_at, created_at);

CREATE INDEX idx_translation_keys_module ON public.translation_keys USING btree (module);

CREATE INDEX idx_translations_locale_code ON public.translations USING btree (locale_code);

CREATE INDEX idx_user_notification_preferences_user_id ON public.user_notification_preferences USING btree (user_id);

CREATE INDEX idx_user_sessions_last_seen_at ON public.user_sessions USING btree (last_seen_at DESC);

CREATE INDEX idx_user_sessions_status ON public.user_sessions USING btree (status);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);

CREATE INDEX idx_whatsapp_audio_transcriptions_conversation_id ON public.whatsapp_audio_transcriptions USING btree (conversation_id);

CREATE INDEX idx_whatsapp_audio_transcriptions_media_file_id ON public.whatsapp_audio_transcriptions USING btree (media_file_id);

CREATE INDEX idx_whatsapp_conversations_assigned_to ON public.whatsapp_conversations USING btree (assigned_to);

CREATE INDEX idx_whatsapp_conversations_external_chat_id ON public.whatsapp_conversations USING btree (external_chat_id);

CREATE INDEX idx_whatsapp_conversations_next_follow_up_at ON public.whatsapp_conversations USING btree (next_follow_up_at);

CREATE INDEX idx_whatsapp_conversations_org ON public.whatsapp_conversations USING btree (organization_id);

CREATE INDEX idx_whatsapp_conversations_organization_id ON public.whatsapp_conversations USING btree (organization_id);

CREATE INDEX idx_whatsapp_media_files_contact_id ON public.whatsapp_media_files USING btree (contact_id);

CREATE INDEX idx_whatsapp_media_files_conversation_id ON public.whatsapp_media_files USING btree (conversation_id);

CREATE INDEX idx_whatsapp_media_files_download_status ON public.whatsapp_media_files USING btree (download_status);

CREATE INDEX idx_whatsapp_media_files_external_chat_id ON public.whatsapp_media_files USING btree (external_chat_id);

CREATE INDEX idx_whatsapp_media_files_media_type ON public.whatsapp_media_files USING btree (media_type);

CREATE INDEX idx_whatsapp_media_files_message_id ON public.whatsapp_media_files USING btree (message_id);

CREATE INDEX idx_whatsapp_media_files_organization_id ON public.whatsapp_media_files USING btree (organization_id);

CREATE INDEX idx_whatsapp_media_files_tenant_id ON public.whatsapp_media_files USING btree (tenant_id);

CREATE INDEX idx_whatsapp_media_text_extractions_conversation_id ON public.whatsapp_media_text_extractions USING btree (conversation_id);

CREATE INDEX idx_whatsapp_media_text_extractions_media_file_id ON public.whatsapp_media_text_extractions USING btree (media_file_id);

CREATE INDEX idx_whatsapp_messages_conversation_created_at ON public.whatsapp_messages USING btree (conversation_id, created_at DESC);

CREATE INDEX idx_whatsapp_messages_deleted_by_sender ON public.whatsapp_messages USING btree (deleted_by_sender) WHERE (deleted_by_sender = true);

CREATE INDEX idx_whatsapp_messages_external_message_id ON public.whatsapp_messages USING btree (external_message_id);

CREATE INDEX idx_whatsapp_messages_has_media ON public.whatsapp_messages USING btree (has_media);

CREATE INDEX idx_whatsapp_messages_org ON public.whatsapp_messages USING btree (organization_id);

CREATE INDEX idx_whatsapp_messages_organization_id ON public.whatsapp_messages USING btree (organization_id);

CREATE INDEX idx_whatsapp_shared_contacts_conversation_id ON public.whatsapp_shared_contacts USING btree (conversation_id);

CREATE INDEX idx_whatsapp_shared_contacts_org_created ON public.whatsapp_shared_contacts USING btree (organization_id, created_at DESC);

CREATE INDEX idx_whatsapp_shared_contacts_shared_phone ON public.whatsapp_shared_contacts USING btree (shared_phone);

CREATE INDEX idx_whatsapp_shared_contacts_tenant_created ON public.whatsapp_shared_contacts USING btree (tenant_id, created_at DESC);

CREATE INDEX idx_whatsapp_shared_locations_contact_id ON public.whatsapp_shared_locations USING btree (contact_id);

CREATE INDEX idx_whatsapp_shared_locations_conversation_id ON public.whatsapp_shared_locations USING btree (conversation_id);

CREATE INDEX idx_whatsapp_shared_locations_org_created ON public.whatsapp_shared_locations USING btree (organization_id, created_at DESC);

CREATE INDEX idx_whatsapp_shared_locations_tenant_created ON public.whatsapp_shared_locations USING btree (tenant_id, created_at DESC);

CREATE INDEX idx_white_label_brands_organization_id ON public.white_label_brands USING btree (organization_id);

CREATE INDEX idx_white_label_brands_tenant_id ON public.white_label_brands USING btree (tenant_id);

CREATE UNIQUE INDEX import_column_mappings_name_key ON public.import_column_mappings USING btree (name);

CREATE UNIQUE INDEX import_column_mappings_pkey ON public.import_column_mappings USING btree (id);

CREATE UNIQUE INDEX import_deduplication_rules_name_key ON public.import_deduplication_rules USING btree (name);

CREATE UNIQUE INDEX import_deduplication_rules_pkey ON public.import_deduplication_rules USING btree (id);

CREATE UNIQUE INDEX import_jobs_pkey ON public.import_jobs USING btree (id);

CREATE UNIQUE INDEX import_logs_pkey ON public.import_logs USING btree (id);

CREATE UNIQUE INDEX import_rows_job_id_row_number_key ON public.import_rows USING btree (job_id, row_number);

CREATE UNIQUE INDEX import_rows_pkey ON public.import_rows USING btree (id);

CREATE UNIQUE INDEX inbound_webhook_endpoints_endpoint_key_key ON public.inbound_webhook_endpoints USING btree (endpoint_key);

CREATE UNIQUE INDEX inbound_webhook_endpoints_name_key ON public.inbound_webhook_endpoints USING btree (name);

CREATE UNIQUE INDEX inbound_webhook_endpoints_pkey ON public.inbound_webhook_endpoints USING btree (id);

CREATE UNIQUE INDEX inbound_webhook_events_pkey ON public.inbound_webhook_events USING btree (id);

CREATE UNIQUE INDEX integration_agents_pkey ON public.integration_agents USING btree (id);

CREATE UNIQUE INDEX integration_event_mappings_pkey ON public.integration_event_mappings USING btree (id);

CREATE UNIQUE INDEX integration_event_mappings_provider_external_event_type_int_key ON public.integration_event_mappings USING btree (provider, external_event_type, internal_event_type);

CREATE UNIQUE INDEX integration_sources_pkey ON public.integration_sources USING btree (id);

CREATE UNIQUE INDEX integration_sync_logs_pkey ON public.integration_sync_logs USING btree (id);

CREATE UNIQUE INDEX integration_sync_runs_pkey ON public.integration_sync_runs USING btree (id);

CREATE UNIQUE INDEX internal_messaging_gateways_pkey ON public.internal_messaging_gateways USING btree (id);

CREATE INDEX internal_messaging_gateways_tenant_idx ON public.internal_messaging_gateways USING btree (tenant_id);

CREATE UNIQUE INDEX internal_messaging_gateways_tenant_slug_uniq ON public.internal_messaging_gateways USING btree (tenant_id, slug);

CREATE INDEX internal_messaging_gateways_tenant_status_idx ON public.internal_messaging_gateways USING btree (tenant_id, status);

CREATE UNIQUE INDEX job_queue_status_pkey ON public.job_queue_status USING btree (id);

CREATE UNIQUE INDEX knowledge_article_versions_article_id_version_key ON public.knowledge_article_versions USING btree (article_id, version);

CREATE UNIQUE INDEX knowledge_article_versions_pkey ON public.knowledge_article_versions USING btree (id);

CREATE UNIQUE INDEX knowledge_articles_pkey ON public.knowledge_articles USING btree (id);

CREATE UNIQUE INDEX knowledge_articles_slug_key ON public.knowledge_articles USING btree (slug);

CREATE UNIQUE INDEX knowledge_categories_pkey ON public.knowledge_categories USING btree (id);

CREATE UNIQUE INDEX knowledge_categories_slug_key ON public.knowledge_categories USING btree (slug);

CREATE UNIQUE INDEX knowledge_faqs_pkey ON public.knowledge_faqs USING btree (id);

CREATE UNIQUE INDEX knowledge_feedback_pkey ON public.knowledge_feedback USING btree (id);

CREATE UNIQUE INDEX maintenance_runs_pkey ON public.maintenance_runs USING btree (id);

CREATE UNIQUE INDEX maintenance_tasks_name_key ON public.maintenance_tasks USING btree (name);

CREATE UNIQUE INDEX maintenance_tasks_pkey ON public.maintenance_tasks USING btree (id);

CREATE UNIQUE INDEX media_access_logs_pkey ON public.media_access_logs USING btree (id);

CREATE UNIQUE INDEX media_processing_jobs_pkey ON public.media_processing_jobs USING btree (id);

CREATE UNIQUE INDEX message_media_pkey ON public.message_media USING btree (id);

CREATE INDEX message_outbox_conversation_idx ON public.message_outbox USING btree (conversation_id);

CREATE UNIQUE INDEX message_outbox_pkey ON public.message_outbox USING btree (id);

CREATE INDEX message_outbox_status_scheduled_idx ON public.message_outbox USING btree (status, scheduled_at);

CREATE UNIQUE INDEX message_transcriptions_pkey ON public.message_transcriptions USING btree (id);

CREATE UNIQUE INDEX messaging_policies_name_key ON public.messaging_policies USING btree (name);

CREATE UNIQUE INDEX messaging_policies_pkey ON public.messaging_policies USING btree (id);

CREATE UNIQUE INDEX navigation_items_pkey ON public.navigation_items USING btree (id);

CREATE UNIQUE INDEX notification_channels_channel_key_key ON public.notification_channels USING btree (channel_key);

CREATE UNIQUE INDEX notification_channels_name_key ON public.notification_channels USING btree (name);

CREATE UNIQUE INDEX notification_channels_pkey ON public.notification_channels USING btree (id);

CREATE UNIQUE INDEX notification_deliveries_pkey ON public.notification_deliveries USING btree (id);

CREATE UNIQUE INDEX notification_rules_name_key ON public.notification_rules USING btree (name);

CREATE UNIQUE INDEX notification_rules_pkey ON public.notification_rules USING btree (id);

CREATE UNIQUE INDEX notification_templates_pkey ON public.notification_templates USING btree (id);

CREATE UNIQUE INDEX notification_templates_template_key_key ON public.notification_templates USING btree (template_key);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX onboarding_flows_name_key ON public.onboarding_flows USING btree (name);

CREATE UNIQUE INDEX onboarding_flows_pkey ON public.onboarding_flows USING btree (id);

CREATE UNIQUE INDEX onboarding_steps_flow_id_step_key_key ON public.onboarding_steps USING btree (flow_id, step_key);

CREATE UNIQUE INDEX onboarding_steps_pkey ON public.onboarding_steps USING btree (id);

CREATE UNIQUE INDEX operational_checklist_items_pkey ON public.operational_checklist_items USING btree (id);

CREATE UNIQUE INDEX operational_checklist_runs_pkey ON public.operational_checklist_runs USING btree (id);

CREATE UNIQUE INDEX operational_checklists_name_key ON public.operational_checklists USING btree (name);

CREATE UNIQUE INDEX operational_checklists_pkey ON public.operational_checklists USING btree (id);

CREATE UNIQUE INDEX organization_pipeline_stages_pipeline_id_stage_order_key ON public.organization_pipeline_stages USING btree (pipeline_id, stage_order);

CREATE UNIQUE INDEX organization_pipeline_stages_pkey ON public.organization_pipeline_stages USING btree (id);

CREATE UNIQUE INDEX organization_pipelines_pkey ON public.organization_pipelines USING btree (id);

CREATE UNIQUE INDEX organization_products_services_pkey ON public.organization_products_services USING btree (id);

CREATE UNIQUE INDEX organization_profiles_organization_id_key ON public.organization_profiles USING btree (organization_id);

CREATE UNIQUE INDEX organization_profiles_pkey ON public.organization_profiles USING btree (id);

CREATE UNIQUE INDEX organization_tags_organization_id_name_key ON public.organization_tags USING btree (organization_id, name);

CREATE UNIQUE INDEX organization_tags_pkey ON public.organization_tags USING btree (id);

CREATE UNIQUE INDEX organizations_slug_unique_idx ON public.organizations USING btree (slug);

CREATE UNIQUE INDEX outbound_webhook_attempts_pkey ON public.outbound_webhook_attempts USING btree (id);

CREATE UNIQUE INDEX outbound_webhook_deliveries_pkey ON public.outbound_webhook_deliveries USING btree (id);

CREATE UNIQUE INDEX outbound_webhooks_name_key ON public.outbound_webhooks USING btree (name);

CREATE UNIQUE INDEX outbound_webhooks_pkey ON public.outbound_webhooks USING btree (id);

CREATE UNIQUE INDEX payment_methods_name_key ON public.payment_methods USING btree (name);

CREATE UNIQUE INDEX payment_methods_pkey ON public.payment_methods USING btree (id);

CREATE UNIQUE INDEX provider_events_channel_event_uniq ON public.provider_events USING btree (channel_id, provider, external_event_id) WHERE ((channel_id IS NOT NULL) AND (external_event_id IS NOT NULL));

CREATE INDEX provider_events_event_idx ON public.provider_events USING btree (event);

CREATE INDEX provider_events_org_event_created_idx ON public.provider_events USING btree (organization_id, event, created_at DESC);

CREATE INDEX provider_events_tenant_event_created_idx ON public.provider_events USING btree (tenant_id, event, created_at DESC);

CREATE UNIQUE INDEX provider_events_unresolved_hash_uniq ON public.provider_events USING btree (provider, payload_hash) WHERE ((channel_id IS NULL) AND (payload_hash IS NOT NULL));

CREATE UNIQUE INDEX qa_bugs_pkey ON public.qa_bugs USING btree (id);

CREATE UNIQUE INDEX qa_test_cases_pkey ON public.qa_test_cases USING btree (id);

CREATE UNIQUE INDEX qa_test_plans_name_key ON public.qa_test_plans USING btree (name);

CREATE UNIQUE INDEX qa_test_plans_pkey ON public.qa_test_plans USING btree (id);

CREATE UNIQUE INDEX qa_test_results_pkey ON public.qa_test_results USING btree (id);

CREATE UNIQUE INDEX qa_test_runs_pkey ON public.qa_test_runs USING btree (id);

CREATE INDEX quick_replies_org_active_category_idx ON public.quick_replies USING btree (organization_id, tenant_id, is_active, category, title) WHERE ((organization_id IS NOT NULL) AND (tenant_id IS NOT NULL));

CREATE UNIQUE INDEX reminders_pkey ON public.reminders USING btree (id);

CREATE UNIQUE INDEX saved_searches_pkey ON public.saved_searches USING btree (id);

CREATE UNIQUE INDEX search_queries_pkey ON public.search_queries USING btree (id);

CREATE UNIQUE INDEX search_settings_pkey ON public.search_settings USING btree (id);

CREATE UNIQUE INDEX search_settings_setting_key_key ON public.search_settings USING btree (setting_key);

CREATE UNIQUE INDEX security_events_pkey ON public.security_events USING btree (id);

CREATE UNIQUE INDEX security_rules_name_key ON public.security_rules USING btree (name);

CREATE UNIQUE INDEX security_rules_pkey ON public.security_rules USING btree (id);

CREATE UNIQUE INDEX setup_answers_pkey ON public.setup_answers USING btree (id);

CREATE UNIQUE INDEX setup_answers_session_id_question_id_key ON public.setup_answers USING btree (session_id, question_id);

CREATE UNIQUE INDEX setup_assistant_sessions_pkey ON public.setup_assistant_sessions USING btree (id);

CREATE UNIQUE INDEX setup_questions_pkey ON public.setup_questions USING btree (id);

CREATE UNIQUE INDEX setup_questions_question_key_key ON public.setup_questions USING btree (question_key);

CREATE UNIQUE INDEX setup_validation_checks_check_key_key ON public.setup_validation_checks USING btree (check_key);

CREATE UNIQUE INDEX setup_validation_checks_pkey ON public.setup_validation_checks USING btree (id);

CREATE UNIQUE INDEX setup_validation_results_pkey ON public.setup_validation_results USING btree (id);

CREATE UNIQUE INDEX setup_validation_results_tenant_id_check_id_key ON public.setup_validation_results USING btree (tenant_id, check_id);

CREATE UNIQUE INDEX subscription_plans_name_key ON public.subscription_plans USING btree (name);

CREATE UNIQUE INDEX subscription_plans_pkey ON public.subscription_plans USING btree (id);

CREATE UNIQUE INDEX subscription_plans_slug_key ON public.subscription_plans USING btree (slug);

CREATE UNIQUE INDEX support_queue_agents_pkey ON public.support_queue_agents USING btree (id);

CREATE UNIQUE INDEX support_queue_agents_queue_id_user_id_key ON public.support_queue_agents USING btree (queue_id, user_id);

CREATE UNIQUE INDEX support_queues_name_key ON public.support_queues USING btree (name);

CREATE UNIQUE INDEX support_queues_pkey ON public.support_queues USING btree (id);

CREATE UNIQUE INDEX support_scripts_name_key ON public.support_scripts USING btree (name);

CREATE UNIQUE INDEX support_scripts_pkey ON public.support_scripts USING btree (id);

CREATE UNIQUE INDEX supported_locales_locale_code_key ON public.supported_locales USING btree (locale_code);

CREATE UNIQUE INDEX supported_locales_pkey ON public.supported_locales USING btree (id);

CREATE UNIQUE INDEX system_alerts_pkey ON public.system_alerts USING btree (id);

CREATE UNIQUE INDEX system_health_checks_pkey ON public.system_health_checks USING btree (id);

CREATE UNIQUE INDEX system_messages_message_key_key ON public.system_messages USING btree (message_key);

CREATE UNIQUE INDEX system_messages_pkey ON public.system_messages USING btree (id);

CREATE UNIQUE INDEX tenant_domains_domain_key ON public.tenant_domains USING btree (domain);

CREATE UNIQUE INDEX tenant_domains_pkey ON public.tenant_domains USING btree (id);

CREATE UNIQUE INDEX tenant_navigation_overrides_pkey ON public.tenant_navigation_overrides USING btree (id);

CREATE UNIQUE INDEX tenant_navigation_overrides_tenant_id_navigation_item_id_key ON public.tenant_navigation_overrides USING btree (tenant_id, navigation_item_id);

CREATE UNIQUE INDEX tenant_onboarding_progress_pkey ON public.tenant_onboarding_progress USING btree (id);

CREATE UNIQUE INDEX tenant_onboarding_progress_tenant_id_flow_id_key ON public.tenant_onboarding_progress USING btree (tenant_id, flow_id);

CREATE UNIQUE INDEX tenant_onboarding_step_status_pkey ON public.tenant_onboarding_step_status USING btree (id);

CREATE UNIQUE INDEX tenant_onboarding_step_status_tenant_id_step_id_key ON public.tenant_onboarding_step_status USING btree (tenant_id, step_id);

CREATE UNIQUE INDEX tenant_settings_pkey ON public.tenant_settings USING btree (id);

CREATE UNIQUE INDEX tenant_settings_tenant_id_setting_key_key ON public.tenant_settings USING btree (tenant_id, setting_key);

CREATE UNIQUE INDEX tenant_subscriptions_pkey ON public.tenant_subscriptions USING btree (id);

CREATE UNIQUE INDEX tenant_ui_preferences_pkey ON public.tenant_ui_preferences USING btree (id);

CREATE UNIQUE INDEX tenant_ui_preferences_tenant_id_key ON public.tenant_ui_preferences USING btree (tenant_id);

CREATE UNIQUE INDEX tenant_usage_metrics_pkey ON public.tenant_usage_metrics USING btree (id);

CREATE UNIQUE INDEX tenant_usage_metrics_tenant_id_metric_month_key ON public.tenant_usage_metrics USING btree (tenant_id, metric_month);

CREATE UNIQUE INDEX training_lessons_pkey ON public.training_lessons USING btree (id);

CREATE UNIQUE INDEX training_programs_name_key ON public.training_programs USING btree (name);

CREATE UNIQUE INDEX training_programs_pkey ON public.training_programs USING btree (id);

CREATE UNIQUE INDEX training_progress_pkey ON public.training_progress USING btree (id);

CREATE UNIQUE INDEX training_progress_program_id_lesson_id_user_id_key ON public.training_progress USING btree (program_id, lesson_id, user_id);

CREATE UNIQUE INDEX transcription_jobs_pkey ON public.transcription_jobs USING btree (id);

CREATE UNIQUE INDEX translation_keys_key_key ON public.translation_keys USING btree (key);

CREATE UNIQUE INDEX translation_keys_pkey ON public.translation_keys USING btree (id);

CREATE UNIQUE INDEX translations_pkey ON public.translations USING btree (id);

CREATE UNIQUE INDEX translations_translation_key_id_locale_code_key ON public.translations USING btree (translation_key_id, locale_code);

CREATE UNIQUE INDEX ui_themes_name_key ON public.ui_themes USING btree (name);

CREATE UNIQUE INDEX ui_themes_pkey ON public.ui_themes USING btree (id);

CREATE UNIQUE INDEX ui_themes_slug_key ON public.ui_themes USING btree (slug);

CREATE UNIQUE INDEX uq_message_transcriptions_media_provider ON public.message_transcriptions USING btree (media_id, provider) WHERE (media_id IS NOT NULL);

CREATE UNIQUE INDEX uq_transcription_jobs_active_media ON public.transcription_jobs USING btree (media_id) WHERE (status = ANY (ARRAY['queued'::text, 'processing'::text]));

CREATE UNIQUE INDEX user_calendar_preferences_pkey ON public.user_calendar_preferences USING btree (id);

CREATE UNIQUE INDEX user_calendar_preferences_user_id_key ON public.user_calendar_preferences USING btree (user_id);

CREATE UNIQUE INDEX user_notification_preferences_pkey ON public.user_notification_preferences USING btree (id);

CREATE UNIQUE INDEX user_notification_preferences_user_id_module_notification_t_key ON public.user_notification_preferences USING btree (user_id, module, notification_type);

CREATE UNIQUE INDEX user_sessions_pkey ON public.user_sessions USING btree (id);

CREATE UNIQUE INDEX whatsapp_audio_transcriptions_pkey ON public.whatsapp_audio_transcriptions USING btree (id);

CREATE UNIQUE INDEX whatsapp_connections_org_provider_key_unique ON public.whatsapp_connections USING btree (organization_id, provider, connection_key) WHERE (is_active = true);

CREATE INDEX whatsapp_connections_org_status_idx ON public.whatsapp_connections USING btree (organization_id, status);

CREATE INDEX whatsapp_connections_tenant_org_idx ON public.whatsapp_connections USING btree (tenant_id, organization_id);

CREATE INDEX whatsapp_conversation_events_conversation_created_idx ON public.whatsapp_conversation_events USING btree (conversation_id, created_at DESC);

CREATE INDEX whatsapp_conversation_events_org_type_created_idx ON public.whatsapp_conversation_events USING btree (organization_id, event_type, created_at DESC);

CREATE UNIQUE INDEX whatsapp_conversations_channel_chat_uniq ON public.whatsapp_conversations USING btree (channel_id, external_chat_id) WHERE ((channel_id IS NOT NULL) AND (external_chat_id IS NOT NULL));

CREATE INDEX whatsapp_conversations_org_last_message_idx ON public.whatsapp_conversations USING btree (organization_id, tenant_id, last_message_at DESC) WHERE ((organization_id IS NOT NULL) AND (tenant_id IS NOT NULL));

CREATE UNIQUE INDEX whatsapp_conversations_org_provider_chat_unique ON public.whatsapp_conversations USING btree (organization_id, provider, external_chat_id) WHERE ((organization_id IS NOT NULL) AND (provider IS NOT NULL) AND (external_chat_id IS NOT NULL));

CREATE INDEX whatsapp_conversations_org_requires_human_idx ON public.whatsapp_conversations USING btree (organization_id, requires_human, last_message_at DESC);

CREATE INDEX whatsapp_conversations_org_sla_status_idx ON public.whatsapp_conversations USING btree (organization_id, sla_status, last_message_at DESC);

CREATE UNIQUE INDEX whatsapp_media_text_extractions_pkey ON public.whatsapp_media_text_extractions USING btree (id);

CREATE UNIQUE INDEX whatsapp_messages_channel_external_uniq ON public.whatsapp_messages USING btree (channel_id, external_message_id) WHERE ((channel_id IS NOT NULL) AND (external_message_id IS NOT NULL));

CREATE INDEX whatsapp_messages_org_conversation_created_idx ON public.whatsapp_messages USING btree (organization_id, tenant_id, conversation_id, created_at) WHERE ((organization_id IS NOT NULL) AND (tenant_id IS NOT NULL));

CREATE UNIQUE INDEX whatsapp_messages_org_provider_external_message_unique ON public.whatsapp_messages USING btree (organization_id, provider, external_message_id) WHERE ((organization_id IS NOT NULL) AND (provider IS NOT NULL) AND (external_message_id IS NOT NULL));

CREATE UNIQUE INDEX whatsapp_messages_provider_external_message_id_key ON public.whatsapp_messages USING btree (provider, external_message_id) WHERE (external_message_id IS NOT NULL);

CREATE UNIQUE INDEX white_label_brands_pkey ON public.white_label_brands USING btree (id);

CREATE INDEX provider_events_processing_status_idx ON public.provider_events USING btree (processing_status);

alter table "public"."access_attempts" add constraint "access_attempts_pkey" PRIMARY KEY using index "access_attempts_pkey";

alter table "public"."agent_automation_cooldown" add constraint "agent_automation_cooldown_pkey" PRIMARY KEY using index "agent_automation_cooldown_pkey";

alter table "public"."agent_automation_jobs" add constraint "agent_automation_jobs_pkey" PRIMARY KEY using index "agent_automation_jobs_pkey";

alter table "public"."agent_catalog_products" add constraint "agent_catalog_products_pkey" PRIMARY KEY using index "agent_catalog_products_pkey";

alter table "public"."agent_connector_types" add constraint "agent_connector_types_pkey" PRIMARY KEY using index "agent_connector_types_pkey";

alter table "public"."agent_dialog_templates" add constraint "agent_dialog_templates_pkey" PRIMARY KEY using index "agent_dialog_templates_pkey";

alter table "public"."agent_installations" add constraint "agent_installations_pkey" PRIMARY KEY using index "agent_installations_pkey";

alter table "public"."agent_presence" add constraint "agent_presence_pkey" PRIMARY KEY using index "agent_presence_pkey";

alter table "public"."agent_sync_runs" add constraint "agent_sync_runs_pkey" PRIMARY KEY using index "agent_sync_runs_pkey";

alter table "public"."ai_conversation_summaries" add constraint "ai_conversation_summaries_pkey" PRIMARY KEY using index "ai_conversation_summaries_pkey";

alter table "public"."ai_extracted_customer_data" add constraint "ai_extracted_customer_data_pkey" PRIMARY KEY using index "ai_extracted_customer_data_pkey";

alter table "public"."ai_lead_scores" add constraint "ai_lead_scores_pkey" PRIMARY KEY using index "ai_lead_scores_pkey";

alter table "public"."ai_objections" add constraint "ai_objections_pkey" PRIMARY KEY using index "ai_objections_pkey";

alter table "public"."ai_prompt_templates" add constraint "ai_prompt_templates_pkey" PRIMARY KEY using index "ai_prompt_templates_pkey";

alter table "public"."ai_reply_suggestions" add constraint "ai_reply_suggestions_pkey" PRIMARY KEY using index "ai_reply_suggestions_pkey";

alter table "public"."ai_runs" add constraint "ai_runs_pkey" PRIMARY KEY using index "ai_runs_pkey";

alter table "public"."api_tokens" add constraint "api_tokens_pkey" PRIMARY KEY using index "api_tokens_pkey";

alter table "public"."app_permissions" add constraint "app_permissions_pkey" PRIMARY KEY using index "app_permissions_pkey";

alter table "public"."app_settings" add constraint "app_settings_pkey" PRIMARY KEY using index "app_settings_pkey";

alter table "public"."app_user_permissions" add constraint "app_user_permissions_pkey" PRIMARY KEY using index "app_user_permissions_pkey";

alter table "public"."application_logs" add constraint "application_logs_pkey" PRIMARY KEY using index "application_logs_pkey";

alter table "public"."audit_trail" add constraint "audit_trail_pkey" PRIMARY KEY using index "audit_trail_pkey";

alter table "public"."automation_action_logs" add constraint "automation_action_logs_pkey" PRIMARY KEY using index "automation_action_logs_pkey";

alter table "public"."automation_actions" add constraint "automation_actions_pkey" PRIMARY KEY using index "automation_actions_pkey";

alter table "public"."automation_cooldowns" add constraint "automation_cooldowns_pkey" PRIMARY KEY using index "automation_cooldowns_pkey";

alter table "public"."automation_flows" add constraint "automation_flows_pkey" PRIMARY KEY using index "automation_flows_pkey";

alter table "public"."automation_runs" add constraint "automation_runs_pkey" PRIMARY KEY using index "automation_runs_pkey";

alter table "public"."automation_triggers" add constraint "automation_triggers_pkey" PRIMARY KEY using index "automation_triggers_pkey";

alter table "public"."backup_configs" add constraint "backup_configs_pkey" PRIMARY KEY using index "backup_configs_pkey";

alter table "public"."backup_runs" add constraint "backup_runs_pkey" PRIMARY KEY using index "backup_runs_pkey";

alter table "public"."billing_plan_price_rules" add constraint "billing_plan_price_rules_pkey" PRIMARY KEY using index "billing_plan_price_rules_pkey";

alter table "public"."blocked_contacts" add constraint "blocked_contacts_pkey" PRIMARY KEY using index "blocked_contacts_pkey";

alter table "public"."business_holidays" add constraint "business_holidays_pkey" PRIMARY KEY using index "business_holidays_pkey";

alter table "public"."business_hours" add constraint "business_hours_pkey" PRIMARY KEY using index "business_hours_pkey";

alter table "public"."calendar_event_participants" add constraint "calendar_event_participants_pkey" PRIMARY KEY using index "calendar_event_participants_pkey";

alter table "public"."calendar_event_templates" add constraint "calendar_event_templates_pkey" PRIMARY KEY using index "calendar_event_templates_pkey";

alter table "public"."calendar_events" add constraint "calendar_events_pkey" PRIMARY KEY using index "calendar_events_pkey";

alter table "public"."calendars" add constraint "calendars_pkey" PRIMARY KEY using index "calendars_pkey";

alter table "public"."catalog_categories" add constraint "catalog_categories_pkey" PRIMARY KEY using index "catalog_categories_pkey";

alter table "public"."catalog_items" add constraint "catalog_items_pkey" PRIMARY KEY using index "catalog_items_pkey";

alter table "public"."commercial_agent_profiles" add constraint "commercial_agent_profiles_pkey" PRIMARY KEY using index "commercial_agent_profiles_pkey";

alter table "public"."commercial_conversation_analysis" add constraint "commercial_conversation_analysis_pkey" PRIMARY KEY using index "commercial_conversation_analysis_pkey";

alter table "public"."commercial_follow_ups" add constraint "commercial_follow_ups_pkey" PRIMARY KEY using index "commercial_follow_ups_pkey";

alter table "public"."commercial_offer_items" add constraint "commercial_offer_items_pkey" PRIMARY KEY using index "commercial_offer_items_pkey";

alter table "public"."commercial_offers" add constraint "commercial_offers_pkey" PRIMARY KEY using index "commercial_offers_pkey";

alter table "public"."commercial_opportunities" add constraint "commercial_opportunities_pkey" PRIMARY KEY using index "commercial_opportunities_pkey";

alter table "public"."commercial_proposal_events" add constraint "commercial_proposal_events_pkey" PRIMARY KEY using index "commercial_proposal_events_pkey";

alter table "public"."commercial_proposal_items" add constraint "commercial_proposal_items_pkey" PRIMARY KEY using index "commercial_proposal_items_pkey";

alter table "public"."commercial_proposals" add constraint "commercial_proposals_pkey" PRIMARY KEY using index "commercial_proposals_pkey";

alter table "public"."commercial_response_suggestions" add constraint "commercial_response_suggestions_pkey" PRIMARY KEY using index "commercial_response_suggestions_pkey";

alter table "public"."consent_keywords" add constraint "consent_keywords_pkey" PRIMARY KEY using index "consent_keywords_pkey";

alter table "public"."consent_message_templates" add constraint "consent_message_templates_pkey" PRIMARY KEY using index "consent_message_templates_pkey";

alter table "public"."contact_identities" add constraint "contact_identities_pkey" PRIMARY KEY using index "contact_identities_pkey";

alter table "public"."conversation_assignment_events" add constraint "conversation_assignment_events_pkey" PRIMARY KEY using index "conversation_assignment_events_pkey";

alter table "public"."conversation_assignments" add constraint "conversation_assignments_pkey" PRIMARY KEY using index "conversation_assignments_pkey";

alter table "public"."conversation_flow_sessions" add constraint "conversation_flow_sessions_pkey" PRIMARY KEY using index "conversation_flow_sessions_pkey";

alter table "public"."conversation_flow_steps" add constraint "conversation_flow_steps_pkey" PRIMARY KEY using index "conversation_flow_steps_pkey";

alter table "public"."conversation_flows" add constraint "conversation_flows_pkey" PRIMARY KEY using index "conversation_flows_pkey";

alter table "public"."conversation_notes" add constraint "conversation_notes_pkey" PRIMARY KEY using index "conversation_notes_pkey";

alter table "public"."crm_activities" add constraint "crm_activities_pkey" PRIMARY KEY using index "crm_activities_pkey";

alter table "public"."crm_campaign_recipients" add constraint "crm_campaign_recipients_pkey" PRIMARY KEY using index "crm_campaign_recipients_pkey";

alter table "public"."crm_campaigns" add constraint "crm_campaigns_pkey" PRIMARY KEY using index "crm_campaigns_pkey";

alter table "public"."crm_consent_events" add constraint "crm_consent_events_pkey" PRIMARY KEY using index "crm_consent_events_pkey";

alter table "public"."crm_contact_list_items" add constraint "crm_contact_list_items_pkey" PRIMARY KEY using index "crm_contact_list_items_pkey";

alter table "public"."crm_contact_lists" add constraint "crm_contact_lists_pkey" PRIMARY KEY using index "crm_contact_lists_pkey";

alter table "public"."crm_contact_tags" add constraint "crm_contact_tags_pkey" PRIMARY KEY using index "crm_contact_tags_pkey";

alter table "public"."crm_deals" add constraint "crm_deals_pkey" PRIMARY KEY using index "crm_deals_pkey";

alter table "public"."crm_pipeline_stages" add constraint "crm_pipeline_stages_pkey" PRIMARY KEY using index "crm_pipeline_stages_pkey";

alter table "public"."crm_tags" add constraint "crm_tags_pkey" PRIMARY KEY using index "crm_tags_pkey";

alter table "public"."crm_task_templates" add constraint "crm_task_templates_pkey" PRIMARY KEY using index "crm_task_templates_pkey";

alter table "public"."crm_tasks" add constraint "crm_tasks_pkey" PRIMARY KEY using index "crm_tasks_pkey";

alter table "public"."deploy_checklist_items" add constraint "deploy_checklist_items_pkey" PRIMARY KEY using index "deploy_checklist_items_pkey";

alter table "public"."deploy_checklists" add constraint "deploy_checklists_pkey" PRIMARY KEY using index "deploy_checklists_pkey";

alter table "public"."deployments" add constraint "deployments_pkey" PRIMARY KEY using index "deployments_pkey";

alter table "public"."document_acceptances" add constraint "document_acceptances_pkey" PRIMARY KEY using index "document_acceptances_pkey";

alter table "public"."document_events" add constraint "document_events_pkey" PRIMARY KEY using index "document_events_pkey";

alter table "public"."document_files" add constraint "document_files_pkey" PRIMARY KEY using index "document_files_pkey";

alter table "public"."document_public_links" add constraint "document_public_links_pkey" PRIMARY KEY using index "document_public_links_pkey";

alter table "public"."document_templates" add constraint "document_templates_pkey" PRIMARY KEY using index "document_templates_pkey";

alter table "public"."documents" add constraint "documents_pkey" PRIMARY KEY using index "documents_pkey";

alter table "public"."external_integrations" add constraint "external_integrations_pkey" PRIMARY KEY using index "external_integrations_pkey";

alter table "public"."file_access_logs" add constraint "file_access_logs_pkey" PRIMARY KEY using index "file_access_logs_pkey";

alter table "public"."file_folders" add constraint "file_folders_pkey" PRIMARY KEY using index "file_folders_pkey";

alter table "public"."file_shares" add constraint "file_shares_pkey" PRIMARY KEY using index "file_shares_pkey";

alter table "public"."file_tag_links" add constraint "file_tag_links_pkey" PRIMARY KEY using index "file_tag_links_pkey";

alter table "public"."file_tags" add constraint "file_tags_pkey" PRIMARY KEY using index "file_tags_pkey";

alter table "public"."file_versions" add constraint "file_versions_pkey" PRIMARY KEY using index "file_versions_pkey";

alter table "public"."files" add constraint "files_pkey" PRIMARY KEY using index "files_pkey";

alter table "public"."finance_accounts" add constraint "finance_accounts_pkey" PRIMARY KEY using index "finance_accounts_pkey";

alter table "public"."finance_events" add constraint "finance_events_pkey" PRIMARY KEY using index "finance_events_pkey";

alter table "public"."finance_installments" add constraint "finance_installments_pkey" PRIMARY KEY using index "finance_installments_pkey";

alter table "public"."finance_invoice_items" add constraint "finance_invoice_items_pkey" PRIMARY KEY using index "finance_invoice_items_pkey";

alter table "public"."finance_invoices" add constraint "finance_invoices_pkey" PRIMARY KEY using index "finance_invoices_pkey";

alter table "public"."global_search_index" add constraint "global_search_index_pkey" PRIMARY KEY using index "global_search_index_pkey";

alter table "public"."import_column_mappings" add constraint "import_column_mappings_pkey" PRIMARY KEY using index "import_column_mappings_pkey";

alter table "public"."import_deduplication_rules" add constraint "import_deduplication_rules_pkey" PRIMARY KEY using index "import_deduplication_rules_pkey";

alter table "public"."import_jobs" add constraint "import_jobs_pkey" PRIMARY KEY using index "import_jobs_pkey";

alter table "public"."import_logs" add constraint "import_logs_pkey" PRIMARY KEY using index "import_logs_pkey";

alter table "public"."import_rows" add constraint "import_rows_pkey" PRIMARY KEY using index "import_rows_pkey";

alter table "public"."inbound_webhook_endpoints" add constraint "inbound_webhook_endpoints_pkey" PRIMARY KEY using index "inbound_webhook_endpoints_pkey";

alter table "public"."inbound_webhook_events" add constraint "inbound_webhook_events_pkey" PRIMARY KEY using index "inbound_webhook_events_pkey";

alter table "public"."integration_agents" add constraint "integration_agents_pkey" PRIMARY KEY using index "integration_agents_pkey";

alter table "public"."integration_event_mappings" add constraint "integration_event_mappings_pkey" PRIMARY KEY using index "integration_event_mappings_pkey";

alter table "public"."integration_sources" add constraint "integration_sources_pkey" PRIMARY KEY using index "integration_sources_pkey";

alter table "public"."integration_sync_logs" add constraint "integration_sync_logs_pkey" PRIMARY KEY using index "integration_sync_logs_pkey";

alter table "public"."integration_sync_runs" add constraint "integration_sync_runs_pkey" PRIMARY KEY using index "integration_sync_runs_pkey";

alter table "public"."internal_messaging_gateways" add constraint "internal_messaging_gateways_pkey" PRIMARY KEY using index "internal_messaging_gateways_pkey";

alter table "public"."job_queue_status" add constraint "job_queue_status_pkey" PRIMARY KEY using index "job_queue_status_pkey";

alter table "public"."knowledge_article_versions" add constraint "knowledge_article_versions_pkey" PRIMARY KEY using index "knowledge_article_versions_pkey";

alter table "public"."knowledge_articles" add constraint "knowledge_articles_pkey" PRIMARY KEY using index "knowledge_articles_pkey";

alter table "public"."knowledge_categories" add constraint "knowledge_categories_pkey" PRIMARY KEY using index "knowledge_categories_pkey";

alter table "public"."knowledge_faqs" add constraint "knowledge_faqs_pkey" PRIMARY KEY using index "knowledge_faqs_pkey";

alter table "public"."knowledge_feedback" add constraint "knowledge_feedback_pkey" PRIMARY KEY using index "knowledge_feedback_pkey";

alter table "public"."maintenance_runs" add constraint "maintenance_runs_pkey" PRIMARY KEY using index "maintenance_runs_pkey";

alter table "public"."maintenance_tasks" add constraint "maintenance_tasks_pkey" PRIMARY KEY using index "maintenance_tasks_pkey";

alter table "public"."media_access_logs" add constraint "media_access_logs_pkey" PRIMARY KEY using index "media_access_logs_pkey";

alter table "public"."media_processing_jobs" add constraint "media_processing_jobs_pkey" PRIMARY KEY using index "media_processing_jobs_pkey";

alter table "public"."message_media" add constraint "message_media_pkey" PRIMARY KEY using index "message_media_pkey";

alter table "public"."message_outbox" add constraint "message_outbox_pkey" PRIMARY KEY using index "message_outbox_pkey";

alter table "public"."message_transcriptions" add constraint "message_transcriptions_pkey" PRIMARY KEY using index "message_transcriptions_pkey";

alter table "public"."messaging_policies" add constraint "messaging_policies_pkey" PRIMARY KEY using index "messaging_policies_pkey";

alter table "public"."navigation_items" add constraint "navigation_items_pkey" PRIMARY KEY using index "navigation_items_pkey";

alter table "public"."notification_channels" add constraint "notification_channels_pkey" PRIMARY KEY using index "notification_channels_pkey";

alter table "public"."notification_deliveries" add constraint "notification_deliveries_pkey" PRIMARY KEY using index "notification_deliveries_pkey";

alter table "public"."notification_rules" add constraint "notification_rules_pkey" PRIMARY KEY using index "notification_rules_pkey";

alter table "public"."notification_templates" add constraint "notification_templates_pkey" PRIMARY KEY using index "notification_templates_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."onboarding_flows" add constraint "onboarding_flows_pkey" PRIMARY KEY using index "onboarding_flows_pkey";

alter table "public"."onboarding_steps" add constraint "onboarding_steps_pkey" PRIMARY KEY using index "onboarding_steps_pkey";

alter table "public"."operational_checklist_items" add constraint "operational_checklist_items_pkey" PRIMARY KEY using index "operational_checklist_items_pkey";

alter table "public"."operational_checklist_runs" add constraint "operational_checklist_runs_pkey" PRIMARY KEY using index "operational_checklist_runs_pkey";

alter table "public"."operational_checklists" add constraint "operational_checklists_pkey" PRIMARY KEY using index "operational_checklists_pkey";

alter table "public"."organization_pipeline_stages" add constraint "organization_pipeline_stages_pkey" PRIMARY KEY using index "organization_pipeline_stages_pkey";

alter table "public"."organization_pipelines" add constraint "organization_pipelines_pkey" PRIMARY KEY using index "organization_pipelines_pkey";

alter table "public"."organization_products_services" add constraint "organization_products_services_pkey" PRIMARY KEY using index "organization_products_services_pkey";

alter table "public"."organization_profiles" add constraint "organization_profiles_pkey" PRIMARY KEY using index "organization_profiles_pkey";

alter table "public"."organization_tags" add constraint "organization_tags_pkey" PRIMARY KEY using index "organization_tags_pkey";

alter table "public"."outbound_webhook_attempts" add constraint "outbound_webhook_attempts_pkey" PRIMARY KEY using index "outbound_webhook_attempts_pkey";

alter table "public"."outbound_webhook_deliveries" add constraint "outbound_webhook_deliveries_pkey" PRIMARY KEY using index "outbound_webhook_deliveries_pkey";

alter table "public"."outbound_webhooks" add constraint "outbound_webhooks_pkey" PRIMARY KEY using index "outbound_webhooks_pkey";

alter table "public"."payment_methods" add constraint "payment_methods_pkey" PRIMARY KEY using index "payment_methods_pkey";

alter table "public"."qa_bugs" add constraint "qa_bugs_pkey" PRIMARY KEY using index "qa_bugs_pkey";

alter table "public"."qa_test_cases" add constraint "qa_test_cases_pkey" PRIMARY KEY using index "qa_test_cases_pkey";

alter table "public"."qa_test_plans" add constraint "qa_test_plans_pkey" PRIMARY KEY using index "qa_test_plans_pkey";

alter table "public"."qa_test_results" add constraint "qa_test_results_pkey" PRIMARY KEY using index "qa_test_results_pkey";

alter table "public"."qa_test_runs" add constraint "qa_test_runs_pkey" PRIMARY KEY using index "qa_test_runs_pkey";

alter table "public"."reminders" add constraint "reminders_pkey" PRIMARY KEY using index "reminders_pkey";

alter table "public"."saved_searches" add constraint "saved_searches_pkey" PRIMARY KEY using index "saved_searches_pkey";

alter table "public"."search_queries" add constraint "search_queries_pkey" PRIMARY KEY using index "search_queries_pkey";

alter table "public"."search_settings" add constraint "search_settings_pkey" PRIMARY KEY using index "search_settings_pkey";

alter table "public"."security_events" add constraint "security_events_pkey" PRIMARY KEY using index "security_events_pkey";

alter table "public"."security_rules" add constraint "security_rules_pkey" PRIMARY KEY using index "security_rules_pkey";

alter table "public"."setup_answers" add constraint "setup_answers_pkey" PRIMARY KEY using index "setup_answers_pkey";

alter table "public"."setup_assistant_sessions" add constraint "setup_assistant_sessions_pkey" PRIMARY KEY using index "setup_assistant_sessions_pkey";

alter table "public"."setup_questions" add constraint "setup_questions_pkey" PRIMARY KEY using index "setup_questions_pkey";

alter table "public"."setup_validation_checks" add constraint "setup_validation_checks_pkey" PRIMARY KEY using index "setup_validation_checks_pkey";

alter table "public"."setup_validation_results" add constraint "setup_validation_results_pkey" PRIMARY KEY using index "setup_validation_results_pkey";

alter table "public"."subscription_plans" add constraint "subscription_plans_pkey" PRIMARY KEY using index "subscription_plans_pkey";

alter table "public"."support_queue_agents" add constraint "support_queue_agents_pkey" PRIMARY KEY using index "support_queue_agents_pkey";

alter table "public"."support_queues" add constraint "support_queues_pkey" PRIMARY KEY using index "support_queues_pkey";

alter table "public"."support_scripts" add constraint "support_scripts_pkey" PRIMARY KEY using index "support_scripts_pkey";

alter table "public"."supported_locales" add constraint "supported_locales_pkey" PRIMARY KEY using index "supported_locales_pkey";

alter table "public"."system_alerts" add constraint "system_alerts_pkey" PRIMARY KEY using index "system_alerts_pkey";

alter table "public"."system_health_checks" add constraint "system_health_checks_pkey" PRIMARY KEY using index "system_health_checks_pkey";

alter table "public"."system_messages" add constraint "system_messages_pkey" PRIMARY KEY using index "system_messages_pkey";

alter table "public"."tenant_domains" add constraint "tenant_domains_pkey" PRIMARY KEY using index "tenant_domains_pkey";

alter table "public"."tenant_navigation_overrides" add constraint "tenant_navigation_overrides_pkey" PRIMARY KEY using index "tenant_navigation_overrides_pkey";

alter table "public"."tenant_onboarding_progress" add constraint "tenant_onboarding_progress_pkey" PRIMARY KEY using index "tenant_onboarding_progress_pkey";

alter table "public"."tenant_onboarding_step_status" add constraint "tenant_onboarding_step_status_pkey" PRIMARY KEY using index "tenant_onboarding_step_status_pkey";

alter table "public"."tenant_settings" add constraint "tenant_settings_pkey" PRIMARY KEY using index "tenant_settings_pkey";

alter table "public"."tenant_subscriptions" add constraint "tenant_subscriptions_pkey" PRIMARY KEY using index "tenant_subscriptions_pkey";

alter table "public"."tenant_ui_preferences" add constraint "tenant_ui_preferences_pkey" PRIMARY KEY using index "tenant_ui_preferences_pkey";

alter table "public"."tenant_usage_metrics" add constraint "tenant_usage_metrics_pkey" PRIMARY KEY using index "tenant_usage_metrics_pkey";

alter table "public"."training_lessons" add constraint "training_lessons_pkey" PRIMARY KEY using index "training_lessons_pkey";

alter table "public"."training_programs" add constraint "training_programs_pkey" PRIMARY KEY using index "training_programs_pkey";

alter table "public"."training_progress" add constraint "training_progress_pkey" PRIMARY KEY using index "training_progress_pkey";

alter table "public"."transcription_jobs" add constraint "transcription_jobs_pkey" PRIMARY KEY using index "transcription_jobs_pkey";

alter table "public"."translation_keys" add constraint "translation_keys_pkey" PRIMARY KEY using index "translation_keys_pkey";

alter table "public"."translations" add constraint "translations_pkey" PRIMARY KEY using index "translations_pkey";

alter table "public"."ui_themes" add constraint "ui_themes_pkey" PRIMARY KEY using index "ui_themes_pkey";

alter table "public"."user_calendar_preferences" add constraint "user_calendar_preferences_pkey" PRIMARY KEY using index "user_calendar_preferences_pkey";

alter table "public"."user_notification_preferences" add constraint "user_notification_preferences_pkey" PRIMARY KEY using index "user_notification_preferences_pkey";

alter table "public"."user_sessions" add constraint "user_sessions_pkey" PRIMARY KEY using index "user_sessions_pkey";

alter table "public"."whatsapp_audio_transcriptions" add constraint "whatsapp_audio_transcriptions_pkey" PRIMARY KEY using index "whatsapp_audio_transcriptions_pkey";

alter table "public"."whatsapp_media_text_extractions" add constraint "whatsapp_media_text_extractions_pkey" PRIMARY KEY using index "whatsapp_media_text_extractions_pkey";

alter table "public"."white_label_brands" add constraint "white_label_brands_pkey" PRIMARY KEY using index "white_label_brands_pkey";

alter table "public"."access_attempts" add constraint "access_attempts_status_check" CHECK ((status = ANY (ARRAY['success'::text, 'failed'::text, 'blocked'::text, 'rate_limited'::text]))) not valid;

alter table "public"."access_attempts" validate constraint "access_attempts_status_check";

alter table "public"."access_attempts" add constraint "access_attempts_type_check" CHECK ((attempt_type = ANY (ARRAY['login'::text, 'api_token'::text, 'webhook'::text, 'public_link'::text, 'password_reset'::text, 'other'::text]))) not valid;

alter table "public"."access_attempts" validate constraint "access_attempts_type_check";

alter table "public"."agent_automation_cooldown" add constraint "agent_automation_cooldown_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE not valid;

alter table "public"."agent_automation_cooldown" validate constraint "agent_automation_cooldown_conversation_id_fkey";

alter table "public"."agent_automation_cooldown" add constraint "agent_automation_cooldown_conversation_id_key" UNIQUE using index "agent_automation_cooldown_conversation_id_key";

alter table "public"."agent_automation_cooldown" add constraint "agent_automation_cooldown_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."agent_automation_cooldown" validate constraint "agent_automation_cooldown_organization_id_fkey";

alter table "public"."agent_automation_jobs" add constraint "agent_automation_jobs_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE not valid;

alter table "public"."agent_automation_jobs" validate constraint "agent_automation_jobs_channel_id_fkey";

alter table "public"."agent_automation_jobs" add constraint "agent_automation_jobs_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE not valid;

alter table "public"."agent_automation_jobs" validate constraint "agent_automation_jobs_conversation_id_fkey";

alter table "public"."agent_automation_jobs" add constraint "agent_automation_jobs_message_id_fkey" FOREIGN KEY (message_id) REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE not valid;

alter table "public"."agent_automation_jobs" validate constraint "agent_automation_jobs_message_id_fkey";

alter table "public"."agent_automation_jobs" add constraint "agent_automation_jobs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."agent_automation_jobs" validate constraint "agent_automation_jobs_organization_id_fkey";

alter table "public"."agent_automation_jobs" add constraint "agent_automation_jobs_outbound_message_id_fkey" FOREIGN KEY (outbound_message_id) REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL not valid;

alter table "public"."agent_automation_jobs" validate constraint "agent_automation_jobs_outbound_message_id_fkey";

alter table "public"."agent_automation_jobs" add constraint "agent_automation_jobs_selected_item_id_fkey" FOREIGN KEY (selected_item_id) REFERENCES public.catalog_items(id) ON DELETE SET NULL not valid;

alter table "public"."agent_automation_jobs" validate constraint "agent_automation_jobs_selected_item_id_fkey";

alter table "public"."agent_automation_jobs" add constraint "agent_automation_jobs_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."agent_automation_jobs" validate constraint "agent_automation_jobs_tenant_id_fkey";

alter table "public"."agent_catalog_products" add constraint "agent_catalog_products_agent_installation_id_fkey" FOREIGN KEY (agent_installation_id) REFERENCES public.agent_installations(id) ON DELETE SET NULL not valid;

alter table "public"."agent_catalog_products" validate constraint "agent_catalog_products_agent_installation_id_fkey";

alter table "public"."agent_catalog_products" add constraint "agent_catalog_products_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."agent_catalog_products" validate constraint "agent_catalog_products_organization_id_fkey";

alter table "public"."agent_catalog_products" add constraint "agent_catalog_products_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."agent_catalog_products" validate constraint "agent_catalog_products_tenant_id_fkey";

alter table "public"."agent_catalog_products" add constraint "agent_catalog_products_unique_source" UNIQUE using index "agent_catalog_products_unique_source";

alter table "public"."agent_connector_types" add constraint "agent_connector_types_code_key" UNIQUE using index "agent_connector_types_code_key";

alter table "public"."agent_dialog_templates" add constraint "agent_dialog_templates_connector_type_id_fkey" FOREIGN KEY (connector_type_id) REFERENCES public.agent_connector_types(id) ON DELETE SET NULL not valid;

alter table "public"."agent_dialog_templates" validate constraint "agent_dialog_templates_connector_type_id_fkey";

alter table "public"."agent_dialog_templates" add constraint "agent_dialog_templates_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."agent_dialog_templates" validate constraint "agent_dialog_templates_organization_id_fkey";

alter table "public"."agent_dialog_templates" add constraint "agent_dialog_templates_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."agent_dialog_templates" validate constraint "agent_dialog_templates_tenant_id_fkey";

alter table "public"."agent_installations" add constraint "agent_installations_connector_type_id_fkey" FOREIGN KEY (connector_type_id) REFERENCES public.agent_connector_types(id) not valid;

alter table "public"."agent_installations" validate constraint "agent_installations_connector_type_id_fkey";

alter table "public"."agent_installations" add constraint "agent_installations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."agent_installations" validate constraint "agent_installations_organization_id_fkey";

alter table "public"."agent_installations" add constraint "agent_installations_read_only_check" CHECK ((read_only = true)) not valid;

alter table "public"."agent_installations" validate constraint "agent_installations_read_only_check";

alter table "public"."agent_installations" add constraint "agent_installations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'warning'::text, 'offline'::text, 'disabled'::text, 'revoked'::text]))) not valid;

alter table "public"."agent_installations" validate constraint "agent_installations_status_check";

alter table "public"."agent_installations" add constraint "agent_installations_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."agent_installations" validate constraint "agent_installations_tenant_id_fkey";

alter table "public"."agent_presence" add constraint "agent_presence_current_queue_id_fkey" FOREIGN KEY (current_queue_id) REFERENCES public.support_queues(id) ON DELETE SET NULL not valid;

alter table "public"."agent_presence" validate constraint "agent_presence_current_queue_id_fkey";

alter table "public"."agent_presence" add constraint "agent_presence_status_check" CHECK ((status = ANY (ARRAY['online'::text, 'offline'::text, 'away'::text, 'busy'::text]))) not valid;

alter table "public"."agent_presence" validate constraint "agent_presence_status_check";

alter table "public"."agent_presence" add constraint "agent_presence_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE not valid;

alter table "public"."agent_presence" validate constraint "agent_presence_user_id_fkey";

alter table "public"."agent_presence" add constraint "agent_presence_user_id_key" UNIQUE using index "agent_presence_user_id_key";

alter table "public"."agent_sync_runs" add constraint "agent_sync_runs_agent_installation_id_fkey" FOREIGN KEY (agent_installation_id) REFERENCES public.agent_installations(id) ON DELETE CASCADE not valid;

alter table "public"."agent_sync_runs" validate constraint "agent_sync_runs_agent_installation_id_fkey";

alter table "public"."agent_sync_runs" add constraint "agent_sync_runs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."agent_sync_runs" validate constraint "agent_sync_runs_organization_id_fkey";

alter table "public"."agent_sync_runs" add constraint "agent_sync_runs_status_check" CHECK ((status = ANY (ARRAY['started'::text, 'success'::text, 'partial_success'::text, 'failed'::text]))) not valid;

alter table "public"."agent_sync_runs" validate constraint "agent_sync_runs_status_check";

alter table "public"."agent_sync_runs" add constraint "agent_sync_runs_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."agent_sync_runs" validate constraint "agent_sync_runs_tenant_id_fkey";

alter table "public"."ai_conversation_summaries" add constraint "ai_conversation_summaries_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."ai_conversation_summaries" validate constraint "ai_conversation_summaries_contact_id_fkey";

alter table "public"."ai_conversation_summaries" add constraint "ai_conversation_summaries_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE not valid;

alter table "public"."ai_conversation_summaries" validate constraint "ai_conversation_summaries_conversation_id_fkey";

alter table "public"."ai_conversation_summaries" add constraint "ai_conversation_summaries_sentiment_check" CHECK ((sentiment = ANY (ARRAY['positive'::text, 'neutral'::text, 'negative'::text, 'mixed'::text]))) not valid;

alter table "public"."ai_conversation_summaries" validate constraint "ai_conversation_summaries_sentiment_check";

alter table "public"."ai_conversation_summaries" add constraint "ai_conversation_summaries_urgency_check" CHECK ((urgency = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."ai_conversation_summaries" validate constraint "ai_conversation_summaries_urgency_check";

alter table "public"."ai_extracted_customer_data" add constraint "ai_extracted_customer_data_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE CASCADE not valid;

alter table "public"."ai_extracted_customer_data" validate constraint "ai_extracted_customer_data_contact_id_fkey";

alter table "public"."ai_extracted_customer_data" add constraint "ai_extracted_customer_data_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."ai_extracted_customer_data" validate constraint "ai_extracted_customer_data_conversation_id_fkey";

alter table "public"."ai_extracted_customer_data" add constraint "ai_extracted_customer_data_reviewed_status_check" CHECK ((reviewed_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."ai_extracted_customer_data" validate constraint "ai_extracted_customer_data_reviewed_status_check";

alter table "public"."ai_lead_scores" add constraint "ai_lead_scores_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE CASCADE not valid;

alter table "public"."ai_lead_scores" validate constraint "ai_lead_scores_contact_id_fkey";

alter table "public"."ai_lead_scores" add constraint "ai_lead_scores_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."ai_lead_scores" validate constraint "ai_lead_scores_conversation_id_fkey";

alter table "public"."ai_lead_scores" add constraint "ai_lead_scores_intent_check" CHECK ((intent = ANY (ARRAY['unknown'::text, 'information'::text, 'support'::text, 'buying'::text, 'price'::text, 'complaint'::text, 'partnership'::text, 'spam'::text]))) not valid;

alter table "public"."ai_lead_scores" validate constraint "ai_lead_scores_intent_check";

alter table "public"."ai_lead_scores" add constraint "ai_lead_scores_score_check" CHECK (((score >= 0) AND (score <= 100))) not valid;

alter table "public"."ai_lead_scores" validate constraint "ai_lead_scores_score_check";

alter table "public"."ai_lead_scores" add constraint "ai_lead_scores_temperature_check" CHECK ((temperature = ANY (ARRAY['cold'::text, 'warm'::text, 'hot'::text]))) not valid;

alter table "public"."ai_lead_scores" validate constraint "ai_lead_scores_temperature_check";

alter table "public"."ai_objections" add constraint "ai_objections_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."ai_objections" validate constraint "ai_objections_contact_id_fkey";

alter table "public"."ai_objections" add constraint "ai_objections_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."ai_objections" validate constraint "ai_objections_conversation_id_fkey";

alter table "public"."ai_objections" add constraint "ai_objections_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'handled'::text, 'ignored'::text, 'resolved'::text]))) not valid;

alter table "public"."ai_objections" validate constraint "ai_objections_status_check";

alter table "public"."ai_objections" add constraint "ai_objections_type_check" CHECK ((objection_type = ANY (ARRAY['price'::text, 'time'::text, 'trust'::text, 'need'::text, 'competition'::text, 'authority'::text, 'payment'::text, 'other'::text]))) not valid;

alter table "public"."ai_objections" validate constraint "ai_objections_type_check";

alter table "public"."ai_prompt_templates" add constraint "ai_prompt_templates_name_key" UNIQUE using index "ai_prompt_templates_name_key";

alter table "public"."ai_prompt_templates" add constraint "ai_prompt_templates_run_type_check" CHECK ((run_type = ANY (ARRAY['summary'::text, 'reply_suggestion'::text, 'lead_score'::text, 'data_extraction'::text, 'objection_detection'::text, 'follow_up'::text, 'other'::text]))) not valid;

alter table "public"."ai_prompt_templates" validate constraint "ai_prompt_templates_run_type_check";

alter table "public"."ai_reply_suggestions" add constraint "ai_reply_suggestions_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."ai_reply_suggestions" validate constraint "ai_reply_suggestions_contact_id_fkey";

alter table "public"."ai_reply_suggestions" add constraint "ai_reply_suggestions_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE not valid;

alter table "public"."ai_reply_suggestions" validate constraint "ai_reply_suggestions_conversation_id_fkey";

alter table "public"."ai_reply_suggestions" add constraint "ai_reply_suggestions_objective_check" CHECK ((objective = ANY (ARRAY['reply'::text, 'follow_up'::text, 'qualification'::text, 'proposal'::text, 'objection'::text, 'closing'::text]))) not valid;

alter table "public"."ai_reply_suggestions" validate constraint "ai_reply_suggestions_objective_check";

alter table "public"."ai_reply_suggestions" add constraint "ai_reply_suggestions_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'used'::text, 'discarded'::text]))) not valid;

alter table "public"."ai_reply_suggestions" validate constraint "ai_reply_suggestions_status_check";

alter table "public"."ai_reply_suggestions" add constraint "ai_reply_suggestions_tone_check" CHECK ((tone = ANY (ARRAY['professional'::text, 'friendly'::text, 'sales'::text, 'support'::text, 'short'::text, 'detailed'::text]))) not valid;

alter table "public"."ai_reply_suggestions" validate constraint "ai_reply_suggestions_tone_check";

alter table "public"."ai_runs" add constraint "ai_runs_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))) not valid;

alter table "public"."ai_runs" validate constraint "ai_runs_status_check";

alter table "public"."ai_runs" add constraint "ai_runs_type_check" CHECK ((run_type = ANY (ARRAY['summary'::text, 'reply_suggestion'::text, 'lead_score'::text, 'data_extraction'::text, 'objection_detection'::text, 'follow_up'::text, 'other'::text]))) not valid;

alter table "public"."ai_runs" validate constraint "ai_runs_type_check";

alter table "public"."api_tokens" add constraint "api_tokens_name_key" UNIQUE using index "api_tokens_name_key";

alter table "public"."api_tokens" add constraint "api_tokens_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text, 'revoked'::text, 'disabled'::text]))) not valid;

alter table "public"."api_tokens" validate constraint "api_tokens_status_check";

alter table "public"."api_tokens" add constraint "api_tokens_type_check" CHECK ((token_type = ANY (ARRAY['api'::text, 'webhook'::text, 'gateway'::text, 'integration'::text, 'public_link'::text, 'other'::text]))) not valid;

alter table "public"."api_tokens" validate constraint "api_tokens_type_check";

alter table "public"."app_permissions" add constraint "app_permissions_code_key" UNIQUE using index "app_permissions_code_key";

alter table "public"."app_settings" add constraint "app_settings_setting_key_key" UNIQUE using index "app_settings_setting_key_key";

alter table "public"."app_settings" add constraint "app_settings_type_check" CHECK ((setting_type = ANY (ARRAY['string'::text, 'number'::text, 'boolean'::text, 'json'::text, 'array'::text]))) not valid;

alter table "public"."app_settings" validate constraint "app_settings_type_check";

alter table "public"."app_user_permissions" add constraint "app_user_permissions_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES public.app_permissions(id) ON DELETE CASCADE not valid;

alter table "public"."app_user_permissions" validate constraint "app_user_permissions_permission_id_fkey";

alter table "public"."app_user_permissions" add constraint "app_user_permissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE not valid;

alter table "public"."app_user_permissions" validate constraint "app_user_permissions_user_id_fkey";

alter table "public"."app_user_permissions" add constraint "app_user_permissions_user_id_permission_id_key" UNIQUE using index "app_user_permissions_user_id_permission_id_key";

alter table "public"."application_logs" add constraint "application_logs_level_check" CHECK ((level = ANY (ARRAY['debug'::text, 'info'::text, 'warning'::text, 'error'::text, 'critical'::text]))) not valid;

alter table "public"."application_logs" validate constraint "application_logs_level_check";

alter table "public"."application_logs" add constraint "application_logs_source_check" CHECK ((source = ANY (ARRAY['app'::text, 'api'::text, 'gateway'::text, 'database'::text, 'webhook'::text, 'automation'::text, 'ai'::text, 'worker'::text, 'other'::text]))) not valid;

alter table "public"."application_logs" validate constraint "application_logs_source_check";

alter table "public"."application_logs" add constraint "application_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."application_logs" validate constraint "application_logs_user_id_fkey";

alter table "public"."audit_trail" add constraint "audit_trail_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."audit_trail" validate constraint "audit_trail_actor_user_id_fkey";

alter table "public"."automation_action_logs" add constraint "automation_action_logs_action_id_fkey" FOREIGN KEY (action_id) REFERENCES public.automation_actions(id) ON DELETE SET NULL not valid;

alter table "public"."automation_action_logs" validate constraint "automation_action_logs_action_id_fkey";

alter table "public"."automation_action_logs" add constraint "automation_action_logs_flow_id_fkey" FOREIGN KEY (flow_id) REFERENCES public.automation_flows(id) ON DELETE SET NULL not valid;

alter table "public"."automation_action_logs" validate constraint "automation_action_logs_flow_id_fkey";

alter table "public"."automation_action_logs" add constraint "automation_action_logs_run_id_fkey" FOREIGN KEY (run_id) REFERENCES public.automation_runs(id) ON DELETE CASCADE not valid;

alter table "public"."automation_action_logs" validate constraint "automation_action_logs_run_id_fkey";

alter table "public"."automation_action_logs" add constraint "automation_action_logs_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'skipped'::text]))) not valid;

alter table "public"."automation_action_logs" validate constraint "automation_action_logs_status_check";

alter table "public"."automation_actions" add constraint "automation_actions_flow_id_fkey" FOREIGN KEY (flow_id) REFERENCES public.automation_flows(id) ON DELETE CASCADE not valid;

alter table "public"."automation_actions" validate constraint "automation_actions_flow_id_fkey";

alter table "public"."automation_actions" add constraint "automation_actions_type_check" CHECK ((action_type = ANY (ARRAY['send_message'::text, 'send_quick_reply'::text, 'add_tag'::text, 'remove_tag'::text, 'create_task'::text, 'move_stage'::text, 'assign_queue'::text, 'assign_user'::text, 'set_priority'::text, 'update_consent'::text, 'create_deal'::text, 'add_note'::text, 'ai_summary'::text, 'ai_reply_suggestion'::text, 'webhook'::text, 'stop_flow'::text]))) not valid;

alter table "public"."automation_actions" validate constraint "automation_actions_type_check";

alter table "public"."automation_cooldowns" add constraint "automation_cooldowns_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE CASCADE not valid;

alter table "public"."automation_cooldowns" validate constraint "automation_cooldowns_contact_id_fkey";

alter table "public"."automation_cooldowns" add constraint "automation_cooldowns_cooldown_key_external_chat_id_key" UNIQUE using index "automation_cooldowns_cooldown_key_external_chat_id_key";

alter table "public"."automation_cooldowns" add constraint "automation_cooldowns_flow_id_fkey" FOREIGN KEY (flow_id) REFERENCES public.automation_flows(id) ON DELETE CASCADE not valid;

alter table "public"."automation_cooldowns" validate constraint "automation_cooldowns_flow_id_fkey";

alter table "public"."automation_flows" add constraint "automation_flows_channel_check" CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'email'::text, 'sms'::text, 'manual'::text]))) not valid;

alter table "public"."automation_flows" validate constraint "automation_flows_channel_check";

alter table "public"."automation_flows" add constraint "automation_flows_name_key" UNIQUE using index "automation_flows_name_key";

alter table "public"."automation_flows" add constraint "automation_flows_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'archived'::text]))) not valid;

alter table "public"."automation_flows" validate constraint "automation_flows_status_check";

alter table "public"."automation_flows" add constraint "automation_flows_trigger_type_check" CHECK ((trigger_type = ANY (ARRAY['keyword'::text, 'new_message'::text, 'new_contact'::text, 'tag_added'::text, 'stage_changed'::text, 'conversation_status'::text, 'task_due'::text, 'campaign_reply'::text, 'schedule'::text, 'manual'::text]))) not valid;

alter table "public"."automation_flows" validate constraint "automation_flows_trigger_type_check";

alter table "public"."automation_runs" add constraint "automation_runs_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."automation_runs" validate constraint "automation_runs_contact_id_fkey";

alter table "public"."automation_runs" add constraint "automation_runs_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."automation_runs" validate constraint "automation_runs_conversation_id_fkey";

alter table "public"."automation_runs" add constraint "automation_runs_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES public.crm_deals(id) ON DELETE SET NULL not valid;

alter table "public"."automation_runs" validate constraint "automation_runs_deal_id_fkey";

alter table "public"."automation_runs" add constraint "automation_runs_flow_id_fkey" FOREIGN KEY (flow_id) REFERENCES public.automation_flows(id) ON DELETE SET NULL not valid;

alter table "public"."automation_runs" validate constraint "automation_runs_flow_id_fkey";

alter table "public"."automation_runs" add constraint "automation_runs_message_id_fkey" FOREIGN KEY (message_id) REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL not valid;

alter table "public"."automation_runs" validate constraint "automation_runs_message_id_fkey";

alter table "public"."automation_runs" add constraint "automation_runs_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'skipped'::text, 'cancelled'::text]))) not valid;

alter table "public"."automation_runs" validate constraint "automation_runs_status_check";

alter table "public"."automation_runs" add constraint "automation_runs_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.crm_tasks(id) ON DELETE SET NULL not valid;

alter table "public"."automation_runs" validate constraint "automation_runs_task_id_fkey";

alter table "public"."automation_runs" add constraint "automation_runs_trigger_source_check" CHECK ((trigger_source = ANY (ARRAY['message'::text, 'contact'::text, 'campaign'::text, 'task'::text, 'deal'::text, 'schedule'::text, 'manual'::text, 'system'::text]))) not valid;

alter table "public"."automation_runs" validate constraint "automation_runs_trigger_source_check";

alter table "public"."automation_triggers" add constraint "automation_triggers_flow_id_fkey" FOREIGN KEY (flow_id) REFERENCES public.automation_flows(id) ON DELETE CASCADE not valid;

alter table "public"."automation_triggers" validate constraint "automation_triggers_flow_id_fkey";

alter table "public"."automation_triggers" add constraint "automation_triggers_operator_check" CHECK ((operator = ANY (ARRAY['equals'::text, 'not_equals'::text, 'contains'::text, 'not_contains'::text, 'starts_with'::text, 'ends_with'::text, 'in'::text, 'not_in'::text, 'exists'::text, 'greater_than'::text, 'less_than'::text]))) not valid;

alter table "public"."automation_triggers" validate constraint "automation_triggers_operator_check";

alter table "public"."backup_configs" add constraint "backup_configs_frequency_check" CHECK ((frequency = ANY (ARRAY['hourly'::text, 'daily'::text, 'weekly'::text, 'monthly'::text, 'manual'::text]))) not valid;

alter table "public"."backup_configs" validate constraint "backup_configs_frequency_check";

alter table "public"."backup_configs" add constraint "backup_configs_name_key" UNIQUE using index "backup_configs_name_key";

alter table "public"."backup_configs" add constraint "backup_configs_type_check" CHECK ((backup_type = ANY (ARRAY['database'::text, 'files'::text, 'settings'::text, 'contacts'::text, 'messages'::text, 'full'::text, 'other'::text]))) not valid;

alter table "public"."backup_configs" validate constraint "backup_configs_type_check";

alter table "public"."backup_runs" add constraint "backup_runs_backup_config_id_fkey" FOREIGN KEY (backup_config_id) REFERENCES public.backup_configs(id) ON DELETE SET NULL not valid;

alter table "public"."backup_runs" validate constraint "backup_runs_backup_config_id_fkey";

alter table "public"."backup_runs" add constraint "backup_runs_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))) not valid;

alter table "public"."backup_runs" validate constraint "backup_runs_status_check";

alter table "public"."backup_runs" add constraint "backup_runs_type_check" CHECK ((backup_type = ANY (ARRAY['database'::text, 'files'::text, 'settings'::text, 'contacts'::text, 'messages'::text, 'full'::text, 'other'::text]))) not valid;

alter table "public"."backup_runs" validate constraint "backup_runs_type_check";

alter table "public"."billing_checkout_sessions" add constraint "billing_checkout_sessions_billing_cycle_check" CHECK ((billing_cycle = ANY (ARRAY['monthly'::text, 'annual'::text]))) not valid;

alter table "public"."billing_checkout_sessions" validate constraint "billing_checkout_sessions_billing_cycle_check";

alter table "public"."billing_checkout_sessions" add constraint "billing_checkout_sessions_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) not valid;

alter table "public"."billing_checkout_sessions" validate constraint "billing_checkout_sessions_plan_id_fkey";

alter table "public"."billing_checkout_sessions" add constraint "billing_checkout_sessions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'created'::text, 'paid'::text, 'paid_pending_activation'::text, 'active'::text, 'failed'::text, 'cancelled'::text, 'refunded'::text]))) not valid;

alter table "public"."billing_checkout_sessions" validate constraint "billing_checkout_sessions_status_check";

alter table "public"."billing_plan_price_rules" add constraint "billing_plan_price_rules_plan_slug_key" UNIQUE using index "billing_plan_price_rules_plan_slug_key";

alter table "public"."blocked_contacts" add constraint "blocked_contacts_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE CASCADE not valid;

alter table "public"."blocked_contacts" validate constraint "blocked_contacts_contact_id_fkey";

alter table "public"."business_holidays" add constraint "business_holidays_holiday_date_name_key" UNIQUE using index "business_holidays_holiday_date_name_key";

alter table "public"."business_hours" add constraint "business_hours_day_check" CHECK (((day_of_week >= 0) AND (day_of_week <= 6))) not valid;

alter table "public"."business_hours" validate constraint "business_hours_day_check";

alter table "public"."calendar_event_participants" add constraint "calendar_event_participants_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE CASCADE not valid;

alter table "public"."calendar_event_participants" validate constraint "calendar_event_participants_contact_id_fkey";

alter table "public"."calendar_event_participants" add constraint "calendar_event_participants_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.calendar_events(id) ON DELETE CASCADE not valid;

alter table "public"."calendar_event_participants" validate constraint "calendar_event_participants_event_id_fkey";

alter table "public"."calendar_event_participants" add constraint "calendar_event_participants_response_status_check" CHECK ((response_status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'tentative'::text, 'no_response'::text]))) not valid;

alter table "public"."calendar_event_participants" validate constraint "calendar_event_participants_response_status_check";

alter table "public"."calendar_event_participants" add constraint "calendar_event_participants_type_check" CHECK ((participant_type = ANY (ARRAY['user'::text, 'contact'::text, 'external'::text]))) not valid;

alter table "public"."calendar_event_participants" validate constraint "calendar_event_participants_type_check";

alter table "public"."calendar_event_participants" add constraint "calendar_event_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE not valid;

alter table "public"."calendar_event_participants" validate constraint "calendar_event_participants_user_id_fkey";

alter table "public"."calendar_event_templates" add constraint "calendar_event_templates_name_key" UNIQUE using index "calendar_event_templates_name_key";

alter table "public"."calendar_event_templates" add constraint "calendar_event_templates_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."calendar_event_templates" validate constraint "calendar_event_templates_priority_check";

alter table "public"."calendar_event_templates" add constraint "calendar_event_templates_type_check" CHECK ((event_type = ANY (ARRAY['follow_up'::text, 'meeting'::text, 'call'::text, 'task'::text, 'deadline'::text, 'payment_due'::text, 'proposal_due'::text, 'training'::text, 'maintenance'::text, 'personal'::text, 'other'::text]))) not valid;

alter table "public"."calendar_event_templates" validate constraint "calendar_event_templates_type_check";

alter table "public"."calendar_events" add constraint "calendar_events_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_assigned_to_fkey";

alter table "public"."calendar_events" add constraint "calendar_events_calendar_id_fkey" FOREIGN KEY (calendar_id) REFERENCES public.calendars(id) ON DELETE SET NULL not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_calendar_id_fkey";

alter table "public"."calendar_events" add constraint "calendar_events_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_contact_id_fkey";

alter table "public"."calendar_events" add constraint "calendar_events_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_conversation_id_fkey";

alter table "public"."calendar_events" add constraint "calendar_events_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES public.crm_deals(id) ON DELETE SET NULL not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_deal_id_fkey";

alter table "public"."calendar_events" add constraint "calendar_events_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.finance_invoices(id) ON DELETE SET NULL not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_invoice_id_fkey";

alter table "public"."calendar_events" add constraint "calendar_events_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_organization_id_fkey";

alter table "public"."calendar_events" add constraint "calendar_events_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_priority_check";

alter table "public"."calendar_events" add constraint "calendar_events_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES public.commercial_proposals(id) ON DELETE SET NULL not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_proposal_id_fkey";

alter table "public"."calendar_events" add constraint "calendar_events_status_check" CHECK ((status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'missed'::text, 'rescheduled'::text]))) not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_status_check";

alter table "public"."calendar_events" add constraint "calendar_events_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.crm_tasks(id) ON DELETE SET NULL not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_task_id_fkey";

alter table "public"."calendar_events" add constraint "calendar_events_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_tenant_id_fkey";

alter table "public"."calendar_events" add constraint "calendar_events_type_check" CHECK ((event_type = ANY (ARRAY['follow_up'::text, 'meeting'::text, 'call'::text, 'task'::text, 'deadline'::text, 'payment_due'::text, 'proposal_due'::text, 'training'::text, 'maintenance'::text, 'personal'::text, 'other'::text]))) not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_type_check";

alter table "public"."calendars" add constraint "calendars_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."calendars" validate constraint "calendars_organization_id_fkey";

alter table "public"."calendars" add constraint "calendars_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."calendars" validate constraint "calendars_owner_user_id_fkey";

alter table "public"."calendars" add constraint "calendars_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."calendars" validate constraint "calendars_tenant_id_fkey";

alter table "public"."calendars" add constraint "calendars_type_check" CHECK ((calendar_type = ANY (ARRAY['general'::text, 'sales'::text, 'support'::text, 'finance'::text, 'tasks'::text, 'personal'::text, 'team'::text, 'other'::text]))) not valid;

alter table "public"."calendars" validate constraint "calendars_type_check";

alter table "public"."catalog_categories" add constraint "catalog_categories_name_key" UNIQUE using index "catalog_categories_name_key";

alter table "public"."catalog_categories" add constraint "catalog_categories_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."catalog_categories" validate constraint "catalog_categories_organization_id_fkey";

alter table "public"."catalog_categories" add constraint "catalog_categories_slug_key" UNIQUE using index "catalog_categories_slug_key";

alter table "public"."catalog_categories" add constraint "catalog_categories_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."catalog_categories" validate constraint "catalog_categories_tenant_id_fkey";

alter table "public"."catalog_items" add constraint "catalog_items_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.catalog_categories(id) ON DELETE SET NULL not valid;

alter table "public"."catalog_items" validate constraint "catalog_items_category_id_fkey";

alter table "public"."catalog_items" add constraint "catalog_items_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."catalog_items" validate constraint "catalog_items_organization_id_fkey";

alter table "public"."catalog_items" add constraint "catalog_items_slug_key" UNIQUE using index "catalog_items_slug_key";

alter table "public"."catalog_items" add constraint "catalog_items_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'draft'::text, 'archived'::text]))) not valid;

alter table "public"."catalog_items" validate constraint "catalog_items_status_check";

alter table "public"."catalog_items" add constraint "catalog_items_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."catalog_items" validate constraint "catalog_items_tenant_id_fkey";

alter table "public"."catalog_items" add constraint "catalog_items_type_check" CHECK ((item_type = ANY (ARRAY['product'::text, 'service'::text, 'plan'::text, 'package'::text, 'digital'::text, 'other'::text]))) not valid;

alter table "public"."catalog_items" validate constraint "catalog_items_type_check";

alter table "public"."channels" add constraint "channels_gateway_id_fkey" FOREIGN KEY (gateway_id) REFERENCES public.internal_messaging_gateways(id) ON DELETE SET NULL not valid;

alter table "public"."channels" validate constraint "channels_gateway_id_fkey";

alter table "public"."commercial_agent_profiles" add constraint "commercial_agent_profiles_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_agent_profiles" validate constraint "commercial_agent_profiles_created_by_fkey";

alter table "public"."commercial_agent_profiles" add constraint "commercial_agent_profiles_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."commercial_agent_profiles" validate constraint "commercial_agent_profiles_organization_id_fkey";

alter table "public"."commercial_agent_profiles" add constraint "commercial_agent_profiles_pricing_authority_check" CHECK ((pricing_authority = ANY (ARRAY['catalog'::text, 'table'::text, 'proposal'::text, 'human'::text]))) not valid;

alter table "public"."commercial_agent_profiles" validate constraint "commercial_agent_profiles_pricing_authority_check";

alter table "public"."commercial_agent_profiles" add constraint "commercial_agent_profiles_profile_no_secrets_check" CHECK ((NOT (profile ?| ARRAY['api_key'::text, 'apikey'::text, 'secret'::text, 'token'::text, 'cookie'::text, 'access_token'::text, 'refresh_token'::text, 'service_role'::text]))) not valid;

alter table "public"."commercial_agent_profiles" validate constraint "commercial_agent_profiles_profile_no_secrets_check";

alter table "public"."commercial_agent_profiles" add constraint "commercial_agent_profiles_response_mode_check" CHECK ((response_mode = ANY (ARRAY['observer'::text, 'copilot'::text, 'assisted'::text, 'approved_automation'::text]))) not valid;

alter table "public"."commercial_agent_profiles" validate constraint "commercial_agent_profiles_response_mode_check";

alter table "public"."commercial_agent_profiles" add constraint "commercial_agent_profiles_stage_check" CHECK ((stage = ANY (ARRAY['hidden'::text, 'internal_alpha'::text, 'private_beta'::text, 'public_beta'::text, 'stable'::text]))) not valid;

alter table "public"."commercial_agent_profiles" validate constraint "commercial_agent_profiles_stage_check";

alter table "public"."commercial_agent_profiles" add constraint "commercial_agent_profiles_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'archived'::text]))) not valid;

alter table "public"."commercial_agent_profiles" validate constraint "commercial_agent_profiles_status_check";

alter table "public"."commercial_agent_profiles" add constraint "commercial_agent_profiles_stock_authority_check" CHECK ((stock_authority = ANY (ARRAY['catalog'::text, 'integration'::text, 'human'::text]))) not valid;

alter table "public"."commercial_agent_profiles" validate constraint "commercial_agent_profiles_stock_authority_check";

alter table "public"."commercial_agent_profiles" add constraint "commercial_agent_profiles_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."commercial_agent_profiles" validate constraint "commercial_agent_profiles_tenant_id_fkey";

alter table "public"."commercial_conversation_analysis" add constraint "commercial_conversation_analysis_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_conversation_analysis" validate constraint "commercial_conversation_analysis_channel_id_fkey";

alter table "public"."commercial_conversation_analysis" add constraint "commercial_conversation_analysis_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE not valid;

alter table "public"."commercial_conversation_analysis" validate constraint "commercial_conversation_analysis_conversation_id_fkey";

alter table "public"."commercial_conversation_analysis" add constraint "commercial_conversation_analysis_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_conversation_analysis" validate constraint "commercial_conversation_analysis_created_by_fkey";

alter table "public"."commercial_conversation_analysis" add constraint "commercial_conversation_analysis_no_secrets_check" CHECK ((NOT (analysis ?| ARRAY['api_key'::text, 'apikey'::text, 'secret'::text, 'token'::text, 'cookie'::text, 'access_token'::text, 'refresh_token'::text, 'service_role'::text, 'chain_of_thought'::text]))) not valid;

alter table "public"."commercial_conversation_analysis" validate constraint "commercial_conversation_analysis_no_secrets_check";

alter table "public"."commercial_conversation_analysis" add constraint "commercial_conversation_analysis_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."commercial_conversation_analysis" validate constraint "commercial_conversation_analysis_organization_id_fkey";

alter table "public"."commercial_conversation_analysis" add constraint "commercial_conversation_analysis_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.commercial_agent_profiles(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_conversation_analysis" validate constraint "commercial_conversation_analysis_profile_id_fkey";

alter table "public"."commercial_conversation_analysis" add constraint "commercial_conversation_analysis_status_check" CHECK ((status = ANY (ARRAY['generated'::text, 'stale'::text, 'archived'::text]))) not valid;

alter table "public"."commercial_conversation_analysis" validate constraint "commercial_conversation_analysis_status_check";

alter table "public"."commercial_conversation_analysis" add constraint "commercial_conversation_analysis_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."commercial_conversation_analysis" validate constraint "commercial_conversation_analysis_tenant_id_fkey";

alter table "public"."commercial_follow_ups" add constraint "commercial_follow_ups_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_follow_ups" validate constraint "commercial_follow_ups_channel_id_fkey";

alter table "public"."commercial_follow_ups" add constraint "commercial_follow_ups_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE not valid;

alter table "public"."commercial_follow_ups" validate constraint "commercial_follow_ups_conversation_id_fkey";

alter table "public"."commercial_follow_ups" add constraint "commercial_follow_ups_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_follow_ups" validate constraint "commercial_follow_ups_created_by_fkey";

alter table "public"."commercial_follow_ups" add constraint "commercial_follow_ups_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."commercial_follow_ups" validate constraint "commercial_follow_ups_organization_id_fkey";

alter table "public"."commercial_follow_ups" add constraint "commercial_follow_ups_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text]))) not valid;

alter table "public"."commercial_follow_ups" validate constraint "commercial_follow_ups_priority_check";

alter table "public"."commercial_follow_ups" add constraint "commercial_follow_ups_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.commercial_agent_profiles(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_follow_ups" validate constraint "commercial_follow_ups_profile_id_fkey";

alter table "public"."commercial_follow_ups" add constraint "commercial_follow_ups_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'done'::text, 'cancelled'::text, 'expired'::text]))) not valid;

alter table "public"."commercial_follow_ups" validate constraint "commercial_follow_ups_status_check";

alter table "public"."commercial_follow_ups" add constraint "commercial_follow_ups_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."commercial_follow_ups" validate constraint "commercial_follow_ups_tenant_id_fkey";

alter table "public"."commercial_offer_items" add constraint "commercial_offer_items_catalog_item_id_fkey" FOREIGN KEY (catalog_item_id) REFERENCES public.catalog_items(id) ON DELETE CASCADE not valid;

alter table "public"."commercial_offer_items" validate constraint "commercial_offer_items_catalog_item_id_fkey";

alter table "public"."commercial_offer_items" add constraint "commercial_offer_items_discount_type_check" CHECK (((discount_type IS NULL) OR (discount_type = ANY (ARRAY['fixed'::text, 'percentage'::text])))) not valid;

alter table "public"."commercial_offer_items" validate constraint "commercial_offer_items_discount_type_check";

alter table "public"."commercial_offer_items" add constraint "commercial_offer_items_offer_id_catalog_item_id_key" UNIQUE using index "commercial_offer_items_offer_id_catalog_item_id_key";

alter table "public"."commercial_offer_items" add constraint "commercial_offer_items_offer_id_fkey" FOREIGN KEY (offer_id) REFERENCES public.commercial_offers(id) ON DELETE CASCADE not valid;

alter table "public"."commercial_offer_items" validate constraint "commercial_offer_items_offer_id_fkey";

alter table "public"."commercial_offers" add constraint "commercial_offers_discount_type_check" CHECK (((discount_type IS NULL) OR (discount_type = ANY (ARRAY['fixed'::text, 'percentage'::text])))) not valid;

alter table "public"."commercial_offers" validate constraint "commercial_offers_discount_type_check";

alter table "public"."commercial_offers" add constraint "commercial_offers_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'draft'::text, 'expired'::text, 'archived'::text]))) not valid;

alter table "public"."commercial_offers" validate constraint "commercial_offers_status_check";

alter table "public"."commercial_offers" add constraint "commercial_offers_type_check" CHECK ((offer_type = ANY (ARRAY['manual'::text, 'seasonal'::text, 'campaign'::text, 'bundle'::text, 'recurring'::text]))) not valid;

alter table "public"."commercial_offers" validate constraint "commercial_offers_type_check";

alter table "public"."commercial_opportunities" add constraint "commercial_opportunities_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_opportunities" validate constraint "commercial_opportunities_channel_id_fkey";

alter table "public"."commercial_opportunities" add constraint "commercial_opportunities_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_opportunities" validate constraint "commercial_opportunities_conversation_id_fkey";

alter table "public"."commercial_opportunities" add constraint "commercial_opportunities_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_opportunities" validate constraint "commercial_opportunities_created_by_fkey";

alter table "public"."commercial_opportunities" add constraint "commercial_opportunities_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."commercial_opportunities" validate constraint "commercial_opportunities_organization_id_fkey";

alter table "public"."commercial_opportunities" add constraint "commercial_opportunities_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.commercial_agent_profiles(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_opportunities" validate constraint "commercial_opportunities_profile_id_fkey";

alter table "public"."commercial_opportunities" add constraint "commercial_opportunities_stage_check" CHECK ((stage = ANY (ARRAY['new'::text, 'qualifying'::text, 'qualified'::text, 'offer_preparation'::text, 'offer_sent'::text, 'objection'::text, 'negotiation'::text, 'ready_to_close'::text, 'follow_up'::text, 'won'::text, 'lost'::text]))) not valid;

alter table "public"."commercial_opportunities" validate constraint "commercial_opportunities_stage_check";

alter table "public"."commercial_opportunities" add constraint "commercial_opportunities_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'won'::text, 'lost'::text, 'archived'::text]))) not valid;

alter table "public"."commercial_opportunities" validate constraint "commercial_opportunities_status_check";

alter table "public"."commercial_opportunities" add constraint "commercial_opportunities_temperature_check" CHECK ((temperature = ANY (ARRAY['cold'::text, 'warm'::text, 'hot'::text]))) not valid;

alter table "public"."commercial_opportunities" validate constraint "commercial_opportunities_temperature_check";

alter table "public"."commercial_opportunities" add constraint "commercial_opportunities_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."commercial_opportunities" validate constraint "commercial_opportunities_tenant_id_fkey";

alter table "public"."commercial_opportunities" add constraint "commercial_opportunities_value_check" CHECK (((potential_value IS NULL) OR (potential_value >= (0)::numeric))) not valid;

alter table "public"."commercial_opportunities" validate constraint "commercial_opportunities_value_check";

alter table "public"."commercial_proposal_events" add constraint "commercial_proposal_events_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES public.commercial_proposals(id) ON DELETE CASCADE not valid;

alter table "public"."commercial_proposal_events" validate constraint "commercial_proposal_events_proposal_id_fkey";

alter table "public"."commercial_proposal_events" add constraint "commercial_proposal_events_type_check" CHECK ((event_type = ANY (ARRAY['created'::text, 'sent'::text, 'viewed'::text, 'accepted'::text, 'rejected'::text, 'expired'::text, 'cancelled'::text, 'note'::text, 'updated'::text]))) not valid;

alter table "public"."commercial_proposal_events" validate constraint "commercial_proposal_events_type_check";

alter table "public"."commercial_proposal_items" add constraint "commercial_proposal_items_catalog_item_id_fkey" FOREIGN KEY (catalog_item_id) REFERENCES public.catalog_items(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_proposal_items" validate constraint "commercial_proposal_items_catalog_item_id_fkey";

alter table "public"."commercial_proposal_items" add constraint "commercial_proposal_items_discount_type_check" CHECK (((discount_type IS NULL) OR (discount_type = ANY (ARRAY['fixed'::text, 'percentage'::text])))) not valid;

alter table "public"."commercial_proposal_items" validate constraint "commercial_proposal_items_discount_type_check";

alter table "public"."commercial_proposal_items" add constraint "commercial_proposal_items_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES public.commercial_proposals(id) ON DELETE CASCADE not valid;

alter table "public"."commercial_proposal_items" validate constraint "commercial_proposal_items_proposal_id_fkey";

alter table "public"."commercial_proposals" add constraint "commercial_proposals_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_proposals" validate constraint "commercial_proposals_contact_id_fkey";

alter table "public"."commercial_proposals" add constraint "commercial_proposals_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_proposals" validate constraint "commercial_proposals_conversation_id_fkey";

alter table "public"."commercial_proposals" add constraint "commercial_proposals_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES public.crm_deals(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_proposals" validate constraint "commercial_proposals_deal_id_fkey";

alter table "public"."commercial_proposals" add constraint "commercial_proposals_offer_id_fkey" FOREIGN KEY (offer_id) REFERENCES public.commercial_offers(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_proposals" validate constraint "commercial_proposals_offer_id_fkey";

alter table "public"."commercial_proposals" add constraint "commercial_proposals_proposal_number_key" UNIQUE using index "commercial_proposals_proposal_number_key";

alter table "public"."commercial_proposals" add constraint "commercial_proposals_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'viewed'::text, 'accepted'::text, 'rejected'::text, 'expired'::text, 'cancelled'::text]))) not valid;

alter table "public"."commercial_proposals" validate constraint "commercial_proposals_status_check";

alter table "public"."commercial_response_suggestions" add constraint "commercial_response_suggestions_analysis_id_fkey" FOREIGN KEY (analysis_id) REFERENCES public.commercial_conversation_analysis(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_response_suggestions" validate constraint "commercial_response_suggestions_analysis_id_fkey";

alter table "public"."commercial_response_suggestions" add constraint "commercial_response_suggestions_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_response_suggestions" validate constraint "commercial_response_suggestions_channel_id_fkey";

alter table "public"."commercial_response_suggestions" add constraint "commercial_response_suggestions_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE not valid;

alter table "public"."commercial_response_suggestions" validate constraint "commercial_response_suggestions_conversation_id_fkey";

alter table "public"."commercial_response_suggestions" add constraint "commercial_response_suggestions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_response_suggestions" validate constraint "commercial_response_suggestions_created_by_fkey";

alter table "public"."commercial_response_suggestions" add constraint "commercial_response_suggestions_no_secrets_check" CHECK ((NOT (suggestion ?| ARRAY['api_key'::text, 'apikey'::text, 'secret'::text, 'token'::text, 'cookie'::text, 'access_token'::text, 'refresh_token'::text, 'service_role'::text, 'chain_of_thought'::text]))) not valid;

alter table "public"."commercial_response_suggestions" validate constraint "commercial_response_suggestions_no_secrets_check";

alter table "public"."commercial_response_suggestions" add constraint "commercial_response_suggestions_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."commercial_response_suggestions" validate constraint "commercial_response_suggestions_organization_id_fkey";

alter table "public"."commercial_response_suggestions" add constraint "commercial_response_suggestions_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.commercial_agent_profiles(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_response_suggestions" validate constraint "commercial_response_suggestions_profile_id_fkey";

alter table "public"."commercial_response_suggestions" add constraint "commercial_response_suggestions_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."commercial_response_suggestions" validate constraint "commercial_response_suggestions_reviewed_by_fkey";

alter table "public"."commercial_response_suggestions" add constraint "commercial_response_suggestions_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'edited'::text, 'rejected'::text, 'expired'::text, 'unsafe_suggestion'::text]))) not valid;

alter table "public"."commercial_response_suggestions" validate constraint "commercial_response_suggestions_status_check";

alter table "public"."commercial_response_suggestions" add constraint "commercial_response_suggestions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."commercial_response_suggestions" validate constraint "commercial_response_suggestions_tenant_id_fkey";

alter table "public"."consent_keywords" add constraint "consent_keywords_action_check" CHECK ((action = ANY (ARRAY['opt_in'::text, 'opt_out'::text, 'help'::text, 'unknown'::text]))) not valid;

alter table "public"."consent_keywords" validate constraint "consent_keywords_action_check";

alter table "public"."consent_keywords" add constraint "consent_keywords_channel_check" CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'email'::text, 'sms'::text, 'manual'::text]))) not valid;

alter table "public"."consent_keywords" validate constraint "consent_keywords_channel_check";

alter table "public"."consent_keywords" add constraint "consent_keywords_keyword_key" UNIQUE using index "consent_keywords_keyword_key";

alter table "public"."consent_message_templates" add constraint "consent_message_templates_channel_check" CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'email'::text, 'sms'::text, 'manual'::text]))) not valid;

alter table "public"."consent_message_templates" validate constraint "consent_message_templates_channel_check";

alter table "public"."consent_message_templates" add constraint "consent_message_templates_name_key" UNIQUE using index "consent_message_templates_name_key";

alter table "public"."consent_message_templates" add constraint "consent_message_templates_type_check" CHECK ((template_type = ANY (ARRAY['opt_in_request'::text, 'opt_in_confirmation'::text, 'opt_out_confirmation'::text, 'help'::text, 'campaign_footer'::text]))) not valid;

alter table "public"."consent_message_templates" validate constraint "consent_message_templates_type_check";

alter table "public"."contact_identities" add constraint "contact_identities_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE not valid;

alter table "public"."contact_identities" validate constraint "contact_identities_channel_id_fkey";

alter table "public"."contact_identities" add constraint "contact_identities_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE CASCADE not valid;

alter table "public"."contact_identities" validate constraint "contact_identities_contact_id_fkey";

alter table "public"."conversation_assignment_events" add constraint "conversation_assignment_events_assignment_id_fkey" FOREIGN KEY (assignment_id) REFERENCES public.conversation_assignments(id) ON DELETE CASCADE not valid;

alter table "public"."conversation_assignment_events" validate constraint "conversation_assignment_events_assignment_id_fkey";

alter table "public"."conversation_assignment_events" add constraint "conversation_assignment_events_from_queue_id_fkey" FOREIGN KEY (from_queue_id) REFERENCES public.support_queues(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_assignment_events" validate constraint "conversation_assignment_events_from_queue_id_fkey";

alter table "public"."conversation_assignment_events" add constraint "conversation_assignment_events_from_user_id_fkey" FOREIGN KEY (from_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_assignment_events" validate constraint "conversation_assignment_events_from_user_id_fkey";

alter table "public"."conversation_assignment_events" add constraint "conversation_assignment_events_to_queue_id_fkey" FOREIGN KEY (to_queue_id) REFERENCES public.support_queues(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_assignment_events" validate constraint "conversation_assignment_events_to_queue_id_fkey";

alter table "public"."conversation_assignment_events" add constraint "conversation_assignment_events_to_user_id_fkey" FOREIGN KEY (to_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_assignment_events" validate constraint "conversation_assignment_events_to_user_id_fkey";

alter table "public"."conversation_assignment_events" add constraint "conversation_assignment_events_type_check" CHECK ((event_type = ANY (ARRAY['created'::text, 'assigned'::text, 'transferred'::text, 'unassigned'::text, 'resolved'::text, 'reopened'::text, 'archived'::text]))) not valid;

alter table "public"."conversation_assignment_events" validate constraint "conversation_assignment_events_type_check";

alter table "public"."conversation_assignments" add constraint "conversation_assignments_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_assignments" validate constraint "conversation_assignments_assigned_to_fkey";

alter table "public"."conversation_assignments" add constraint "conversation_assignments_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE not valid;

alter table "public"."conversation_assignments" validate constraint "conversation_assignments_conversation_id_fkey";

alter table "public"."conversation_assignments" add constraint "conversation_assignments_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_assignments" validate constraint "conversation_assignments_organization_id_fkey";

alter table "public"."conversation_assignments" add constraint "conversation_assignments_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."conversation_assignments" validate constraint "conversation_assignments_priority_check";

alter table "public"."conversation_assignments" add constraint "conversation_assignments_queue_id_fkey" FOREIGN KEY (queue_id) REFERENCES public.support_queues(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_assignments" validate constraint "conversation_assignments_queue_id_fkey";

alter table "public"."conversation_assignments" add constraint "conversation_assignments_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'pending'::text, 'resolved'::text, 'archived'::text]))) not valid;

alter table "public"."conversation_assignments" validate constraint "conversation_assignments_status_check";

alter table "public"."conversation_assignments" add constraint "conversation_assignments_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_assignments" validate constraint "conversation_assignments_tenant_id_fkey";

alter table "public"."conversation_flow_sessions" add constraint "conversation_flow_sessions_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_flow_sessions" validate constraint "conversation_flow_sessions_contact_id_fkey";

alter table "public"."conversation_flow_sessions" add constraint "conversation_flow_sessions_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_flow_sessions" validate constraint "conversation_flow_sessions_conversation_id_fkey";

alter table "public"."conversation_flow_sessions" add constraint "conversation_flow_sessions_flow_id_fkey" FOREIGN KEY (flow_id) REFERENCES public.conversation_flows(id) ON DELETE CASCADE not valid;

alter table "public"."conversation_flow_sessions" validate constraint "conversation_flow_sessions_flow_id_fkey";

alter table "public"."conversation_flow_sessions" add constraint "conversation_flow_sessions_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_flow_sessions" validate constraint "conversation_flow_sessions_organization_id_fkey";

alter table "public"."conversation_flow_sessions" add constraint "conversation_flow_sessions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text, 'cancelled'::text]))) not valid;

alter table "public"."conversation_flow_sessions" validate constraint "conversation_flow_sessions_status_check";

alter table "public"."conversation_flow_sessions" add constraint "conversation_flow_sessions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_flow_sessions" validate constraint "conversation_flow_sessions_tenant_id_fkey";

alter table "public"."conversation_flow_steps" add constraint "conversation_flow_steps_flow_id_fkey" FOREIGN KEY (flow_id) REFERENCES public.conversation_flows(id) ON DELETE CASCADE not valid;

alter table "public"."conversation_flow_steps" validate constraint "conversation_flow_steps_flow_id_fkey";

alter table "public"."conversation_flow_steps" add constraint "conversation_flow_steps_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_flow_steps" validate constraint "conversation_flow_steps_organization_id_fkey";

alter table "public"."conversation_flow_steps" add constraint "conversation_flow_steps_quick_reply_id_fkey" FOREIGN KEY (quick_reply_id) REFERENCES public.quick_replies(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_flow_steps" validate constraint "conversation_flow_steps_quick_reply_id_fkey";

alter table "public"."conversation_flow_steps" add constraint "conversation_flow_steps_step_type_check" CHECK ((step_type = ANY (ARRAY['message'::text, 'question'::text, 'follow_up'::text]))) not valid;

alter table "public"."conversation_flow_steps" validate constraint "conversation_flow_steps_step_type_check";

alter table "public"."conversation_flow_steps" add constraint "conversation_flow_steps_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_flow_steps" validate constraint "conversation_flow_steps_tenant_id_fkey";

alter table "public"."conversation_flows" add constraint "conversation_flows_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_flows" validate constraint "conversation_flows_organization_id_fkey";

alter table "public"."conversation_flows" add constraint "conversation_flows_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'archived'::text]))) not valid;

alter table "public"."conversation_flows" validate constraint "conversation_flows_status_check";

alter table "public"."conversation_flows" add constraint "conversation_flows_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_flows" validate constraint "conversation_flows_tenant_id_fkey";

alter table "public"."conversation_flows" add constraint "conversation_flows_trigger_type_check" CHECK ((trigger_type = ANY (ARRAY['manual'::text, 'keyword'::text, 'new_contact'::text, 'follow_up'::text]))) not valid;

alter table "public"."conversation_flows" validate constraint "conversation_flows_trigger_type_check";

alter table "public"."conversation_notes" add constraint "conversation_notes_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_notes" validate constraint "conversation_notes_organization_id_fkey";

alter table "public"."conversation_notes" add constraint "conversation_notes_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."conversation_notes" validate constraint "conversation_notes_tenant_id_fkey";

alter table "public"."crm_activities" add constraint "crm_activities_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."crm_activities" validate constraint "crm_activities_contact_id_fkey";

alter table "public"."crm_activities" add constraint "crm_activities_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."crm_activities" validate constraint "crm_activities_conversation_id_fkey";

alter table "public"."crm_activities" add constraint "crm_activities_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES public.crm_deals(id) ON DELETE CASCADE not valid;

alter table "public"."crm_activities" validate constraint "crm_activities_deal_id_fkey";

alter table "public"."crm_activities" add constraint "crm_activities_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."crm_activities" validate constraint "crm_activities_organization_id_fkey";

alter table "public"."crm_activities" add constraint "crm_activities_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.crm_tasks(id) ON DELETE SET NULL not valid;

alter table "public"."crm_activities" validate constraint "crm_activities_task_id_fkey";

alter table "public"."crm_activities" add constraint "crm_activities_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."crm_activities" validate constraint "crm_activities_tenant_id_fkey";

alter table "public"."crm_campaign_recipients" add constraint "crm_campaign_recipients_campaign_id_contact_id_key" UNIQUE using index "crm_campaign_recipients_campaign_id_contact_id_key";

alter table "public"."crm_campaign_recipients" add constraint "crm_campaign_recipients_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES public.crm_campaigns(id) ON DELETE CASCADE not valid;

alter table "public"."crm_campaign_recipients" validate constraint "crm_campaign_recipients_campaign_id_fkey";

alter table "public"."crm_campaign_recipients" add constraint "crm_campaign_recipients_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE CASCADE not valid;

alter table "public"."crm_campaign_recipients" validate constraint "crm_campaign_recipients_contact_id_fkey";

alter table "public"."crm_campaign_recipients" add constraint "crm_campaign_recipients_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'skipped'::text, 'blocked'::text]))) not valid;

alter table "public"."crm_campaign_recipients" validate constraint "crm_campaign_recipients_status_check";

alter table "public"."crm_campaigns" add constraint "crm_campaigns_channel_check" CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'email'::text, 'sms'::text, 'manual'::text]))) not valid;

alter table "public"."crm_campaigns" validate constraint "crm_campaigns_channel_check";

alter table "public"."crm_campaigns" add constraint "crm_campaigns_list_id_fkey" FOREIGN KEY (list_id) REFERENCES public.crm_contact_lists(id) ON DELETE SET NULL not valid;

alter table "public"."crm_campaigns" validate constraint "crm_campaigns_list_id_fkey";

alter table "public"."crm_campaigns" add constraint "crm_campaigns_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'running'::text, 'paused'::text, 'finished'::text, 'cancelled'::text]))) not valid;

alter table "public"."crm_campaigns" validate constraint "crm_campaigns_status_check";

alter table "public"."crm_consent_events" add constraint "crm_consent_events_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE CASCADE not valid;

alter table "public"."crm_consent_events" validate constraint "crm_consent_events_contact_id_fkey";

alter table "public"."crm_consent_events" add constraint "crm_consent_events_new_status_check" CHECK ((new_status = ANY (ARRAY['unknown'::text, 'opted_in'::text, 'opted_out'::text]))) not valid;

alter table "public"."crm_consent_events" validate constraint "crm_consent_events_new_status_check";

alter table "public"."crm_contact_list_items" add constraint "crm_contact_list_items_consent_status_check" CHECK ((consent_status = ANY (ARRAY['unknown'::text, 'opted_in'::text, 'opted_out'::text]))) not valid;

alter table "public"."crm_contact_list_items" validate constraint "crm_contact_list_items_consent_status_check";

alter table "public"."crm_contact_list_items" add constraint "crm_contact_list_items_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE CASCADE not valid;

alter table "public"."crm_contact_list_items" validate constraint "crm_contact_list_items_contact_id_fkey";

alter table "public"."crm_contact_list_items" add constraint "crm_contact_list_items_list_id_contact_id_key" UNIQUE using index "crm_contact_list_items_list_id_contact_id_key";

alter table "public"."crm_contact_list_items" add constraint "crm_contact_list_items_list_id_fkey" FOREIGN KEY (list_id) REFERENCES public.crm_contact_lists(id) ON DELETE CASCADE not valid;

alter table "public"."crm_contact_list_items" validate constraint "crm_contact_list_items_list_id_fkey";

alter table "public"."crm_contact_list_items" add constraint "crm_contact_list_items_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."crm_contact_list_items" validate constraint "crm_contact_list_items_organization_id_fkey";

alter table "public"."crm_contact_list_items" add constraint "crm_contact_list_items_review_status_check" CHECK ((review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."crm_contact_list_items" validate constraint "crm_contact_list_items_review_status_check";

alter table "public"."crm_contact_list_items" add constraint "crm_contact_list_items_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."crm_contact_list_items" validate constraint "crm_contact_list_items_tenant_id_fkey";

alter table "public"."crm_contact_lists" add constraint "crm_contact_lists_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."crm_contact_lists" validate constraint "crm_contact_lists_organization_id_fkey";

alter table "public"."crm_contact_lists" add constraint "crm_contact_lists_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'review'::text, 'approved'::text, 'archived'::text]))) not valid;

alter table "public"."crm_contact_lists" validate constraint "crm_contact_lists_status_check";

alter table "public"."crm_contact_lists" add constraint "crm_contact_lists_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."crm_contact_lists" validate constraint "crm_contact_lists_tenant_id_fkey";

alter table "public"."crm_contact_notes" add constraint "crm_contact_notes_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."crm_contact_notes" validate constraint "crm_contact_notes_organization_id_fkey";

alter table "public"."crm_contact_notes" add constraint "crm_contact_notes_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."crm_contact_notes" validate constraint "crm_contact_notes_tenant_id_fkey";

alter table "public"."crm_contact_tags" add constraint "crm_contact_tags_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE CASCADE not valid;

alter table "public"."crm_contact_tags" validate constraint "crm_contact_tags_contact_id_fkey";

alter table "public"."crm_contact_tags" add constraint "crm_contact_tags_contact_id_tag_id_key" UNIQUE using index "crm_contact_tags_contact_id_tag_id_key";

alter table "public"."crm_contact_tags" add constraint "crm_contact_tags_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."crm_contact_tags" validate constraint "crm_contact_tags_organization_id_fkey";

alter table "public"."crm_contact_tags" add constraint "crm_contact_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES public.crm_tags(id) ON DELETE CASCADE not valid;

alter table "public"."crm_contact_tags" validate constraint "crm_contact_tags_tag_id_fkey";

alter table "public"."crm_contact_tags" add constraint "crm_contact_tags_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."crm_contact_tags" validate constraint "crm_contact_tags_tenant_id_fkey";

alter table "public"."crm_contacts" add constraint "crm_contacts_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."crm_contacts" validate constraint "crm_contacts_organization_id_fkey";

alter table "public"."crm_contacts" add constraint "crm_contacts_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."crm_contacts" validate constraint "crm_contacts_tenant_id_fkey";

alter table "public"."crm_deals" add constraint "crm_deals_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."crm_deals" validate constraint "crm_deals_contact_id_fkey";

alter table "public"."crm_deals" add constraint "crm_deals_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."crm_deals" validate constraint "crm_deals_conversation_id_fkey";

alter table "public"."crm_deals" add constraint "crm_deals_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."crm_deals" validate constraint "crm_deals_organization_id_fkey";

alter table "public"."crm_deals" add constraint "crm_deals_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."crm_deals" validate constraint "crm_deals_priority_check";

alter table "public"."crm_deals" add constraint "crm_deals_stage_id_fkey" FOREIGN KEY (stage_id) REFERENCES public.crm_pipeline_stages(id) ON DELETE SET NULL not valid;

alter table "public"."crm_deals" validate constraint "crm_deals_stage_id_fkey";

alter table "public"."crm_deals" add constraint "crm_deals_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'won'::text, 'lost'::text, 'archived'::text]))) not valid;

alter table "public"."crm_deals" validate constraint "crm_deals_status_check";

alter table "public"."crm_deals" add constraint "crm_deals_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."crm_deals" validate constraint "crm_deals_tenant_id_fkey";

alter table "public"."crm_pipeline_stages" add constraint "crm_pipeline_stages_name_key" UNIQUE using index "crm_pipeline_stages_name_key";

alter table "public"."crm_pipeline_stages" add constraint "crm_pipeline_stages_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."crm_pipeline_stages" validate constraint "crm_pipeline_stages_organization_id_fkey";

alter table "public"."crm_pipeline_stages" add constraint "crm_pipeline_stages_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."crm_pipeline_stages" validate constraint "crm_pipeline_stages_tenant_id_fkey";

alter table "public"."crm_tags" add constraint "crm_tags_name_key" UNIQUE using index "crm_tags_name_key";

alter table "public"."crm_tags" add constraint "crm_tags_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."crm_tags" validate constraint "crm_tags_organization_id_fkey";

alter table "public"."crm_tags" add constraint "crm_tags_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."crm_tags" validate constraint "crm_tags_tenant_id_fkey";

alter table "public"."crm_task_templates" add constraint "crm_task_templates_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."crm_task_templates" validate constraint "crm_task_templates_priority_check";

alter table "public"."crm_task_templates" add constraint "crm_task_templates_type_check" CHECK ((task_type = ANY (ARRAY['follow_up'::text, 'call'::text, 'message'::text, 'proposal'::text, 'payment'::text, 'meeting'::text, 'other'::text]))) not valid;

alter table "public"."crm_task_templates" validate constraint "crm_task_templates_type_check";

alter table "public"."crm_tasks" add constraint "crm_tasks_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."crm_tasks" validate constraint "crm_tasks_contact_id_fkey";

alter table "public"."crm_tasks" add constraint "crm_tasks_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."crm_tasks" validate constraint "crm_tasks_conversation_id_fkey";

alter table "public"."crm_tasks" add constraint "crm_tasks_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES public.crm_deals(id) ON DELETE CASCADE not valid;

alter table "public"."crm_tasks" validate constraint "crm_tasks_deal_id_fkey";

alter table "public"."crm_tasks" add constraint "crm_tasks_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."crm_tasks" validate constraint "crm_tasks_organization_id_fkey";

alter table "public"."crm_tasks" add constraint "crm_tasks_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."crm_tasks" validate constraint "crm_tasks_priority_check";

alter table "public"."crm_tasks" add constraint "crm_tasks_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))) not valid;

alter table "public"."crm_tasks" validate constraint "crm_tasks_status_check";

alter table "public"."crm_tasks" add constraint "crm_tasks_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."crm_tasks" validate constraint "crm_tasks_tenant_id_fkey";

alter table "public"."crm_tasks" add constraint "crm_tasks_type_check" CHECK ((task_type = ANY (ARRAY['follow_up'::text, 'call'::text, 'message'::text, 'proposal'::text, 'payment'::text, 'meeting'::text, 'other'::text]))) not valid;

alter table "public"."crm_tasks" validate constraint "crm_tasks_type_check";

alter table "public"."deploy_checklist_items" add constraint "deploy_checklist_items_checklist_id_fkey" FOREIGN KEY (checklist_id) REFERENCES public.deploy_checklists(id) ON DELETE CASCADE not valid;

alter table "public"."deploy_checklist_items" validate constraint "deploy_checklist_items_checklist_id_fkey";

alter table "public"."deploy_checklists" add constraint "deploy_checklists_environment_check" CHECK ((environment = ANY (ARRAY['preview'::text, 'staging'::text, 'production'::text, 'railway'::text, 'vercel'::text, 'supabase'::text, 'other'::text]))) not valid;

alter table "public"."deploy_checklists" validate constraint "deploy_checklists_environment_check";

alter table "public"."deploy_checklists" add constraint "deploy_checklists_name_key" UNIQUE using index "deploy_checklists_name_key";

alter table "public"."deploy_checklists" add constraint "deploy_checklists_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text]))) not valid;

alter table "public"."deploy_checklists" validate constraint "deploy_checklists_status_check";

alter table "public"."deployments" add constraint "deployments_environment_check" CHECK ((environment = ANY (ARRAY['preview'::text, 'staging'::text, 'production'::text, 'railway'::text, 'vercel'::text, 'supabase'::text, 'other'::text]))) not valid;

alter table "public"."deployments" validate constraint "deployments_environment_check";

alter table "public"."deployments" add constraint "deployments_provider_check" CHECK ((provider = ANY (ARRAY['vercel'::text, 'railway'::text, 'supabase'::text, 'github'::text, 'manual'::text, 'other'::text]))) not valid;

alter table "public"."deployments" validate constraint "deployments_provider_check";

alter table "public"."deployments" add constraint "deployments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'building'::text, 'success'::text, 'failed'::text, 'cancelled'::text, 'rolled_back'::text]))) not valid;

alter table "public"."deployments" validate constraint "deployments_status_check";

alter table "public"."document_acceptances" add constraint "document_acceptances_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."document_acceptances" validate constraint "document_acceptances_contact_id_fkey";

alter table "public"."document_acceptances" add constraint "document_acceptances_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE not valid;

alter table "public"."document_acceptances" validate constraint "document_acceptances_document_id_fkey";

alter table "public"."document_acceptances" add constraint "document_acceptances_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'cancelled'::text]))) not valid;

alter table "public"."document_acceptances" validate constraint "document_acceptances_status_check";

alter table "public"."document_acceptances" add constraint "document_acceptances_type_check" CHECK ((acceptance_type = ANY (ARRAY['click_accept'::text, 'typed_name'::text, 'otp'::text, 'signature_image'::text, 'manual'::text, 'other'::text]))) not valid;

alter table "public"."document_acceptances" validate constraint "document_acceptances_type_check";

alter table "public"."document_events" add constraint "document_events_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE not valid;

alter table "public"."document_events" validate constraint "document_events_document_id_fkey";

alter table "public"."document_events" add constraint "document_events_type_check" CHECK ((event_type = ANY (ARRAY['created'::text, 'rendered'::text, 'sent'::text, 'viewed'::text, 'downloaded'::text, 'accepted'::text, 'rejected'::text, 'expired'::text, 'cancelled'::text, 'file_generated'::text, 'note'::text, 'updated'::text, 'other'::text]))) not valid;

alter table "public"."document_events" validate constraint "document_events_type_check";

alter table "public"."document_files" add constraint "document_files_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE not valid;

alter table "public"."document_files" validate constraint "document_files_document_id_fkey";

alter table "public"."document_files" add constraint "document_files_type_check" CHECK ((file_type = ANY (ARRAY['pdf'::text, 'html'::text, 'image'::text, 'signature'::text, 'attachment'::text, 'other'::text]))) not valid;

alter table "public"."document_files" validate constraint "document_files_type_check";

alter table "public"."document_public_links" add constraint "document_public_links_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE not valid;

alter table "public"."document_public_links" validate constraint "document_public_links_document_id_fkey";

alter table "public"."document_public_links" add constraint "document_public_links_purpose_check" CHECK ((purpose = ANY (ARRAY['view'::text, 'accept'::text, 'download'::text, 'payment'::text, 'other'::text]))) not valid;

alter table "public"."document_public_links" validate constraint "document_public_links_purpose_check";

alter table "public"."document_public_links" add constraint "document_public_links_token_key" UNIQUE using index "document_public_links_token_key";

alter table "public"."document_templates" add constraint "document_templates_name_key" UNIQUE using index "document_templates_name_key";

alter table "public"."document_templates" add constraint "document_templates_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'inactive'::text, 'archived'::text]))) not valid;

alter table "public"."document_templates" validate constraint "document_templates_status_check";

alter table "public"."document_templates" add constraint "document_templates_type_check" CHECK ((template_type = ANY (ARRAY['contract'::text, 'terms'::text, 'proposal'::text, 'receipt'::text, 'authorization'::text, 'policy'::text, 'other'::text]))) not valid;

alter table "public"."document_templates" validate constraint "document_templates_type_check";

alter table "public"."documents" add constraint "documents_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."documents" validate constraint "documents_contact_id_fkey";

alter table "public"."documents" add constraint "documents_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."documents" validate constraint "documents_conversation_id_fkey";

alter table "public"."documents" add constraint "documents_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES public.crm_deals(id) ON DELETE SET NULL not valid;

alter table "public"."documents" validate constraint "documents_deal_id_fkey";

alter table "public"."documents" add constraint "documents_document_number_key" UNIQUE using index "documents_document_number_key";

alter table "public"."documents" add constraint "documents_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.finance_invoices(id) ON DELETE SET NULL not valid;

alter table "public"."documents" validate constraint "documents_invoice_id_fkey";

alter table "public"."documents" add constraint "documents_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES public.commercial_proposals(id) ON DELETE SET NULL not valid;

alter table "public"."documents" validate constraint "documents_proposal_id_fkey";

alter table "public"."documents" add constraint "documents_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'viewed'::text, 'accepted'::text, 'rejected'::text, 'expired'::text, 'cancelled'::text, 'archived'::text]))) not valid;

alter table "public"."documents" validate constraint "documents_status_check";

alter table "public"."documents" add constraint "documents_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.document_templates(id) ON DELETE SET NULL not valid;

alter table "public"."documents" validate constraint "documents_template_id_fkey";

alter table "public"."documents" add constraint "documents_type_check" CHECK ((document_type = ANY (ARRAY['contract'::text, 'terms'::text, 'proposal'::text, 'receipt'::text, 'authorization'::text, 'policy'::text, 'other'::text]))) not valid;

alter table "public"."documents" validate constraint "documents_type_check";

alter table "public"."external_integrations" add constraint "external_integrations_auth_type_check" CHECK ((auth_type = ANY (ARRAY['none'::text, 'bearer'::text, 'basic'::text, 'api_key'::text, 'oauth2'::text, 'custom'::text]))) not valid;

alter table "public"."external_integrations" validate constraint "external_integrations_auth_type_check";

alter table "public"."external_integrations" add constraint "external_integrations_name_key" UNIQUE using index "external_integrations_name_key";

alter table "public"."external_integrations" add constraint "external_integrations_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'error'::text, 'paused'::text, 'archived'::text]))) not valid;

alter table "public"."external_integrations" validate constraint "external_integrations_status_check";

alter table "public"."external_integrations" add constraint "external_integrations_type_check" CHECK ((integration_type = ANY (ARRAY['webhook'::text, 'api'::text, 'database'::text, 'storage'::text, 'crm'::text, 'ecommerce'::text, 'payment'::text, 'automation'::text, 'other'::text]))) not valid;

alter table "public"."external_integrations" validate constraint "external_integrations_type_check";

alter table "public"."file_access_logs" add constraint "file_access_logs_action_check" CHECK ((action = ANY (ARRAY['view'::text, 'download'::text, 'upload'::text, 'share'::text, 'archive'::text, 'delete'::text, 'restore'::text, 'version_created'::text, 'other'::text]))) not valid;

alter table "public"."file_access_logs" validate constraint "file_access_logs_action_check";

alter table "public"."file_access_logs" add constraint "file_access_logs_file_id_fkey" FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE not valid;

alter table "public"."file_access_logs" validate constraint "file_access_logs_file_id_fkey";

alter table "public"."file_access_logs" add constraint "file_access_logs_share_id_fkey" FOREIGN KEY (share_id) REFERENCES public.file_shares(id) ON DELETE SET NULL not valid;

alter table "public"."file_access_logs" validate constraint "file_access_logs_share_id_fkey";

alter table "public"."file_folders" add constraint "file_folders_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.file_folders(id) ON DELETE CASCADE not valid;

alter table "public"."file_folders" validate constraint "file_folders_parent_id_fkey";

alter table "public"."file_folders" add constraint "file_folders_type_check" CHECK ((folder_type = ANY (ARRAY['general'::text, 'contacts'::text, 'conversations'::text, 'proposals'::text, 'invoices'::text, 'contracts'::text, 'media'::text, 'receipts'::text, 'internal'::text, 'temporary'::text, 'other'::text]))) not valid;

alter table "public"."file_folders" validate constraint "file_folders_type_check";

alter table "public"."file_shares" add constraint "file_shares_file_id_fkey" FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE not valid;

alter table "public"."file_shares" validate constraint "file_shares_file_id_fkey";

alter table "public"."file_shares" add constraint "file_shares_token_key" UNIQUE using index "file_shares_token_key";

alter table "public"."file_shares" add constraint "file_shares_type_check" CHECK ((share_type = ANY (ARRAY['view'::text, 'download'::text, 'upload'::text, 'sign'::text, 'payment'::text, 'other'::text]))) not valid;

alter table "public"."file_shares" validate constraint "file_shares_type_check";

alter table "public"."file_tag_links" add constraint "file_tag_links_file_id_fkey" FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE not valid;

alter table "public"."file_tag_links" validate constraint "file_tag_links_file_id_fkey";

alter table "public"."file_tag_links" add constraint "file_tag_links_file_id_tag_id_key" UNIQUE using index "file_tag_links_file_id_tag_id_key";

alter table "public"."file_tag_links" add constraint "file_tag_links_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES public.file_tags(id) ON DELETE CASCADE not valid;

alter table "public"."file_tag_links" validate constraint "file_tag_links_tag_id_fkey";

alter table "public"."file_tags" add constraint "file_tags_name_key" UNIQUE using index "file_tags_name_key";

alter table "public"."file_versions" add constraint "file_versions_file_id_fkey" FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE not valid;

alter table "public"."file_versions" validate constraint "file_versions_file_id_fkey";

alter table "public"."file_versions" add constraint "file_versions_file_id_version_number_key" UNIQUE using index "file_versions_file_id_version_number_key";

alter table "public"."files" add constraint "files_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."files" validate constraint "files_contact_id_fkey";

alter table "public"."files" add constraint "files_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."files" validate constraint "files_conversation_id_fkey";

alter table "public"."files" add constraint "files_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES public.crm_deals(id) ON DELETE SET NULL not valid;

alter table "public"."files" validate constraint "files_deal_id_fkey";

alter table "public"."files" add constraint "files_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL not valid;

alter table "public"."files" validate constraint "files_document_id_fkey";

alter table "public"."files" add constraint "files_file_type_check" CHECK ((file_type = ANY (ARRAY['image'::text, 'audio'::text, 'video'::text, 'document'::text, 'pdf'::text, 'spreadsheet'::text, 'presentation'::text, 'contract'::text, 'receipt'::text, 'proof'::text, 'avatar'::text, 'media'::text, 'backup'::text, 'other'::text]))) not valid;

alter table "public"."files" validate constraint "files_file_type_check";

alter table "public"."files" add constraint "files_folder_id_fkey" FOREIGN KEY (folder_id) REFERENCES public.file_folders(id) ON DELETE SET NULL not valid;

alter table "public"."files" validate constraint "files_folder_id_fkey";

alter table "public"."files" add constraint "files_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.finance_invoices(id) ON DELETE SET NULL not valid;

alter table "public"."files" validate constraint "files_invoice_id_fkey";

alter table "public"."files" add constraint "files_message_id_fkey" FOREIGN KEY (message_id) REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL not valid;

alter table "public"."files" validate constraint "files_message_id_fkey";

alter table "public"."files" add constraint "files_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES public.commercial_proposals(id) ON DELETE SET NULL not valid;

alter table "public"."files" validate constraint "files_proposal_id_fkey";

alter table "public"."files" add constraint "files_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text, 'deleted'::text, 'processing'::text, 'failed'::text]))) not valid;

alter table "public"."files" validate constraint "files_status_check";

alter table "public"."files" add constraint "files_visibility_check" CHECK ((visibility = ANY (ARRAY['private'::text, 'internal'::text, 'public'::text, 'restricted'::text]))) not valid;

alter table "public"."files" validate constraint "files_visibility_check";

alter table "public"."finance_accounts" add constraint "finance_accounts_name_key" UNIQUE using index "finance_accounts_name_key";

alter table "public"."finance_accounts" add constraint "finance_accounts_type_check" CHECK ((account_type = ANY (ARRAY['bank'::text, 'cash'::text, 'pix'::text, 'gateway'::text, 'wallet'::text, 'other'::text]))) not valid;

alter table "public"."finance_accounts" validate constraint "finance_accounts_type_check";

alter table "public"."finance_events" add constraint "finance_events_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."finance_events" validate constraint "finance_events_contact_id_fkey";

alter table "public"."finance_events" add constraint "finance_events_installment_id_fkey" FOREIGN KEY (installment_id) REFERENCES public.finance_installments(id) ON DELETE SET NULL not valid;

alter table "public"."finance_events" validate constraint "finance_events_installment_id_fkey";

alter table "public"."finance_events" add constraint "finance_events_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.finance_invoices(id) ON DELETE CASCADE not valid;

alter table "public"."finance_events" validate constraint "finance_events_invoice_id_fkey";

alter table "public"."finance_events" add constraint "finance_events_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES public.finance_payments(id) ON DELETE SET NULL not valid;

alter table "public"."finance_events" validate constraint "finance_events_payment_id_fkey";

alter table "public"."finance_events" add constraint "finance_events_type_check" CHECK ((event_type = ANY (ARRAY['invoice_created'::text, 'invoice_sent'::text, 'invoice_paid'::text, 'invoice_overdue'::text, 'payment_received'::text, 'payment_failed'::text, 'payment_refunded'::text, 'installment_created'::text, 'installment_paid'::text, 'note'::text, 'status_changed'::text, 'other'::text]))) not valid;

alter table "public"."finance_events" validate constraint "finance_events_type_check";

alter table "public"."finance_installments" add constraint "finance_installments_finance_account_id_fkey" FOREIGN KEY (finance_account_id) REFERENCES public.finance_accounts(id) ON DELETE SET NULL not valid;

alter table "public"."finance_installments" validate constraint "finance_installments_finance_account_id_fkey";

alter table "public"."finance_installments" add constraint "finance_installments_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.finance_invoices(id) ON DELETE CASCADE not valid;

alter table "public"."finance_installments" validate constraint "finance_installments_invoice_id_fkey";

alter table "public"."finance_installments" add constraint "finance_installments_invoice_id_installment_number_key" UNIQUE using index "finance_installments_invoice_id_installment_number_key";

alter table "public"."finance_installments" add constraint "finance_installments_payment_method_id_fkey" FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL not valid;

alter table "public"."finance_installments" validate constraint "finance_installments_payment_method_id_fkey";

alter table "public"."finance_installments" add constraint "finance_installments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'paid'::text, 'partially_paid'::text, 'overdue'::text, 'cancelled'::text, 'refunded'::text]))) not valid;

alter table "public"."finance_installments" validate constraint "finance_installments_status_check";

alter table "public"."finance_invoice_items" add constraint "finance_invoice_items_catalog_item_id_fkey" FOREIGN KEY (catalog_item_id) REFERENCES public.catalog_items(id) ON DELETE SET NULL not valid;

alter table "public"."finance_invoice_items" validate constraint "finance_invoice_items_catalog_item_id_fkey";

alter table "public"."finance_invoice_items" add constraint "finance_invoice_items_discount_type_check" CHECK (((discount_type IS NULL) OR (discount_type = ANY (ARRAY['fixed'::text, 'percentage'::text])))) not valid;

alter table "public"."finance_invoice_items" validate constraint "finance_invoice_items_discount_type_check";

alter table "public"."finance_invoice_items" add constraint "finance_invoice_items_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.finance_invoices(id) ON DELETE CASCADE not valid;

alter table "public"."finance_invoice_items" validate constraint "finance_invoice_items_invoice_id_fkey";

alter table "public"."finance_invoices" add constraint "finance_invoices_checkout_session_id_fkey" FOREIGN KEY (checkout_session_id) REFERENCES public.billing_checkout_sessions(id) not valid;

alter table "public"."finance_invoices" validate constraint "finance_invoices_checkout_session_id_fkey";

alter table "public"."finance_invoices" add constraint "finance_invoices_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."finance_invoices" validate constraint "finance_invoices_contact_id_fkey";

alter table "public"."finance_invoices" add constraint "finance_invoices_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."finance_invoices" validate constraint "finance_invoices_conversation_id_fkey";

alter table "public"."finance_invoices" add constraint "finance_invoices_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES public.crm_deals(id) ON DELETE SET NULL not valid;

alter table "public"."finance_invoices" validate constraint "finance_invoices_deal_id_fkey";

alter table "public"."finance_invoices" add constraint "finance_invoices_invoice_number_key" UNIQUE using index "finance_invoices_invoice_number_key";

alter table "public"."finance_invoices" add constraint "finance_invoices_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."finance_invoices" validate constraint "finance_invoices_organization_id_fkey";

alter table "public"."finance_invoices" add constraint "finance_invoices_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES public.commercial_proposals(id) ON DELETE SET NULL not valid;

alter table "public"."finance_invoices" validate constraint "finance_invoices_proposal_id_fkey";

alter table "public"."finance_invoices" add constraint "finance_invoices_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'issued'::text, 'sent'::text, 'partially_paid'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text, 'refunded'::text]))) not valid;

alter table "public"."finance_invoices" validate constraint "finance_invoices_status_check";

alter table "public"."finance_invoices" add constraint "finance_invoices_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) not valid;

alter table "public"."finance_invoices" validate constraint "finance_invoices_tenant_id_fkey";

alter table "public"."finance_payments" add constraint "finance_payments_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."finance_payments" validate constraint "finance_payments_contact_id_fkey";

alter table "public"."finance_payments" add constraint "finance_payments_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES public.crm_deals(id) ON DELETE SET NULL not valid;

alter table "public"."finance_payments" validate constraint "finance_payments_deal_id_fkey";

alter table "public"."finance_payments" add constraint "finance_payments_finance_account_id_fkey" FOREIGN KEY (finance_account_id) REFERENCES public.finance_accounts(id) ON DELETE SET NULL not valid;

alter table "public"."finance_payments" validate constraint "finance_payments_finance_account_id_fkey";

alter table "public"."finance_payments" add constraint "finance_payments_installment_id_fkey" FOREIGN KEY (installment_id) REFERENCES public.finance_installments(id) ON DELETE SET NULL not valid;

alter table "public"."finance_payments" validate constraint "finance_payments_installment_id_fkey";

alter table "public"."finance_payments" add constraint "finance_payments_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.finance_invoices(id) ON DELETE SET NULL not valid;

alter table "public"."finance_payments" validate constraint "finance_payments_invoice_id_fkey";

alter table "public"."finance_payments" add constraint "finance_payments_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."finance_payments" validate constraint "finance_payments_organization_id_fkey";

alter table "public"."finance_payments" add constraint "finance_payments_payment_method_id_fkey" FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL not valid;

alter table "public"."finance_payments" validate constraint "finance_payments_payment_method_id_fkey";

alter table "public"."finance_payments" add constraint "finance_payments_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES public.commercial_proposals(id) ON DELETE SET NULL not valid;

alter table "public"."finance_payments" validate constraint "finance_payments_proposal_id_fkey";

alter table "public"."finance_payments" add constraint "finance_payments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'confirmed'::text, 'failed'::text, 'cancelled'::text, 'refunded'::text, 'chargeback'::text]))) not valid;

alter table "public"."finance_payments" validate constraint "finance_payments_status_check";

alter table "public"."finance_payments" add constraint "finance_payments_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) not valid;

alter table "public"."finance_payments" validate constraint "finance_payments_tenant_id_fkey";

alter table "public"."global_search_index" add constraint "global_search_index_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."global_search_index" validate constraint "global_search_index_contact_id_fkey";

alter table "public"."global_search_index" add constraint "global_search_index_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."global_search_index" validate constraint "global_search_index_conversation_id_fkey";

alter table "public"."global_search_index" add constraint "global_search_index_entity_type_entity_id_key" UNIQUE using index "global_search_index_entity_type_entity_id_key";

alter table "public"."global_search_index" add constraint "global_search_index_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."global_search_index" validate constraint "global_search_index_organization_id_fkey";

alter table "public"."global_search_index" add constraint "global_search_index_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."global_search_index" validate constraint "global_search_index_tenant_id_fkey";

alter table "public"."group_contact_list_items" add constraint "group_contact_list_items_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."group_contact_list_items" validate constraint "group_contact_list_items_organization_id_fkey";

alter table "public"."group_contact_list_items" add constraint "group_contact_list_items_review_status_check" CHECK ((review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."group_contact_list_items" validate constraint "group_contact_list_items_review_status_check";

alter table "public"."group_contact_list_items" add constraint "group_contact_list_items_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."group_contact_list_items" validate constraint "group_contact_list_items_tenant_id_fkey";

alter table "public"."group_contact_lists" add constraint "group_contact_lists_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."group_contact_lists" validate constraint "group_contact_lists_organization_id_fkey";

alter table "public"."group_contact_lists" add constraint "group_contact_lists_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."group_contact_lists" validate constraint "group_contact_lists_tenant_id_fkey";

alter table "public"."import_column_mappings" add constraint "import_column_mappings_import_type_check" CHECK ((import_type = ANY (ARRAY['contacts'::text, 'companies'::text, 'deals'::text, 'products'::text, 'tasks'::text, 'messages'::text, 'other'::text]))) not valid;

alter table "public"."import_column_mappings" validate constraint "import_column_mappings_import_type_check";

alter table "public"."import_column_mappings" add constraint "import_column_mappings_name_key" UNIQUE using index "import_column_mappings_name_key";

alter table "public"."import_column_mappings" add constraint "import_column_mappings_source_type_check" CHECK ((source_type = ANY (ARRAY['manual_paste'::text, 'txt'::text, 'csv'::text, 'xlsx'::text, 'google_csv'::text, 'microsoft_csv'::text, 'whatsapp_group'::text, 'api'::text, 'other'::text]))) not valid;

alter table "public"."import_column_mappings" validate constraint "import_column_mappings_source_type_check";

alter table "public"."import_deduplication_rules" add constraint "import_deduplication_rules_name_key" UNIQUE using index "import_deduplication_rules_name_key";

alter table "public"."import_deduplication_rules" add constraint "import_deduplication_rules_strategy_check" CHECK ((strategy = ANY (ARRAY['skip_existing'::text, 'update_existing'::text, 'create_duplicate'::text, 'manual_review'::text]))) not valid;

alter table "public"."import_deduplication_rules" validate constraint "import_deduplication_rules_strategy_check";

alter table "public"."import_jobs" add constraint "import_jobs_file_id_fkey" FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE SET NULL not valid;

alter table "public"."import_jobs" validate constraint "import_jobs_file_id_fkey";

alter table "public"."import_jobs" add constraint "import_jobs_import_type_check" CHECK ((import_type = ANY (ARRAY['contacts'::text, 'companies'::text, 'deals'::text, 'products'::text, 'tasks'::text, 'messages'::text, 'other'::text]))) not valid;

alter table "public"."import_jobs" validate constraint "import_jobs_import_type_check";

alter table "public"."import_jobs" add constraint "import_jobs_source_type_check" CHECK ((source_type = ANY (ARRAY['manual_paste'::text, 'txt'::text, 'csv'::text, 'xlsx'::text, 'google_csv'::text, 'microsoft_csv'::text, 'whatsapp_group'::text, 'api'::text, 'other'::text]))) not valid;

alter table "public"."import_jobs" validate constraint "import_jobs_source_type_check";

alter table "public"."import_jobs" add constraint "import_jobs_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'preview'::text, 'validated'::text, 'importing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))) not valid;

alter table "public"."import_jobs" validate constraint "import_jobs_status_check";

alter table "public"."import_logs" add constraint "import_logs_job_id_fkey" FOREIGN KEY (job_id) REFERENCES public.import_jobs(id) ON DELETE CASCADE not valid;

alter table "public"."import_logs" validate constraint "import_logs_job_id_fkey";

alter table "public"."import_logs" add constraint "import_logs_level_check" CHECK ((log_level = ANY (ARRAY['debug'::text, 'info'::text, 'warning'::text, 'error'::text, 'success'::text]))) not valid;

alter table "public"."import_logs" validate constraint "import_logs_level_check";

alter table "public"."import_logs" add constraint "import_logs_row_id_fkey" FOREIGN KEY (row_id) REFERENCES public.import_rows(id) ON DELETE CASCADE not valid;

alter table "public"."import_logs" validate constraint "import_logs_row_id_fkey";

alter table "public"."import_rows" add constraint "import_rows_duplicate_of_contact_id_fkey" FOREIGN KEY (duplicate_of_contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."import_rows" validate constraint "import_rows_duplicate_of_contact_id_fkey";

alter table "public"."import_rows" add constraint "import_rows_imported_contact_id_fkey" FOREIGN KEY (imported_contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."import_rows" validate constraint "import_rows_imported_contact_id_fkey";

alter table "public"."import_rows" add constraint "import_rows_job_id_fkey" FOREIGN KEY (job_id) REFERENCES public.import_jobs(id) ON DELETE CASCADE not valid;

alter table "public"."import_rows" validate constraint "import_rows_job_id_fkey";

alter table "public"."import_rows" add constraint "import_rows_job_id_row_number_key" UNIQUE using index "import_rows_job_id_row_number_key";

alter table "public"."import_rows" add constraint "import_rows_review_status_check" CHECK ((review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."import_rows" validate constraint "import_rows_review_status_check";

alter table "public"."import_rows" add constraint "import_rows_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'valid'::text, 'invalid'::text, 'duplicate'::text, 'imported'::text, 'skipped'::text, 'failed'::text]))) not valid;

alter table "public"."import_rows" validate constraint "import_rows_status_check";

alter table "public"."inbound_webhook_endpoints" add constraint "inbound_webhook_endpoints_endpoint_key_key" UNIQUE using index "inbound_webhook_endpoints_endpoint_key_key";

alter table "public"."inbound_webhook_endpoints" add constraint "inbound_webhook_endpoints_integration_id_fkey" FOREIGN KEY (integration_id) REFERENCES public.external_integrations(id) ON DELETE CASCADE not valid;

alter table "public"."inbound_webhook_endpoints" validate constraint "inbound_webhook_endpoints_integration_id_fkey";

alter table "public"."inbound_webhook_endpoints" add constraint "inbound_webhook_endpoints_name_key" UNIQUE using index "inbound_webhook_endpoints_name_key";

alter table "public"."inbound_webhook_endpoints" add constraint "inbound_webhook_endpoints_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'paused'::text, 'error'::text, 'archived'::text]))) not valid;

alter table "public"."inbound_webhook_endpoints" validate constraint "inbound_webhook_endpoints_status_check";

alter table "public"."inbound_webhook_events" add constraint "inbound_webhook_events_endpoint_id_fkey" FOREIGN KEY (endpoint_id) REFERENCES public.inbound_webhook_endpoints(id) ON DELETE SET NULL not valid;

alter table "public"."inbound_webhook_events" validate constraint "inbound_webhook_events_endpoint_id_fkey";

alter table "public"."inbound_webhook_events" add constraint "inbound_webhook_events_integration_id_fkey" FOREIGN KEY (integration_id) REFERENCES public.external_integrations(id) ON DELETE SET NULL not valid;

alter table "public"."inbound_webhook_events" validate constraint "inbound_webhook_events_integration_id_fkey";

alter table "public"."inbound_webhook_events" add constraint "inbound_webhook_events_processing_status_check" CHECK ((processing_status = ANY (ARRAY['pending'::text, 'processing'::text, 'processed'::text, 'failed'::text, 'ignored'::text]))) not valid;

alter table "public"."inbound_webhook_events" validate constraint "inbound_webhook_events_processing_status_check";

alter table "public"."inbound_webhook_events" add constraint "inbound_webhook_events_related_contact_id_fkey" FOREIGN KEY (related_contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."inbound_webhook_events" validate constraint "inbound_webhook_events_related_contact_id_fkey";

alter table "public"."inbound_webhook_events" add constraint "inbound_webhook_events_related_conversation_id_fkey" FOREIGN KEY (related_conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."inbound_webhook_events" validate constraint "inbound_webhook_events_related_conversation_id_fkey";

alter table "public"."inbound_webhook_events" add constraint "inbound_webhook_events_related_message_id_fkey" FOREIGN KEY (related_message_id) REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL not valid;

alter table "public"."inbound_webhook_events" validate constraint "inbound_webhook_events_related_message_id_fkey";

alter table "public"."inbound_webhook_events" add constraint "inbound_webhook_events_status_check" CHECK ((status = ANY (ARRAY['received'::text, 'ignored'::text, 'accepted'::text, 'rejected'::text, 'error'::text]))) not valid;

alter table "public"."inbound_webhook_events" validate constraint "inbound_webhook_events_status_check";

alter table "public"."integration_agents" add constraint "integration_agents_integration_source_id_fkey" FOREIGN KEY (integration_source_id) REFERENCES public.integration_sources(id) ON DELETE CASCADE not valid;

alter table "public"."integration_agents" validate constraint "integration_agents_integration_source_id_fkey";

alter table "public"."integration_agents" add constraint "integration_agents_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."integration_agents" validate constraint "integration_agents_organization_id_fkey";

alter table "public"."integration_agents" add constraint "integration_agents_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'inactive'::text, 'blocked'::text, 'error'::text]))) not valid;

alter table "public"."integration_agents" validate constraint "integration_agents_status_check";

alter table "public"."integration_agents" add constraint "integration_agents_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."integration_agents" validate constraint "integration_agents_tenant_id_fkey";

alter table "public"."integration_event_mappings" add constraint "integration_event_mappings_integration_id_fkey" FOREIGN KEY (integration_id) REFERENCES public.external_integrations(id) ON DELETE CASCADE not valid;

alter table "public"."integration_event_mappings" validate constraint "integration_event_mappings_integration_id_fkey";

alter table "public"."integration_event_mappings" add constraint "integration_event_mappings_provider_external_event_type_int_key" UNIQUE using index "integration_event_mappings_provider_external_event_type_int_key";

alter table "public"."integration_sources" add constraint "integration_sources_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."integration_sources" validate constraint "integration_sources_organization_id_fkey";

alter table "public"."integration_sources" add constraint "integration_sources_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'paused'::text, 'error'::text]))) not valid;

alter table "public"."integration_sources" validate constraint "integration_sources_status_check";

alter table "public"."integration_sources" add constraint "integration_sources_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."integration_sources" validate constraint "integration_sources_tenant_id_fkey";

alter table "public"."integration_sources" add constraint "integration_sources_type_check" CHECK ((source_type = ANY (ARRAY['firebird_cplus'::text, 'firebird'::text, 'sql_server'::text, 'mysql'::text, 'postgresql'::text, 'sqlite'::text, 'csv_excel'::text, 'api_external'::text, 'woocommerce'::text, 'manual'::text]))) not valid;

alter table "public"."integration_sources" validate constraint "integration_sources_type_check";

alter table "public"."integration_sync_logs" add constraint "integration_sync_logs_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES public.integration_agents(id) ON DELETE SET NULL not valid;

alter table "public"."integration_sync_logs" validate constraint "integration_sync_logs_agent_id_fkey";

alter table "public"."integration_sync_logs" add constraint "integration_sync_logs_integration_source_id_fkey" FOREIGN KEY (integration_source_id) REFERENCES public.integration_sources(id) ON DELETE CASCADE not valid;

alter table "public"."integration_sync_logs" validate constraint "integration_sync_logs_integration_source_id_fkey";

alter table "public"."integration_sync_logs" add constraint "integration_sync_logs_level_check" CHECK ((level = ANY (ARRAY['debug'::text, 'info'::text, 'warning'::text, 'error'::text, 'critical'::text]))) not valid;

alter table "public"."integration_sync_logs" validate constraint "integration_sync_logs_level_check";

alter table "public"."integration_sync_logs" add constraint "integration_sync_logs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."integration_sync_logs" validate constraint "integration_sync_logs_organization_id_fkey";

alter table "public"."integration_sync_logs" add constraint "integration_sync_logs_sync_run_id_fkey" FOREIGN KEY (sync_run_id) REFERENCES public.integration_sync_runs(id) ON DELETE CASCADE not valid;

alter table "public"."integration_sync_logs" validate constraint "integration_sync_logs_sync_run_id_fkey";

alter table "public"."integration_sync_logs" add constraint "integration_sync_logs_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."integration_sync_logs" validate constraint "integration_sync_logs_tenant_id_fkey";

alter table "public"."integration_sync_runs" add constraint "integration_sync_runs_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES public.integration_agents(id) ON DELETE SET NULL not valid;

alter table "public"."integration_sync_runs" validate constraint "integration_sync_runs_agent_id_fkey";

alter table "public"."integration_sync_runs" add constraint "integration_sync_runs_integration_source_id_fkey" FOREIGN KEY (integration_source_id) REFERENCES public.integration_sources(id) ON DELETE CASCADE not valid;

alter table "public"."integration_sync_runs" validate constraint "integration_sync_runs_integration_source_id_fkey";

alter table "public"."integration_sync_runs" add constraint "integration_sync_runs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."integration_sync_runs" validate constraint "integration_sync_runs_organization_id_fkey";

alter table "public"."integration_sync_runs" add constraint "integration_sync_runs_status_check" CHECK ((status = ANY (ARRAY['running'::text, 'success'::text, 'partial_success'::text, 'failed'::text]))) not valid;

alter table "public"."integration_sync_runs" validate constraint "integration_sync_runs_status_check";

alter table "public"."integration_sync_runs" add constraint "integration_sync_runs_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."integration_sync_runs" validate constraint "integration_sync_runs_tenant_id_fkey";

alter table "public"."integration_sync_runs" add constraint "integration_sync_runs_type_check" CHECK ((sync_type = ANY (ARRAY['catalog'::text, 'customers'::text, 'orders'::text, 'stock'::text, 'prices'::text, 'health'::text, 'logs'::text]))) not valid;

alter table "public"."integration_sync_runs" validate constraint "integration_sync_runs_type_check";

alter table "public"."internal_messaging_gateways" add constraint "internal_messaging_gateways_environment_check" CHECK ((environment = ANY (ARRAY['test'::text, 'production'::text]))) not valid;

alter table "public"."internal_messaging_gateways" validate constraint "internal_messaging_gateways_environment_check";

alter table "public"."internal_messaging_gateways" add constraint "internal_messaging_gateways_max_sessions_check" CHECK (((max_sessions >= 1) AND (max_sessions <= 9))) not valid;

alter table "public"."internal_messaging_gateways" validate constraint "internal_messaging_gateways_max_sessions_check";

alter table "public"."internal_messaging_gateways" add constraint "internal_messaging_gateways_metadata_no_secrets_check" CHECK ((NOT (metadata ?| ARRAY['api_key'::text, 'apikey'::text, 'secret'::text, 'token'::text, 'cookie'::text, 'access_token'::text, 'refresh_token'::text]))) not valid;

alter table "public"."internal_messaging_gateways" validate constraint "internal_messaging_gateways_metadata_no_secrets_check";

alter table "public"."internal_messaging_gateways" add constraint "internal_messaging_gateways_provider_check" CHECK ((provider = 'openwa'::text)) not valid;

alter table "public"."internal_messaging_gateways" validate constraint "internal_messaging_gateways_provider_check";

alter table "public"."internal_messaging_gateways" add constraint "internal_messaging_gateways_slug_check" CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)) not valid;

alter table "public"."internal_messaging_gateways" validate constraint "internal_messaging_gateways_slug_check";

alter table "public"."internal_messaging_gateways" add constraint "internal_messaging_gateways_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'error'::text, 'maintenance'::text]))) not valid;

alter table "public"."internal_messaging_gateways" validate constraint "internal_messaging_gateways_status_check";

alter table "public"."internal_messaging_gateways" add constraint "internal_messaging_gateways_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."internal_messaging_gateways" validate constraint "internal_messaging_gateways_tenant_id_fkey";

alter table "public"."job_queue_status" add constraint "job_queue_status_status_check" CHECK ((status = ANY (ARRAY['healthy'::text, 'degraded'::text, 'stuck'::text, 'down'::text, 'unknown'::text]))) not valid;

alter table "public"."job_queue_status" validate constraint "job_queue_status_status_check";

alter table "public"."job_queue_status" add constraint "job_queue_status_type_check" CHECK ((queue_type = ANY (ARRAY['automation'::text, 'webhook'::text, 'media'::text, 'ai'::text, 'import'::text, 'backup'::text, 'maintenance'::text, 'general'::text]))) not valid;

alter table "public"."job_queue_status" validate constraint "job_queue_status_type_check";

alter table "public"."knowledge_article_versions" add constraint "knowledge_article_versions_article_id_fkey" FOREIGN KEY (article_id) REFERENCES public.knowledge_articles(id) ON DELETE CASCADE not valid;

alter table "public"."knowledge_article_versions" validate constraint "knowledge_article_versions_article_id_fkey";

alter table "public"."knowledge_article_versions" add constraint "knowledge_article_versions_article_id_version_key" UNIQUE using index "knowledge_article_versions_article_id_version_key";

alter table "public"."knowledge_articles" add constraint "knowledge_articles_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.knowledge_categories(id) ON DELETE SET NULL not valid;

alter table "public"."knowledge_articles" validate constraint "knowledge_articles_category_id_fkey";

alter table "public"."knowledge_articles" add constraint "knowledge_articles_difficulty_check" CHECK ((difficulty = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text]))) not valid;

alter table "public"."knowledge_articles" validate constraint "knowledge_articles_difficulty_check";

alter table "public"."knowledge_articles" add constraint "knowledge_articles_slug_key" UNIQUE using index "knowledge_articles_slug_key";

alter table "public"."knowledge_articles" add constraint "knowledge_articles_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))) not valid;

alter table "public"."knowledge_articles" validate constraint "knowledge_articles_status_check";

alter table "public"."knowledge_articles" add constraint "knowledge_articles_type_check" CHECK ((article_type = ANY (ARRAY['article'::text, 'tutorial'::text, 'sop'::text, 'faq'::text, 'script'::text, 'playbook'::text, 'checklist'::text, 'policy'::text, 'training'::text, 'troubleshooting'::text, 'other'::text]))) not valid;

alter table "public"."knowledge_articles" validate constraint "knowledge_articles_type_check";

alter table "public"."knowledge_articles" add constraint "knowledge_articles_visibility_check" CHECK ((visibility = ANY (ARRAY['internal'::text, 'public'::text, 'restricted'::text]))) not valid;

alter table "public"."knowledge_articles" validate constraint "knowledge_articles_visibility_check";

alter table "public"."knowledge_categories" add constraint "knowledge_categories_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.knowledge_categories(id) ON DELETE SET NULL not valid;

alter table "public"."knowledge_categories" validate constraint "knowledge_categories_parent_id_fkey";

alter table "public"."knowledge_categories" add constraint "knowledge_categories_slug_key" UNIQUE using index "knowledge_categories_slug_key";

alter table "public"."knowledge_categories" add constraint "knowledge_categories_type_check" CHECK ((category_type = ANY (ARRAY['general'::text, 'tutorial'::text, 'sop'::text, 'faq'::text, 'sales'::text, 'support'::text, 'training'::text, 'technical'::text, 'policy'::text, 'whatsapp'::text, 'crm'::text, 'other'::text]))) not valid;

alter table "public"."knowledge_categories" validate constraint "knowledge_categories_type_check";

alter table "public"."knowledge_faqs" add constraint "knowledge_faqs_article_id_fkey" FOREIGN KEY (article_id) REFERENCES public.knowledge_articles(id) ON DELETE SET NULL not valid;

alter table "public"."knowledge_faqs" validate constraint "knowledge_faqs_article_id_fkey";

alter table "public"."knowledge_faqs" add constraint "knowledge_faqs_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.knowledge_categories(id) ON DELETE SET NULL not valid;

alter table "public"."knowledge_faqs" validate constraint "knowledge_faqs_category_id_fkey";

alter table "public"."knowledge_faqs" add constraint "knowledge_faqs_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))) not valid;

alter table "public"."knowledge_faqs" validate constraint "knowledge_faqs_status_check";

alter table "public"."knowledge_feedback" add constraint "knowledge_feedback_article_id_fkey" FOREIGN KEY (article_id) REFERENCES public.knowledge_articles(id) ON DELETE CASCADE not valid;

alter table "public"."knowledge_feedback" validate constraint "knowledge_feedback_article_id_fkey";

alter table "public"."knowledge_feedback" add constraint "knowledge_feedback_faq_id_fkey" FOREIGN KEY (faq_id) REFERENCES public.knowledge_faqs(id) ON DELETE CASCADE not valid;

alter table "public"."knowledge_feedback" validate constraint "knowledge_feedback_faq_id_fkey";

alter table "public"."knowledge_feedback" add constraint "knowledge_feedback_rating_check" CHECK (((rating IS NULL) OR ((rating >= 1) AND (rating <= 5)))) not valid;

alter table "public"."knowledge_feedback" validate constraint "knowledge_feedback_rating_check";

alter table "public"."knowledge_feedback" add constraint "knowledge_feedback_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."knowledge_feedback" validate constraint "knowledge_feedback_user_id_fkey";

alter table "public"."maintenance_runs" add constraint "maintenance_runs_maintenance_task_id_fkey" FOREIGN KEY (maintenance_task_id) REFERENCES public.maintenance_tasks(id) ON DELETE SET NULL not valid;

alter table "public"."maintenance_runs" validate constraint "maintenance_runs_maintenance_task_id_fkey";

alter table "public"."maintenance_runs" add constraint "maintenance_runs_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'skipped'::text]))) not valid;

alter table "public"."maintenance_runs" validate constraint "maintenance_runs_status_check";

alter table "public"."maintenance_tasks" add constraint "maintenance_tasks_frequency_check" CHECK ((frequency = ANY (ARRAY['hourly'::text, 'daily'::text, 'weekly'::text, 'monthly'::text, 'manual'::text]))) not valid;

alter table "public"."maintenance_tasks" validate constraint "maintenance_tasks_frequency_check";

alter table "public"."maintenance_tasks" add constraint "maintenance_tasks_name_key" UNIQUE using index "maintenance_tasks_name_key";

alter table "public"."maintenance_tasks" add constraint "maintenance_tasks_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."maintenance_tasks" validate constraint "maintenance_tasks_priority_check";

alter table "public"."maintenance_tasks" add constraint "maintenance_tasks_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'disabled'::text, 'archived'::text]))) not valid;

alter table "public"."maintenance_tasks" validate constraint "maintenance_tasks_status_check";

alter table "public"."maintenance_tasks" add constraint "maintenance_tasks_type_check" CHECK ((task_type = ANY (ARRAY['cleanup'::text, 'archive'::text, 'backup'::text, 'health_check'::text, 'sync'::text, 'reindex'::text, 'report'::text, 'security_scan'::text, 'token_rotation'::text, 'other'::text]))) not valid;

alter table "public"."maintenance_tasks" validate constraint "maintenance_tasks_type_check";

alter table "public"."media_access_logs" add constraint "media_access_logs_action_check" CHECK ((action = ANY (ARRAY['view'::text, 'download'::text, 'share'::text, 'delete'::text, 'restore'::text, 'other'::text]))) not valid;

alter table "public"."media_access_logs" validate constraint "media_access_logs_action_check";

alter table "public"."media_access_logs" add constraint "media_access_logs_media_file_id_fkey" FOREIGN KEY (media_file_id) REFERENCES public.whatsapp_media_files(id) ON DELETE CASCADE not valid;

alter table "public"."media_access_logs" validate constraint "media_access_logs_media_file_id_fkey";

alter table "public"."media_processing_jobs" add constraint "media_processing_jobs_media_file_id_fkey" FOREIGN KEY (media_file_id) REFERENCES public.whatsapp_media_files(id) ON DELETE CASCADE not valid;

alter table "public"."media_processing_jobs" validate constraint "media_processing_jobs_media_file_id_fkey";

alter table "public"."media_processing_jobs" add constraint "media_processing_jobs_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))) not valid;

alter table "public"."media_processing_jobs" validate constraint "media_processing_jobs_status_check";

alter table "public"."media_processing_jobs" add constraint "media_processing_jobs_type_check" CHECK ((job_type = ANY (ARRAY['download'::text, 'transcribe_audio'::text, 'ocr'::text, 'describe_image'::text, 'parse_document'::text, 'thumbnail'::text, 'other'::text]))) not valid;

alter table "public"."media_processing_jobs" validate constraint "media_processing_jobs_type_check";

alter table "public"."message_media" add constraint "message_media_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE SET NULL not valid;

alter table "public"."message_media" validate constraint "message_media_channel_id_fkey";

alter table "public"."message_media" add constraint "message_media_download_status_check" CHECK ((download_status = ANY (ARRAY['pending'::text, 'downloading'::text, 'stored'::text, 'failed'::text, 'skipped'::text]))) not valid;

alter table "public"."message_media" validate constraint "message_media_download_status_check";

alter table "public"."message_media" add constraint "message_media_message_id_fkey" FOREIGN KEY (message_id) REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE not valid;

alter table "public"."message_media" validate constraint "message_media_message_id_fkey";

alter table "public"."message_media" add constraint "message_media_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."message_media" validate constraint "message_media_organization_id_fkey";

alter table "public"."message_media" add constraint "message_media_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."message_media" validate constraint "message_media_tenant_id_fkey";

alter table "public"."message_media" add constraint "message_media_type_check" CHECK ((media_type = ANY (ARRAY['audio'::text, 'image'::text, 'video'::text, 'document'::text, 'sticker'::text, 'other'::text]))) not valid;

alter table "public"."message_media" validate constraint "message_media_type_check";

alter table "public"."message_outbox" add constraint "message_outbox_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE not valid;

alter table "public"."message_outbox" validate constraint "message_outbox_channel_id_fkey";

alter table "public"."message_outbox" add constraint "message_outbox_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."message_outbox" validate constraint "message_outbox_conversation_id_fkey";

alter table "public"."message_outbox" add constraint "message_outbox_message_id_fkey" FOREIGN KEY (message_id) REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL not valid;

alter table "public"."message_outbox" validate constraint "message_outbox_message_id_fkey";

alter table "public"."message_transcriptions" add constraint "message_transcriptions_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE SET NULL not valid;

alter table "public"."message_transcriptions" validate constraint "message_transcriptions_channel_id_fkey";

alter table "public"."message_transcriptions" add constraint "message_transcriptions_media_id_fkey" FOREIGN KEY (media_id) REFERENCES public.message_media(id) ON DELETE CASCADE not valid;

alter table "public"."message_transcriptions" validate constraint "message_transcriptions_media_id_fkey";

alter table "public"."message_transcriptions" add constraint "message_transcriptions_message_id_fkey" FOREIGN KEY (message_id) REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE not valid;

alter table "public"."message_transcriptions" validate constraint "message_transcriptions_message_id_fkey";

alter table "public"."message_transcriptions" add constraint "message_transcriptions_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."message_transcriptions" validate constraint "message_transcriptions_organization_id_fkey";

alter table "public"."message_transcriptions" add constraint "message_transcriptions_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."message_transcriptions" validate constraint "message_transcriptions_requested_by_fkey";

alter table "public"."message_transcriptions" add constraint "message_transcriptions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'done'::text, 'failed'::text, 'skipped'::text]))) not valid;

alter table "public"."message_transcriptions" validate constraint "message_transcriptions_status_check";

alter table "public"."message_transcriptions" add constraint "message_transcriptions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."message_transcriptions" validate constraint "message_transcriptions_tenant_id_fkey";

alter table "public"."messaging_policies" add constraint "messaging_policies_channel_check" CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'email'::text, 'sms'::text, 'manual'::text]))) not valid;

alter table "public"."messaging_policies" validate constraint "messaging_policies_channel_check";

alter table "public"."messaging_policies" add constraint "messaging_policies_name_key" UNIQUE using index "messaging_policies_name_key";

alter table "public"."messaging_policies" add constraint "messaging_policies_type_check" CHECK ((policy_type = ANY (ARRAY['daily_limit'::text, 'hourly_limit'::text, 'cooldown'::text, 'consent_required'::text, 'business_hours'::text, 'group_messaging'::text, 'campaign_safety'::text, 'template_required'::text, 'manual_review'::text]))) not valid;

alter table "public"."messaging_policies" validate constraint "messaging_policies_type_check";

alter table "public"."navigation_items" add constraint "navigation_items_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.navigation_items(id) ON DELETE CASCADE not valid;

alter table "public"."navigation_items" validate constraint "navigation_items_parent_id_fkey";

alter table "public"."notification_channels" add constraint "notification_channels_channel_key_key" UNIQUE using index "notification_channels_channel_key_key";

alter table "public"."notification_channels" add constraint "notification_channels_name_key" UNIQUE using index "notification_channels_name_key";

alter table "public"."notification_channels" add constraint "notification_channels_type_check" CHECK ((channel_type = ANY (ARRAY['in_app'::text, 'email'::text, 'whatsapp'::text, 'sms'::text, 'webhook'::text, 'push'::text, 'other'::text]))) not valid;

alter table "public"."notification_channels" validate constraint "notification_channels_type_check";

alter table "public"."notification_deliveries" add constraint "notification_deliveries_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.notification_channels(id) ON DELETE SET NULL not valid;

alter table "public"."notification_deliveries" validate constraint "notification_deliveries_channel_id_fkey";

alter table "public"."notification_deliveries" add constraint "notification_deliveries_notification_id_fkey" FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE not valid;

alter table "public"."notification_deliveries" validate constraint "notification_deliveries_notification_id_fkey";

alter table "public"."notification_deliveries" add constraint "notification_deliveries_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'cancelled'::text, 'skipped'::text, 'retrying'::text]))) not valid;

alter table "public"."notification_deliveries" validate constraint "notification_deliveries_status_check";

alter table "public"."notification_rules" add constraint "notification_rules_name_key" UNIQUE using index "notification_rules_name_key";

alter table "public"."notification_rules" add constraint "notification_rules_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."notification_rules" validate constraint "notification_rules_priority_check";

alter table "public"."notification_rules" add constraint "notification_rules_target_type_check" CHECK ((target_type = ANY (ARRAY['owner'::text, 'assigned_user'::text, 'role'::text, 'specific_user'::text, 'all_admins'::text, 'custom'::text]))) not valid;

alter table "public"."notification_rules" validate constraint "notification_rules_target_type_check";

alter table "public"."notification_rules" add constraint "notification_rules_template_key_fkey" FOREIGN KEY (template_key) REFERENCES public.notification_templates(template_key) ON DELETE SET NULL not valid;

alter table "public"."notification_rules" validate constraint "notification_rules_template_key_fkey";

alter table "public"."notification_templates" add constraint "notification_templates_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."notification_templates" validate constraint "notification_templates_priority_check";

alter table "public"."notification_templates" add constraint "notification_templates_template_key_key" UNIQUE using index "notification_templates_template_key_key";

alter table "public"."notifications" add constraint "notifications_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."notifications" validate constraint "notifications_organization_id_fkey";

alter table "public"."notifications" add constraint "notifications_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."notifications" validate constraint "notifications_priority_check";

alter table "public"."notifications" add constraint "notifications_recipient_user_id_fkey" FOREIGN KEY (recipient_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."notifications" validate constraint "notifications_recipient_user_id_fkey";

alter table "public"."notifications" add constraint "notifications_status_check" CHECK ((status = ANY (ARRAY['unread'::text, 'read'::text, 'archived'::text, 'dismissed'::text, 'scheduled'::text, 'failed'::text]))) not valid;

alter table "public"."notifications" validate constraint "notifications_status_check";

alter table "public"."notifications" add constraint "notifications_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.notification_templates(id) ON DELETE SET NULL not valid;

alter table "public"."notifications" validate constraint "notifications_template_id_fkey";

alter table "public"."notifications" add constraint "notifications_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_tenant_id_fkey";

alter table "public"."notifications" add constraint "notifications_type_check" CHECK ((notification_type = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'error'::text, 'task'::text, 'message'::text, 'finance'::text, 'campaign'::text, 'security'::text, 'system'::text, 'integration'::text, 'other'::text]))) not valid;

alter table "public"."notifications" validate constraint "notifications_type_check";

alter table "public"."onboarding_flows" add constraint "onboarding_flows_name_key" UNIQUE using index "onboarding_flows_name_key";

alter table "public"."onboarding_flows" add constraint "onboarding_flows_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'inactive'::text, 'archived'::text]))) not valid;

alter table "public"."onboarding_flows" validate constraint "onboarding_flows_status_check";

alter table "public"."onboarding_flows" add constraint "onboarding_flows_type_check" CHECK ((flow_type = ANY (ARRAY['tenant_setup'::text, 'whatsapp_setup'::text, 'crm_setup'::text, 'import_setup'::text, 'agent_setup'::text, 'white_label_setup'::text, 'other'::text]))) not valid;

alter table "public"."onboarding_flows" validate constraint "onboarding_flows_type_check";

alter table "public"."onboarding_steps" add constraint "onboarding_steps_flow_id_fkey" FOREIGN KEY (flow_id) REFERENCES public.onboarding_flows(id) ON DELETE CASCADE not valid;

alter table "public"."onboarding_steps" validate constraint "onboarding_steps_flow_id_fkey";

alter table "public"."onboarding_steps" add constraint "onboarding_steps_flow_id_step_key_key" UNIQUE using index "onboarding_steps_flow_id_step_key_key";

alter table "public"."onboarding_steps" add constraint "onboarding_steps_type_check" CHECK ((step_type = ANY (ARRAY['manual'::text, 'form'::text, 'link'::text, 'health_check'::text, 'integration_check'::text, 'data_check'::text, 'tutorial'::text, 'other'::text]))) not valid;

alter table "public"."onboarding_steps" validate constraint "onboarding_steps_type_check";

alter table "public"."onboarding_steps" add constraint "onboarding_steps_validation_type_check" CHECK ((validation_type = ANY (ARRAY['manual'::text, 'auto'::text, 'api_check'::text, 'database_check'::text, 'health_check'::text, 'none'::text]))) not valid;

alter table "public"."onboarding_steps" validate constraint "onboarding_steps_validation_type_check";

alter table "public"."operational_checklist_items" add constraint "operational_checklist_items_checklist_id_fkey" FOREIGN KEY (checklist_id) REFERENCES public.operational_checklists(id) ON DELETE CASCADE not valid;

alter table "public"."operational_checklist_items" validate constraint "operational_checklist_items_checklist_id_fkey";

alter table "public"."operational_checklist_runs" add constraint "operational_checklist_runs_checklist_id_fkey" FOREIGN KEY (checklist_id) REFERENCES public.operational_checklists(id) ON DELETE SET NULL not valid;

alter table "public"."operational_checklist_runs" validate constraint "operational_checklist_runs_checklist_id_fkey";

alter table "public"."operational_checklist_runs" add constraint "operational_checklist_runs_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))) not valid;

alter table "public"."operational_checklist_runs" validate constraint "operational_checklist_runs_status_check";

alter table "public"."operational_checklists" add constraint "operational_checklists_name_key" UNIQUE using index "operational_checklists_name_key";

alter table "public"."operational_checklists" add constraint "operational_checklists_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text]))) not valid;

alter table "public"."operational_checklists" validate constraint "operational_checklists_status_check";

alter table "public"."operational_checklists" add constraint "operational_checklists_type_check" CHECK ((checklist_type = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'deployment'::text, 'incident'::text, 'backup'::text, 'security'::text, 'other'::text]))) not valid;

alter table "public"."operational_checklists" validate constraint "operational_checklists_type_check";

alter table "public"."organization_pipeline_stages" add constraint "organization_pipeline_stages_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_pipeline_stages" validate constraint "organization_pipeline_stages_organization_id_fkey";

alter table "public"."organization_pipeline_stages" add constraint "organization_pipeline_stages_pipeline_id_fkey" FOREIGN KEY (pipeline_id) REFERENCES public.organization_pipelines(id) ON DELETE CASCADE not valid;

alter table "public"."organization_pipeline_stages" validate constraint "organization_pipeline_stages_pipeline_id_fkey";

alter table "public"."organization_pipeline_stages" add constraint "organization_pipeline_stages_pipeline_id_stage_order_key" UNIQUE using index "organization_pipeline_stages_pipeline_id_stage_order_key";

alter table "public"."organization_pipelines" add constraint "organization_pipelines_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_pipelines" validate constraint "organization_pipelines_organization_id_fkey";

alter table "public"."organization_pipelines" add constraint "organization_pipelines_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text]))) not valid;

alter table "public"."organization_pipelines" validate constraint "organization_pipelines_status_check";

alter table "public"."organization_products_services" add constraint "organization_products_services_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_products_services" validate constraint "organization_products_services_organization_id_fkey";

alter table "public"."organization_products_services" add constraint "organization_products_services_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text]))) not valid;

alter table "public"."organization_products_services" validate constraint "organization_products_services_status_check";

alter table "public"."organization_profiles" add constraint "organization_profiles_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_profiles" validate constraint "organization_profiles_organization_id_fkey";

alter table "public"."organization_profiles" add constraint "organization_profiles_organization_id_key" UNIQUE using index "organization_profiles_organization_id_key";

alter table "public"."organization_tags" add constraint "organization_tags_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_tags" validate constraint "organization_tags_organization_id_fkey";

alter table "public"."organization_tags" add constraint "organization_tags_organization_id_name_key" UNIQUE using index "organization_tags_organization_id_name_key";

alter table "public"."outbound_webhook_attempts" add constraint "outbound_webhook_attempts_delivery_id_fkey" FOREIGN KEY (delivery_id) REFERENCES public.outbound_webhook_deliveries(id) ON DELETE CASCADE not valid;

alter table "public"."outbound_webhook_attempts" validate constraint "outbound_webhook_attempts_delivery_id_fkey";

alter table "public"."outbound_webhook_attempts" add constraint "outbound_webhook_attempts_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'success'::text, 'failed'::text, 'timeout'::text, 'cancelled'::text]))) not valid;

alter table "public"."outbound_webhook_attempts" validate constraint "outbound_webhook_attempts_status_check";

alter table "public"."outbound_webhook_deliveries" add constraint "outbound_webhook_deliveries_integration_id_fkey" FOREIGN KEY (integration_id) REFERENCES public.external_integrations(id) ON DELETE SET NULL not valid;

alter table "public"."outbound_webhook_deliveries" validate constraint "outbound_webhook_deliveries_integration_id_fkey";

alter table "public"."outbound_webhook_deliveries" add constraint "outbound_webhook_deliveries_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'sending'::text, 'sent'::text, 'failed'::text, 'cancelled'::text, 'retrying'::text]))) not valid;

alter table "public"."outbound_webhook_deliveries" validate constraint "outbound_webhook_deliveries_status_check";

alter table "public"."outbound_webhook_deliveries" add constraint "outbound_webhook_deliveries_webhook_id_fkey" FOREIGN KEY (webhook_id) REFERENCES public.outbound_webhooks(id) ON DELETE CASCADE not valid;

alter table "public"."outbound_webhook_deliveries" validate constraint "outbound_webhook_deliveries_webhook_id_fkey";

alter table "public"."outbound_webhooks" add constraint "outbound_webhooks_auth_type_check" CHECK ((auth_type = ANY (ARRAY['none'::text, 'bearer'::text, 'basic'::text, 'api_key'::text, 'custom'::text]))) not valid;

alter table "public"."outbound_webhooks" validate constraint "outbound_webhooks_auth_type_check";

alter table "public"."outbound_webhooks" add constraint "outbound_webhooks_integration_id_fkey" FOREIGN KEY (integration_id) REFERENCES public.external_integrations(id) ON DELETE CASCADE not valid;

alter table "public"."outbound_webhooks" validate constraint "outbound_webhooks_integration_id_fkey";

alter table "public"."outbound_webhooks" add constraint "outbound_webhooks_name_key" UNIQUE using index "outbound_webhooks_name_key";

alter table "public"."outbound_webhooks" add constraint "outbound_webhooks_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'paused'::text, 'error'::text, 'archived'::text]))) not valid;

alter table "public"."outbound_webhooks" validate constraint "outbound_webhooks_status_check";

alter table "public"."payment_methods" add constraint "payment_methods_name_key" UNIQUE using index "payment_methods_name_key";

alter table "public"."payment_methods" add constraint "payment_methods_type_check" CHECK ((method_type = ANY (ARRAY['pix'::text, 'credit_card'::text, 'debit_card'::text, 'bank_slip'::text, 'cash'::text, 'bank_transfer'::text, 'gateway'::text, 'other'::text]))) not valid;

alter table "public"."payment_methods" validate constraint "payment_methods_type_check";

alter table "public"."qa_bugs" add constraint "qa_bugs_environment_check" CHECK ((environment = ANY (ARRAY['local'::text, 'preview'::text, 'staging'::text, 'production'::text, 'railway'::text, 'vercel'::text, 'supabase'::text, 'other'::text]))) not valid;

alter table "public"."qa_bugs" validate constraint "qa_bugs_environment_check";

alter table "public"."qa_bugs" add constraint "qa_bugs_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."qa_bugs" validate constraint "qa_bugs_priority_check";

alter table "public"."qa_bugs" add constraint "qa_bugs_related_test_case_id_fkey" FOREIGN KEY (related_test_case_id) REFERENCES public.qa_test_cases(id) ON DELETE SET NULL not valid;

alter table "public"."qa_bugs" validate constraint "qa_bugs_related_test_case_id_fkey";

alter table "public"."qa_bugs" add constraint "qa_bugs_related_test_run_id_fkey" FOREIGN KEY (related_test_run_id) REFERENCES public.qa_test_runs(id) ON DELETE SET NULL not valid;

alter table "public"."qa_bugs" validate constraint "qa_bugs_related_test_run_id_fkey";

alter table "public"."qa_bugs" add constraint "qa_bugs_severity_check" CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))) not valid;

alter table "public"."qa_bugs" validate constraint "qa_bugs_severity_check";

alter table "public"."qa_bugs" add constraint "qa_bugs_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'triage'::text, 'in_progress'::text, 'fixed'::text, 'verified'::text, 'closed'::text, 'wont_fix'::text, 'duplicate'::text]))) not valid;

alter table "public"."qa_bugs" validate constraint "qa_bugs_status_check";

alter table "public"."qa_test_cases" add constraint "qa_test_cases_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."qa_test_cases" validate constraint "qa_test_cases_priority_check";

alter table "public"."qa_test_cases" add constraint "qa_test_cases_status_check" CHECK ((status = ANY (ARRAY['not_run'::text, 'passed'::text, 'failed'::text, 'blocked'::text, 'skipped'::text]))) not valid;

alter table "public"."qa_test_cases" validate constraint "qa_test_cases_status_check";

alter table "public"."qa_test_cases" add constraint "qa_test_cases_test_plan_id_fkey" FOREIGN KEY (test_plan_id) REFERENCES public.qa_test_plans(id) ON DELETE CASCADE not valid;

alter table "public"."qa_test_cases" validate constraint "qa_test_cases_test_plan_id_fkey";

alter table "public"."qa_test_plans" add constraint "qa_test_plans_name_key" UNIQUE using index "qa_test_plans_name_key";

alter table "public"."qa_test_plans" add constraint "qa_test_plans_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."qa_test_plans" validate constraint "qa_test_plans_priority_check";

alter table "public"."qa_test_plans" add constraint "qa_test_plans_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'ready'::text, 'running'::text, 'passed'::text, 'failed'::text, 'blocked'::text, 'cancelled'::text]))) not valid;

alter table "public"."qa_test_plans" validate constraint "qa_test_plans_status_check";

alter table "public"."qa_test_plans" add constraint "qa_test_plans_type_check" CHECK ((test_type = ANY (ARRAY['manual'::text, 'integration'::text, 'regression'::text, 'smoke'::text, 'security'::text, 'performance'::text, 'acceptance'::text, 'other'::text]))) not valid;

alter table "public"."qa_test_plans" validate constraint "qa_test_plans_type_check";

alter table "public"."qa_test_results" add constraint "qa_test_results_status_check" CHECK ((status = ANY (ARRAY['passed'::text, 'failed'::text, 'blocked'::text, 'skipped'::text]))) not valid;

alter table "public"."qa_test_results" validate constraint "qa_test_results_status_check";

alter table "public"."qa_test_results" add constraint "qa_test_results_test_case_id_fkey" FOREIGN KEY (test_case_id) REFERENCES public.qa_test_cases(id) ON DELETE SET NULL not valid;

alter table "public"."qa_test_results" validate constraint "qa_test_results_test_case_id_fkey";

alter table "public"."qa_test_results" add constraint "qa_test_results_test_run_id_fkey" FOREIGN KEY (test_run_id) REFERENCES public.qa_test_runs(id) ON DELETE CASCADE not valid;

alter table "public"."qa_test_results" validate constraint "qa_test_results_test_run_id_fkey";

alter table "public"."qa_test_runs" add constraint "qa_test_runs_environment_check" CHECK ((environment = ANY (ARRAY['local'::text, 'preview'::text, 'staging'::text, 'production'::text, 'railway'::text, 'vercel'::text, 'supabase'::text, 'other'::text]))) not valid;

alter table "public"."qa_test_runs" validate constraint "qa_test_runs_environment_check";

alter table "public"."qa_test_runs" add constraint "qa_test_runs_status_check" CHECK ((status = ANY (ARRAY['running'::text, 'passed'::text, 'failed'::text, 'blocked'::text, 'cancelled'::text]))) not valid;

alter table "public"."qa_test_runs" validate constraint "qa_test_runs_status_check";

alter table "public"."qa_test_runs" add constraint "qa_test_runs_test_plan_id_fkey" FOREIGN KEY (test_plan_id) REFERENCES public.qa_test_plans(id) ON DELETE SET NULL not valid;

alter table "public"."qa_test_runs" validate constraint "qa_test_runs_test_plan_id_fkey";

alter table "public"."quick_replies" add constraint "quick_replies_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."quick_replies" validate constraint "quick_replies_organization_id_fkey";

alter table "public"."quick_replies" add constraint "quick_replies_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."quick_replies" validate constraint "quick_replies_tenant_id_fkey";

alter table "public"."reminders" add constraint "reminders_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.calendar_events(id) ON DELETE CASCADE not valid;

alter table "public"."reminders" validate constraint "reminders_event_id_fkey";

alter table "public"."reminders" add constraint "reminders_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.finance_invoices(id) ON DELETE CASCADE not valid;

alter table "public"."reminders" validate constraint "reminders_invoice_id_fkey";

alter table "public"."reminders" add constraint "reminders_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."reminders" validate constraint "reminders_priority_check";

alter table "public"."reminders" add constraint "reminders_recipient_user_id_fkey" FOREIGN KEY (recipient_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."reminders" validate constraint "reminders_recipient_user_id_fkey";

alter table "public"."reminders" add constraint "reminders_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'cancelled'::text, 'skipped'::text]))) not valid;

alter table "public"."reminders" validate constraint "reminders_status_check";

alter table "public"."reminders" add constraint "reminders_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.crm_tasks(id) ON DELETE CASCADE not valid;

alter table "public"."reminders" validate constraint "reminders_task_id_fkey";

alter table "public"."reminders" add constraint "reminders_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."reminders" validate constraint "reminders_tenant_id_fkey";

alter table "public"."reminders" add constraint "reminders_type_check" CHECK ((reminder_type = ANY (ARRAY['in_app'::text, 'email'::text, 'whatsapp'::text, 'sms'::text, 'webhook'::text, 'other'::text]))) not valid;

alter table "public"."reminders" validate constraint "reminders_type_check";

alter table "public"."saved_searches" add constraint "saved_searches_app_user_id_fkey" FOREIGN KEY (app_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."saved_searches" validate constraint "saved_searches_app_user_id_fkey";

alter table "public"."saved_searches" add constraint "saved_searches_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."saved_searches" validate constraint "saved_searches_tenant_id_fkey";

alter table "public"."search_queries" add constraint "search_queries_app_user_id_fkey" FOREIGN KEY (app_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."search_queries" validate constraint "search_queries_app_user_id_fkey";

alter table "public"."search_queries" add constraint "search_queries_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."search_queries" validate constraint "search_queries_tenant_id_fkey";

alter table "public"."search_settings" add constraint "search_settings_setting_key_key" UNIQUE using index "search_settings_setting_key_key";

alter table "public"."security_events" add constraint "security_events_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.user_sessions(id) ON DELETE SET NULL not valid;

alter table "public"."security_events" validate constraint "security_events_session_id_fkey";

alter table "public"."security_events" add constraint "security_events_severity_check" CHECK ((severity = ANY (ARRAY['info'::text, 'low'::text, 'medium'::text, 'high'::text, 'critical'::text]))) not valid;

alter table "public"."security_events" validate constraint "security_events_severity_check";

alter table "public"."security_events" add constraint "security_events_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'reviewing'::text, 'resolved'::text, 'ignored'::text]))) not valid;

alter table "public"."security_events" validate constraint "security_events_status_check";

alter table "public"."security_events" add constraint "security_events_type_check" CHECK ((event_type = ANY (ARRAY['login'::text, 'logout'::text, 'failed_login'::text, 'permission_denied'::text, 'suspicious_activity'::text, 'token_used'::text, 'token_invalid'::text, 'webhook_signature_failed'::text, 'export_created'::text, 'bulk_action'::text, 'settings_changed'::text, 'data_deleted'::text, 'data_updated'::text, 'access_granted'::text, 'access_revoked'::text, 'other'::text]))) not valid;

alter table "public"."security_events" validate constraint "security_events_type_check";

alter table "public"."security_events" add constraint "security_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."security_events" validate constraint "security_events_user_id_fkey";

alter table "public"."security_rules" add constraint "security_rules_name_key" UNIQUE using index "security_rules_name_key";

alter table "public"."security_rules" add constraint "security_rules_severity_check" CHECK ((severity = ANY (ARRAY['info'::text, 'low'::text, 'medium'::text, 'high'::text, 'critical'::text]))) not valid;

alter table "public"."security_rules" validate constraint "security_rules_severity_check";

alter table "public"."security_rules" add constraint "security_rules_type_check" CHECK ((rule_type = ANY (ARRAY['rate_limit'::text, 'ip_block'::text, 'failed_login_limit'::text, 'export_limit'::text, 'webhook_signature'::text, 'token_expiration'::text, 'sensitive_action'::text, 'other'::text]))) not valid;

alter table "public"."security_rules" validate constraint "security_rules_type_check";

alter table "public"."setup_answers" add constraint "setup_answers_question_id_fkey" FOREIGN KEY (question_id) REFERENCES public.setup_questions(id) ON DELETE CASCADE not valid;

alter table "public"."setup_answers" validate constraint "setup_answers_question_id_fkey";

alter table "public"."setup_answers" add constraint "setup_answers_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.setup_assistant_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."setup_answers" validate constraint "setup_answers_session_id_fkey";

alter table "public"."setup_answers" add constraint "setup_answers_session_id_question_id_key" UNIQUE using index "setup_answers_session_id_question_id_key";

alter table "public"."setup_answers" add constraint "setup_answers_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."setup_answers" validate constraint "setup_answers_tenant_id_fkey";

alter table "public"."setup_assistant_sessions" add constraint "setup_assistant_sessions_app_user_id_fkey" FOREIGN KEY (app_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."setup_assistant_sessions" validate constraint "setup_assistant_sessions_app_user_id_fkey";

alter table "public"."setup_assistant_sessions" add constraint "setup_assistant_sessions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'abandoned'::text, 'cancelled'::text]))) not valid;

alter table "public"."setup_assistant_sessions" validate constraint "setup_assistant_sessions_status_check";

alter table "public"."setup_assistant_sessions" add constraint "setup_assistant_sessions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."setup_assistant_sessions" validate constraint "setup_assistant_sessions_tenant_id_fkey";

alter table "public"."setup_assistant_sessions" add constraint "setup_assistant_sessions_type_check" CHECK ((session_type = ANY (ARRAY['initial_setup'::text, 'whatsapp_setup'::text, 'crm_setup'::text, 'import_setup'::text, 'troubleshooting'::text, 'other'::text]))) not valid;

alter table "public"."setup_assistant_sessions" validate constraint "setup_assistant_sessions_type_check";

alter table "public"."setup_questions" add constraint "setup_questions_answer_type_check" CHECK ((answer_type = ANY (ARRAY['text'::text, 'textarea'::text, 'number'::text, 'boolean'::text, 'select'::text, 'multiselect'::text, 'email'::text, 'phone'::text, 'url'::text, 'date'::text]))) not valid;

alter table "public"."setup_questions" validate constraint "setup_questions_answer_type_check";

alter table "public"."setup_questions" add constraint "setup_questions_question_key_key" UNIQUE using index "setup_questions_question_key_key";

alter table "public"."setup_validation_checks" add constraint "setup_validation_checks_check_key_key" UNIQUE using index "setup_validation_checks_check_key_key";

alter table "public"."setup_validation_checks" add constraint "setup_validation_checks_severity_check" CHECK ((severity = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'critical'::text]))) not valid;

alter table "public"."setup_validation_checks" validate constraint "setup_validation_checks_severity_check";

alter table "public"."setup_validation_checks" add constraint "setup_validation_checks_type_check" CHECK ((check_type = ANY (ARRAY['manual'::text, 'database_table_exists'::text, 'database_view_exists'::text, 'api_endpoint'::text, 'env_var'::text, 'integration_status'::text, 'health_check'::text, 'other'::text]))) not valid;

alter table "public"."setup_validation_checks" validate constraint "setup_validation_checks_type_check";

alter table "public"."setup_validation_results" add constraint "setup_validation_results_check_id_fkey" FOREIGN KEY (check_id) REFERENCES public.setup_validation_checks(id) ON DELETE CASCADE not valid;

alter table "public"."setup_validation_results" validate constraint "setup_validation_results_check_id_fkey";

alter table "public"."setup_validation_results" add constraint "setup_validation_results_status_check" CHECK ((status = ANY (ARRAY['not_checked'::text, 'passed'::text, 'failed'::text, 'warning'::text, 'skipped'::text]))) not valid;

alter table "public"."setup_validation_results" validate constraint "setup_validation_results_status_check";

alter table "public"."setup_validation_results" add constraint "setup_validation_results_tenant_id_check_id_key" UNIQUE using index "setup_validation_results_tenant_id_check_id_key";

alter table "public"."setup_validation_results" add constraint "setup_validation_results_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."setup_validation_results" validate constraint "setup_validation_results_tenant_id_fkey";

alter table "public"."social_accounts" add constraint "social_accounts_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE SET NULL not valid;

alter table "public"."social_accounts" validate constraint "social_accounts_channel_id_fkey";

alter table "public"."subscription_plans" add constraint "subscription_plans_billing_interval_check" CHECK ((billing_interval = ANY (ARRAY['none'::text, 'monthly'::text, 'annual'::text, 'custom'::text]))) not valid;

alter table "public"."subscription_plans" validate constraint "subscription_plans_billing_interval_check";

alter table "public"."subscription_plans" add constraint "subscription_plans_name_key" UNIQUE using index "subscription_plans_name_key";

alter table "public"."subscription_plans" add constraint "subscription_plans_slug_key" UNIQUE using index "subscription_plans_slug_key";

alter table "public"."subscription_plans" add constraint "subscription_plans_type_check" CHECK ((plan_type = ANY (ARRAY['free'::text, 'trial'::text, 'monthly'::text, 'annual'::text, 'lifetime'::text, 'custom'::text]))) not valid;

alter table "public"."subscription_plans" validate constraint "subscription_plans_type_check";

alter table "public"."support_queue_agents" add constraint "support_queue_agents_queue_id_fkey" FOREIGN KEY (queue_id) REFERENCES public.support_queues(id) ON DELETE CASCADE not valid;

alter table "public"."support_queue_agents" validate constraint "support_queue_agents_queue_id_fkey";

alter table "public"."support_queue_agents" add constraint "support_queue_agents_queue_id_user_id_key" UNIQUE using index "support_queue_agents_queue_id_user_id_key";

alter table "public"."support_queue_agents" add constraint "support_queue_agents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE not valid;

alter table "public"."support_queue_agents" validate constraint "support_queue_agents_user_id_fkey";

alter table "public"."support_queues" add constraint "support_queues_channel_check" CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'email'::text, 'phone'::text, 'manual'::text]))) not valid;

alter table "public"."support_queues" validate constraint "support_queues_channel_check";

alter table "public"."support_queues" add constraint "support_queues_name_key" UNIQUE using index "support_queues_name_key";

alter table "public"."support_scripts" add constraint "support_scripts_name_key" UNIQUE using index "support_scripts_name_key";

alter table "public"."support_scripts" add constraint "support_scripts_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'inactive'::text, 'archived'::text]))) not valid;

alter table "public"."support_scripts" validate constraint "support_scripts_status_check";

alter table "public"."support_scripts" add constraint "support_scripts_type_check" CHECK ((script_type = ANY (ARRAY['support'::text, 'sales'::text, 'follow_up'::text, 'billing'::text, 'onboarding'::text, 'group'::text, 'technical'::text, 'other'::text]))) not valid;

alter table "public"."support_scripts" validate constraint "support_scripts_type_check";

alter table "public"."supported_locales" add constraint "supported_locales_direction_check" CHECK ((direction = ANY (ARRAY['ltr'::text, 'rtl'::text]))) not valid;

alter table "public"."supported_locales" validate constraint "supported_locales_direction_check";

alter table "public"."supported_locales" add constraint "supported_locales_locale_code_key" UNIQUE using index "supported_locales_locale_code_key";

alter table "public"."system_alerts" add constraint "system_alerts_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."system_alerts" validate constraint "system_alerts_assigned_to_fkey";

alter table "public"."system_alerts" add constraint "system_alerts_severity_check" CHECK ((severity = ANY (ARRAY['info'::text, 'low'::text, 'medium'::text, 'high'::text, 'critical'::text]))) not valid;

alter table "public"."system_alerts" validate constraint "system_alerts_severity_check";

alter table "public"."system_alerts" add constraint "system_alerts_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'acknowledged'::text, 'resolved'::text, 'ignored'::text]))) not valid;

alter table "public"."system_alerts" validate constraint "system_alerts_status_check";

alter table "public"."system_alerts" add constraint "system_alerts_type_check" CHECK ((alert_type = ANY (ARRAY['system'::text, 'security'::text, 'integration'::text, 'gateway'::text, 'database'::text, 'billing'::text, 'automation'::text, 'campaign'::text, 'ai'::text, 'other'::text]))) not valid;

alter table "public"."system_alerts" validate constraint "system_alerts_type_check";

alter table "public"."system_health_checks" add constraint "system_health_checks_severity_check" CHECK ((severity = ANY (ARRAY['info'::text, 'low'::text, 'medium'::text, 'high'::text, 'critical'::text]))) not valid;

alter table "public"."system_health_checks" validate constraint "system_health_checks_severity_check";

alter table "public"."system_health_checks" add constraint "system_health_checks_status_check" CHECK ((status = ANY (ARRAY['healthy'::text, 'degraded'::text, 'down'::text, 'unknown'::text, 'error'::text]))) not valid;

alter table "public"."system_health_checks" validate constraint "system_health_checks_status_check";

alter table "public"."system_health_checks" add constraint "system_health_checks_type_check" CHECK ((check_type = ANY (ARRAY['database'::text, 'api'::text, 'webhook'::text, 'gateway'::text, 'storage'::text, 'queue'::text, 'worker'::text, 'external_service'::text, 'security'::text, 'other'::text]))) not valid;

alter table "public"."system_health_checks" validate constraint "system_health_checks_type_check";

alter table "public"."system_messages" add constraint "system_messages_message_key_key" UNIQUE using index "system_messages_message_key_key";

alter table "public"."system_messages" add constraint "system_messages_type_check" CHECK ((message_type = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'error'::text, 'maintenance'::text, 'announcement'::text]))) not valid;

alter table "public"."system_messages" validate constraint "system_messages_type_check";

alter table "public"."tenant_domains" add constraint "tenant_domains_domain_key" UNIQUE using index "tenant_domains_domain_key";

alter table "public"."tenant_domains" add constraint "tenant_domains_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."tenant_domains" validate constraint "tenant_domains_organization_id_fkey";

alter table "public"."tenant_domains" add constraint "tenant_domains_ssl_status_check" CHECK ((ssl_status = ANY (ARRAY['pending'::text, 'issued'::text, 'failed'::text, 'disabled'::text]))) not valid;

alter table "public"."tenant_domains" validate constraint "tenant_domains_ssl_status_check";

alter table "public"."tenant_domains" add constraint "tenant_domains_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'active'::text, 'failed'::text, 'disabled'::text]))) not valid;

alter table "public"."tenant_domains" validate constraint "tenant_domains_status_check";

alter table "public"."tenant_domains" add constraint "tenant_domains_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."tenant_domains" validate constraint "tenant_domains_tenant_id_fkey";

alter table "public"."tenant_domains" add constraint "tenant_domains_type_check" CHECK ((domain_type = ANY (ARRAY['system'::text, 'custom'::text, 'subdomain'::text]))) not valid;

alter table "public"."tenant_domains" validate constraint "tenant_domains_type_check";

alter table "public"."tenant_navigation_overrides" add constraint "tenant_navigation_overrides_navigation_item_id_fkey" FOREIGN KEY (navigation_item_id) REFERENCES public.navigation_items(id) ON DELETE CASCADE not valid;

alter table "public"."tenant_navigation_overrides" validate constraint "tenant_navigation_overrides_navigation_item_id_fkey";

alter table "public"."tenant_navigation_overrides" add constraint "tenant_navigation_overrides_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."tenant_navigation_overrides" validate constraint "tenant_navigation_overrides_tenant_id_fkey";

alter table "public"."tenant_navigation_overrides" add constraint "tenant_navigation_overrides_tenant_id_navigation_item_id_key" UNIQUE using index "tenant_navigation_overrides_tenant_id_navigation_item_id_key";

alter table "public"."tenant_onboarding_progress" add constraint "tenant_onboarding_progress_flow_id_fkey" FOREIGN KEY (flow_id) REFERENCES public.onboarding_flows(id) ON DELETE CASCADE not valid;

alter table "public"."tenant_onboarding_progress" validate constraint "tenant_onboarding_progress_flow_id_fkey";

alter table "public"."tenant_onboarding_progress" add constraint "tenant_onboarding_progress_last_step_id_fkey" FOREIGN KEY (last_step_id) REFERENCES public.onboarding_steps(id) ON DELETE SET NULL not valid;

alter table "public"."tenant_onboarding_progress" validate constraint "tenant_onboarding_progress_last_step_id_fkey";

alter table "public"."tenant_onboarding_progress" add constraint "tenant_onboarding_progress_status_check" CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text, 'skipped'::text, 'blocked'::text]))) not valid;

alter table "public"."tenant_onboarding_progress" validate constraint "tenant_onboarding_progress_status_check";

alter table "public"."tenant_onboarding_progress" add constraint "tenant_onboarding_progress_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."tenant_onboarding_progress" validate constraint "tenant_onboarding_progress_tenant_id_fkey";

alter table "public"."tenant_onboarding_progress" add constraint "tenant_onboarding_progress_tenant_id_flow_id_key" UNIQUE using index "tenant_onboarding_progress_tenant_id_flow_id_key";

alter table "public"."tenant_onboarding_step_status" add constraint "tenant_onboarding_step_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'skipped'::text, 'blocked'::text, 'failed'::text]))) not valid;

alter table "public"."tenant_onboarding_step_status" validate constraint "tenant_onboarding_step_status_check";

alter table "public"."tenant_onboarding_step_status" add constraint "tenant_onboarding_step_status_flow_id_fkey" FOREIGN KEY (flow_id) REFERENCES public.onboarding_flows(id) ON DELETE CASCADE not valid;

alter table "public"."tenant_onboarding_step_status" validate constraint "tenant_onboarding_step_status_flow_id_fkey";

alter table "public"."tenant_onboarding_step_status" add constraint "tenant_onboarding_step_status_step_id_fkey" FOREIGN KEY (step_id) REFERENCES public.onboarding_steps(id) ON DELETE CASCADE not valid;

alter table "public"."tenant_onboarding_step_status" validate constraint "tenant_onboarding_step_status_step_id_fkey";

alter table "public"."tenant_onboarding_step_status" add constraint "tenant_onboarding_step_status_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."tenant_onboarding_step_status" validate constraint "tenant_onboarding_step_status_tenant_id_fkey";

alter table "public"."tenant_onboarding_step_status" add constraint "tenant_onboarding_step_status_tenant_id_step_id_key" UNIQUE using index "tenant_onboarding_step_status_tenant_id_step_id_key";

alter table "public"."tenant_onboarding_step_status" add constraint "tenant_onboarding_step_validation_status_check" CHECK ((validation_status = ANY (ARRAY['not_checked'::text, 'passed'::text, 'failed'::text, 'warning'::text, 'not_required'::text]))) not valid;

alter table "public"."tenant_onboarding_step_status" validate constraint "tenant_onboarding_step_validation_status_check";

alter table "public"."tenant_settings" add constraint "tenant_settings_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."tenant_settings" validate constraint "tenant_settings_tenant_id_fkey";

alter table "public"."tenant_settings" add constraint "tenant_settings_tenant_id_setting_key_key" UNIQUE using index "tenant_settings_tenant_id_setting_key_key";

alter table "public"."tenant_subscriptions" add constraint "tenant_subscriptions_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE SET NULL not valid;

alter table "public"."tenant_subscriptions" validate constraint "tenant_subscriptions_plan_id_fkey";

alter table "public"."tenant_subscriptions" add constraint "tenant_subscriptions_status_check" CHECK ((status = ANY (ARRAY['trial'::text, 'active'::text, 'past_due'::text, 'cancelled'::text, 'expired'::text, 'suspended'::text]))) not valid;

alter table "public"."tenant_subscriptions" validate constraint "tenant_subscriptions_status_check";

alter table "public"."tenant_subscriptions" add constraint "tenant_subscriptions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."tenant_subscriptions" validate constraint "tenant_subscriptions_tenant_id_fkey";

alter table "public"."tenant_ui_preferences" add constraint "tenant_ui_preferences_locale_code_fkey" FOREIGN KEY (locale_code) REFERENCES public.supported_locales(locale_code) ON DELETE SET NULL not valid;

alter table "public"."tenant_ui_preferences" validate constraint "tenant_ui_preferences_locale_code_fkey";

alter table "public"."tenant_ui_preferences" add constraint "tenant_ui_preferences_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."tenant_ui_preferences" validate constraint "tenant_ui_preferences_organization_id_fkey";

alter table "public"."tenant_ui_preferences" add constraint "tenant_ui_preferences_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."tenant_ui_preferences" validate constraint "tenant_ui_preferences_tenant_id_fkey";

alter table "public"."tenant_ui_preferences" add constraint "tenant_ui_preferences_tenant_id_key" UNIQUE using index "tenant_ui_preferences_tenant_id_key";

alter table "public"."tenant_ui_preferences" add constraint "tenant_ui_preferences_theme_id_fkey" FOREIGN KEY (theme_id) REFERENCES public.ui_themes(id) ON DELETE SET NULL not valid;

alter table "public"."tenant_ui_preferences" validate constraint "tenant_ui_preferences_theme_id_fkey";

alter table "public"."tenant_usage_metrics" add constraint "tenant_usage_metrics_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."tenant_usage_metrics" validate constraint "tenant_usage_metrics_tenant_id_fkey";

alter table "public"."tenant_usage_metrics" add constraint "tenant_usage_metrics_tenant_id_metric_month_key" UNIQUE using index "tenant_usage_metrics_tenant_id_metric_month_key";

alter table "public"."training_lessons" add constraint "training_lessons_article_id_fkey" FOREIGN KEY (article_id) REFERENCES public.knowledge_articles(id) ON DELETE SET NULL not valid;

alter table "public"."training_lessons" validate constraint "training_lessons_article_id_fkey";

alter table "public"."training_lessons" add constraint "training_lessons_program_id_fkey" FOREIGN KEY (program_id) REFERENCES public.training_programs(id) ON DELETE CASCADE not valid;

alter table "public"."training_lessons" validate constraint "training_lessons_program_id_fkey";

alter table "public"."training_lessons" add constraint "training_lessons_type_check" CHECK ((lesson_type = ANY (ARRAY['article'::text, 'video'::text, 'checklist'::text, 'quiz'::text, 'task'::text, 'external_link'::text, 'other'::text]))) not valid;

alter table "public"."training_lessons" validate constraint "training_lessons_type_check";

alter table "public"."training_programs" add constraint "training_programs_name_key" UNIQUE using index "training_programs_name_key";

alter table "public"."training_programs" add constraint "training_programs_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'inactive'::text, 'archived'::text]))) not valid;

alter table "public"."training_programs" validate constraint "training_programs_status_check";

alter table "public"."training_programs" add constraint "training_programs_type_check" CHECK ((program_type = ANY (ARRAY['internal'::text, 'onboarding'::text, 'support'::text, 'sales'::text, 'technical'::text, 'security'::text, 'compliance'::text, 'other'::text]))) not valid;

alter table "public"."training_programs" validate constraint "training_programs_type_check";

alter table "public"."training_progress" add constraint "training_progress_lesson_id_fkey" FOREIGN KEY (lesson_id) REFERENCES public.training_lessons(id) ON DELETE CASCADE not valid;

alter table "public"."training_progress" validate constraint "training_progress_lesson_id_fkey";

alter table "public"."training_progress" add constraint "training_progress_program_id_fkey" FOREIGN KEY (program_id) REFERENCES public.training_programs(id) ON DELETE CASCADE not valid;

alter table "public"."training_progress" validate constraint "training_progress_program_id_fkey";

alter table "public"."training_progress" add constraint "training_progress_program_id_lesson_id_user_id_key" UNIQUE using index "training_progress_program_id_lesson_id_user_id_key";

alter table "public"."training_progress" add constraint "training_progress_status_check" CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text, 'failed'::text, 'skipped'::text]))) not valid;

alter table "public"."training_progress" validate constraint "training_progress_status_check";

alter table "public"."training_progress" add constraint "training_progress_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE not valid;

alter table "public"."training_progress" validate constraint "training_progress_user_id_fkey";

alter table "public"."transcription_jobs" add constraint "transcription_jobs_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE SET NULL not valid;

alter table "public"."transcription_jobs" validate constraint "transcription_jobs_channel_id_fkey";

alter table "public"."transcription_jobs" add constraint "transcription_jobs_media_id_fkey" FOREIGN KEY (media_id) REFERENCES public.message_media(id) ON DELETE CASCADE not valid;

alter table "public"."transcription_jobs" validate constraint "transcription_jobs_media_id_fkey";

alter table "public"."transcription_jobs" add constraint "transcription_jobs_message_id_fkey" FOREIGN KEY (message_id) REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE not valid;

alter table "public"."transcription_jobs" validate constraint "transcription_jobs_message_id_fkey";

alter table "public"."transcription_jobs" add constraint "transcription_jobs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."transcription_jobs" validate constraint "transcription_jobs_organization_id_fkey";

alter table "public"."transcription_jobs" add constraint "transcription_jobs_status_check" CHECK ((status = ANY (ARRAY['queued'::text, 'processing'::text, 'done'::text, 'failed'::text, 'cancelled'::text]))) not valid;

alter table "public"."transcription_jobs" validate constraint "transcription_jobs_status_check";

alter table "public"."transcription_jobs" add constraint "transcription_jobs_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."transcription_jobs" validate constraint "transcription_jobs_tenant_id_fkey";

alter table "public"."transcription_jobs" add constraint "transcription_jobs_transcription_id_fkey" FOREIGN KEY (transcription_id) REFERENCES public.message_transcriptions(id) ON DELETE SET NULL not valid;

alter table "public"."transcription_jobs" validate constraint "transcription_jobs_transcription_id_fkey";

alter table "public"."translation_keys" add constraint "translation_keys_key_key" UNIQUE using index "translation_keys_key_key";

alter table "public"."translations" add constraint "translations_locale_code_fkey" FOREIGN KEY (locale_code) REFERENCES public.supported_locales(locale_code) ON DELETE CASCADE not valid;

alter table "public"."translations" validate constraint "translations_locale_code_fkey";

alter table "public"."translations" add constraint "translations_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))) not valid;

alter table "public"."translations" validate constraint "translations_status_check";

alter table "public"."translations" add constraint "translations_translation_key_id_fkey" FOREIGN KEY (translation_key_id) REFERENCES public.translation_keys(id) ON DELETE CASCADE not valid;

alter table "public"."translations" validate constraint "translations_translation_key_id_fkey";

alter table "public"."translations" add constraint "translations_translation_key_id_locale_code_key" UNIQUE using index "translations_translation_key_id_locale_code_key";

alter table "public"."ui_themes" add constraint "ui_themes_name_key" UNIQUE using index "ui_themes_name_key";

alter table "public"."ui_themes" add constraint "ui_themes_slug_key" UNIQUE using index "ui_themes_slug_key";

alter table "public"."ui_themes" add constraint "ui_themes_type_check" CHECK ((theme_type = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text, 'custom'::text]))) not valid;

alter table "public"."ui_themes" validate constraint "ui_themes_type_check";

alter table "public"."user_calendar_preferences" add constraint "user_calendar_preferences_default_calendar_id_fkey" FOREIGN KEY (default_calendar_id) REFERENCES public.calendars(id) ON DELETE SET NULL not valid;

alter table "public"."user_calendar_preferences" validate constraint "user_calendar_preferences_default_calendar_id_fkey";

alter table "public"."user_calendar_preferences" add constraint "user_calendar_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE not valid;

alter table "public"."user_calendar_preferences" validate constraint "user_calendar_preferences_user_id_fkey";

alter table "public"."user_calendar_preferences" add constraint "user_calendar_preferences_user_id_key" UNIQUE using index "user_calendar_preferences_user_id_key";

alter table "public"."user_notification_preferences" add constraint "user_notification_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE not valid;

alter table "public"."user_notification_preferences" validate constraint "user_notification_preferences_user_id_fkey";

alter table "public"."user_notification_preferences" add constraint "user_notification_preferences_user_id_module_notification_t_key" UNIQUE using index "user_notification_preferences_user_id_module_notification_t_key";

alter table "public"."user_sessions" add constraint "user_sessions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text, 'revoked'::text, 'ended'::text]))) not valid;

alter table "public"."user_sessions" validate constraint "user_sessions_status_check";

alter table "public"."user_sessions" add constraint "user_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE not valid;

alter table "public"."user_sessions" validate constraint "user_sessions_user_id_fkey";

alter table "public"."whatsapp_audio_transcriptions" add constraint "whatsapp_audio_transcriptions_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."whatsapp_audio_transcriptions" validate constraint "whatsapp_audio_transcriptions_contact_id_fkey";

alter table "public"."whatsapp_audio_transcriptions" add constraint "whatsapp_audio_transcriptions_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."whatsapp_audio_transcriptions" validate constraint "whatsapp_audio_transcriptions_conversation_id_fkey";

alter table "public"."whatsapp_audio_transcriptions" add constraint "whatsapp_audio_transcriptions_media_file_id_fkey" FOREIGN KEY (media_file_id) REFERENCES public.whatsapp_media_files(id) ON DELETE CASCADE not valid;

alter table "public"."whatsapp_audio_transcriptions" validate constraint "whatsapp_audio_transcriptions_media_file_id_fkey";

alter table "public"."whatsapp_audio_transcriptions" add constraint "whatsapp_audio_transcriptions_message_id_fkey" FOREIGN KEY (message_id) REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE not valid;

alter table "public"."whatsapp_audio_transcriptions" validate constraint "whatsapp_audio_transcriptions_message_id_fkey";

alter table "public"."whatsapp_audio_transcriptions" add constraint "whatsapp_audio_transcriptions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text]))) not valid;

alter table "public"."whatsapp_audio_transcriptions" validate constraint "whatsapp_audio_transcriptions_status_check";

alter table "public"."whatsapp_groups" add constraint "whatsapp_groups_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."whatsapp_groups" validate constraint "whatsapp_groups_organization_id_fkey";

alter table "public"."whatsapp_groups" add constraint "whatsapp_groups_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."whatsapp_groups" validate constraint "whatsapp_groups_tenant_id_fkey";

alter table "public"."whatsapp_media_files" add constraint "whatsapp_media_files_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."whatsapp_media_files" validate constraint "whatsapp_media_files_contact_id_fkey";

alter table "public"."whatsapp_media_files" add constraint "whatsapp_media_files_direction_check" CHECK ((direction = ANY (ARRAY['inbound'::text, 'outbound'::text]))) not valid;

alter table "public"."whatsapp_media_files" validate constraint "whatsapp_media_files_direction_check";

alter table "public"."whatsapp_media_files" add constraint "whatsapp_media_files_download_status_check" CHECK ((download_status = ANY (ARRAY['pending'::text, 'downloaded'::text, 'failed'::text, 'skipped'::text]))) not valid;

alter table "public"."whatsapp_media_files" validate constraint "whatsapp_media_files_download_status_check";

alter table "public"."whatsapp_media_files" add constraint "whatsapp_media_files_media_type_check" CHECK ((media_type = ANY (ARRAY['image'::text, 'audio'::text, 'video'::text, 'document'::text, 'sticker'::text, 'location'::text, 'contact'::text, 'unknown'::text]))) not valid;

alter table "public"."whatsapp_media_files" validate constraint "whatsapp_media_files_media_type_check";

alter table "public"."whatsapp_media_files" add constraint "whatsapp_media_files_processing_status_check" CHECK ((processing_status = ANY (ARRAY['pending'::text, 'processing'::text, 'processed'::text, 'failed'::text, 'skipped'::text]))) not valid;

alter table "public"."whatsapp_media_files" validate constraint "whatsapp_media_files_processing_status_check";

alter table "public"."whatsapp_media_text_extractions" add constraint "whatsapp_media_text_extractions_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."whatsapp_media_text_extractions" validate constraint "whatsapp_media_text_extractions_contact_id_fkey";

alter table "public"."whatsapp_media_text_extractions" add constraint "whatsapp_media_text_extractions_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."whatsapp_media_text_extractions" validate constraint "whatsapp_media_text_extractions_conversation_id_fkey";

alter table "public"."whatsapp_media_text_extractions" add constraint "whatsapp_media_text_extractions_media_file_id_fkey" FOREIGN KEY (media_file_id) REFERENCES public.whatsapp_media_files(id) ON DELETE CASCADE not valid;

alter table "public"."whatsapp_media_text_extractions" validate constraint "whatsapp_media_text_extractions_media_file_id_fkey";

alter table "public"."whatsapp_media_text_extractions" add constraint "whatsapp_media_text_extractions_message_id_fkey" FOREIGN KEY (message_id) REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE not valid;

alter table "public"."whatsapp_media_text_extractions" validate constraint "whatsapp_media_text_extractions_message_id_fkey";

alter table "public"."whatsapp_media_text_extractions" add constraint "whatsapp_media_text_extractions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text]))) not valid;

alter table "public"."whatsapp_media_text_extractions" validate constraint "whatsapp_media_text_extractions_status_check";

alter table "public"."whatsapp_media_text_extractions" add constraint "whatsapp_media_text_extractions_type_check" CHECK ((extraction_type = ANY (ARRAY['ocr'::text, 'document_parse'::text, 'image_description'::text, 'other'::text]))) not valid;

alter table "public"."whatsapp_media_text_extractions" validate constraint "whatsapp_media_text_extractions_type_check";

alter table "public"."whatsapp_messages" add constraint "shamar_message_media_status_check" CHECK (((media_status IS NULL) OR (media_status = ANY (ARRAY['none'::text, 'pending_download'::text, 'downloading'::text, 'stored'::text, 'download_failed'::text, 'skipped'::text])))) not valid;

alter table "public"."whatsapp_messages" validate constraint "shamar_message_media_status_check";

alter table "public"."whatsapp_messages" add constraint "shamar_message_transcription_status_check" CHECK (((transcription_status IS NULL) OR (transcription_status = ANY (ARRAY['none'::text, 'pending'::text, 'processing'::text, 'done'::text, 'failed'::text, 'skipped'::text])))) not valid;

alter table "public"."whatsapp_messages" validate constraint "shamar_message_transcription_status_check";

alter table "public"."whatsapp_messages" add constraint "whatsapp_messages_outbox_id_fkey" FOREIGN KEY (outbox_id) REFERENCES public.message_outbox(id) ON DELETE SET NULL not valid;

alter table "public"."whatsapp_messages" validate constraint "whatsapp_messages_outbox_id_fkey";

alter table "public"."whatsapp_shared_contacts" add constraint "whatsapp_shared_contacts_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."whatsapp_shared_contacts" validate constraint "whatsapp_shared_contacts_contact_id_fkey";

alter table "public"."whatsapp_shared_contacts" add constraint "whatsapp_shared_contacts_imported_contact_id_fkey" FOREIGN KEY (imported_contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."whatsapp_shared_contacts" validate constraint "whatsapp_shared_contacts_imported_contact_id_fkey";

alter table "public"."whatsapp_shared_locations" add constraint "whatsapp_shared_locations_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL not valid;

alter table "public"."whatsapp_shared_locations" validate constraint "whatsapp_shared_locations_contact_id_fkey";

alter table "public"."white_label_brands" add constraint "white_label_brands_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."white_label_brands" validate constraint "white_label_brands_organization_id_fkey";

alter table "public"."white_label_brands" add constraint "white_label_brands_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'draft'::text, 'archived'::text]))) not valid;

alter table "public"."white_label_brands" validate constraint "white_label_brands_status_check";

alter table "public"."white_label_brands" add constraint "white_label_brands_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."white_label_brands" validate constraint "white_label_brands_tenant_id_fkey";

alter table "public"."app_users" add constraint "app_users_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'agent'::text, 'viewer'::text]))) not valid;

alter table "public"."app_users" validate constraint "app_users_role_check";

alter table "public"."app_users" add constraint "app_users_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'away'::text, 'busy'::text]))) not valid;

alter table "public"."app_users" validate constraint "app_users_status_check";

alter table "public"."billing_checkout_sessions" add constraint "billing_checkout_sessions_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."billing_checkout_sessions" validate constraint "billing_checkout_sessions_organization_id_fkey";

alter table "public"."billing_checkout_sessions" add constraint "billing_checkout_sessions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) not valid;

alter table "public"."billing_checkout_sessions" validate constraint "billing_checkout_sessions_tenant_id_fkey";

alter table "public"."billing_subscriptions" add constraint "billing_subscriptions_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."billing_subscriptions" validate constraint "billing_subscriptions_organization_id_fkey";

alter table "public"."billing_subscriptions" add constraint "billing_subscriptions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) not valid;

alter table "public"."billing_subscriptions" validate constraint "billing_subscriptions_tenant_id_fkey";

alter table "public"."finance_payments" add constraint "finance_payments_checkout_session_id_fkey" FOREIGN KEY (checkout_session_id) REFERENCES public.billing_checkout_sessions(id) not valid;

alter table "public"."finance_payments" validate constraint "finance_payments_checkout_session_id_fkey";

alter table "public"."organizations" add constraint "organizations_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'archived'::text]))) not valid;

alter table "public"."organizations" validate constraint "organizations_status_check";

alter table "public"."organizations" add constraint "organizations_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."organizations" validate constraint "organizations_tenant_id_fkey";

alter table "public"."tenant_users" add constraint "tenant_users_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'agent'::text, 'viewer'::text]))) not valid;

alter table "public"."tenant_users" validate constraint "tenant_users_role_check";

alter table "public"."tenant_users" add constraint "tenant_users_status_check" CHECK ((status = ANY (ARRAY['invited'::text, 'active'::text, 'inactive'::text, 'suspended'::text, 'removed'::text]))) not valid;

alter table "public"."tenant_users" validate constraint "tenant_users_status_check";

alter table "public"."tenants" add constraint "tenants_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'trial'::text, 'cancelled'::text]))) not valid;

alter table "public"."tenants" validate constraint "tenants_status_check";

alter table "public"."whatsapp_connections" add constraint "whatsapp_connections_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."whatsapp_connections" validate constraint "whatsapp_connections_organization_id_fkey";

alter table "public"."whatsapp_connections" add constraint "whatsapp_connections_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."whatsapp_connections" validate constraint "whatsapp_connections_tenant_id_fkey";

alter table "public"."whatsapp_media_files" add constraint "whatsapp_media_files_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."whatsapp_media_files" validate constraint "whatsapp_media_files_conversation_id_fkey";

alter table "public"."whatsapp_media_files" add constraint "whatsapp_media_files_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."whatsapp_media_files" validate constraint "whatsapp_media_files_organization_id_fkey";

alter table "public"."whatsapp_media_files" add constraint "whatsapp_media_files_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) not valid;

alter table "public"."whatsapp_media_files" validate constraint "whatsapp_media_files_tenant_id_fkey";

alter table "public"."whatsapp_shared_contacts" add constraint "whatsapp_shared_contacts_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."whatsapp_shared_contacts" validate constraint "whatsapp_shared_contacts_conversation_id_fkey";

alter table "public"."whatsapp_shared_contacts" add constraint "whatsapp_shared_contacts_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."whatsapp_shared_contacts" validate constraint "whatsapp_shared_contacts_organization_id_fkey";

alter table "public"."whatsapp_shared_contacts" add constraint "whatsapp_shared_contacts_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) not valid;

alter table "public"."whatsapp_shared_contacts" validate constraint "whatsapp_shared_contacts_tenant_id_fkey";

alter table "public"."whatsapp_shared_locations" add constraint "whatsapp_shared_locations_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL not valid;

alter table "public"."whatsapp_shared_locations" validate constraint "whatsapp_shared_locations_conversation_id_fkey";

alter table "public"."whatsapp_shared_locations" add constraint "whatsapp_shared_locations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."whatsapp_shared_locations" validate constraint "whatsapp_shared_locations_organization_id_fkey";

alter table "public"."whatsapp_shared_locations" add constraint "whatsapp_shared_locations_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) not valid;

alter table "public"."whatsapp_shared_locations" validate constraint "whatsapp_shared_locations_tenant_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.activate_paid_checkout_subscription(checkout_id uuid, provider_payment text DEFAULT NULL::text, provider_customer text DEFAULT NULL::text, event_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  c record;
  sub_id uuid;
  inv_id uuid;
  period_end timestamptz;
begin
  select * into c
  from public.billing_checkout_sessions
  where id = checkout_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'checkout_not_found');
  end if;

  if c.tenant_id is null or c.organization_id is null then
    update public.billing_checkout_sessions
    set status = 'paid_pending_activation',
        paid_at = coalesce(paid_at, now()),
        provider_payment_id = coalesce(provider_payment, provider_payment_id),
        provider_customer_id = coalesce(provider_customer, provider_customer_id),
        raw_payload = coalesce(raw_payload, '{}'::jsonb) || jsonb_build_object('pending_activation_event', event_payload),
        updated_at = now()
    where id = checkout_id;

    return jsonb_build_object('ok', true, 'status', 'paid_pending_activation');
  end if;

  period_end := case
    when c.billing_cycle = 'annual' then now() + interval '1 year'
    else now() + interval '1 month'
  end;

  insert into public.billing_subscriptions (
    tenant_id,
    organization_id,
    checkout_session_id,
    plan_slug,
    billing_cycle,
    status,
    base_amount,
    setup_amount,
    extra_whatsapp_connections,
    extra_users,
    ai_addon_enabled,
    total_amount,
    currency,
    billing_provider,
    provider_customer_id,
    provider_payment_id,
    current_period_end,
    raw_payload,
    metadata,
    created_at,
    updated_at
  ) values (
    c.tenant_id,
    c.organization_id,
    c.id,
    c.plan_slug,
    c.billing_cycle,
    'active',
    c.base_amount,
    c.setup_amount,
    c.extra_whatsapp_connections,
    c.extra_users,
    c.ai_addon_enabled,
    c.total_amount,
    c.currency,
    'asaas',
    coalesce(provider_customer, c.provider_customer_id),
    coalesce(provider_payment, c.provider_payment_id),
    period_end,
    event_payload,
    c.metadata,
    now(),
    now()
  )
  on conflict (checkout_session_id) do update
    set status = 'active',
        provider_customer_id = coalesce(excluded.provider_customer_id, public.billing_subscriptions.provider_customer_id),
        provider_payment_id = coalesce(excluded.provider_payment_id, public.billing_subscriptions.provider_payment_id),
        raw_payload = excluded.raw_payload,
        updated_at = now()
  returning id into sub_id;

  insert into public.finance_invoices (
    invoice_number,
    title,
    description,
    status,
    subtotal,
    total,
    paid_total,
    balance_due,
    currency,
    issue_date,
    due_date,
    paid_at,
    payment_url,
    external_reference,
    organization_id,
    tenant_id,
    billing_provider,
    provider_invoice_id,
    provider_customer_id,
    checkout_session_id,
    created_at,
    updated_at
  ) values (
    'SHC-' || upper(left(c.id::text, 8)),
    'ShamarConnect ' || c.plan_slug,
    'Plano ' || c.plan_slug || ' com implantação assistida',
    'paid',
    c.total_amount,
    c.total_amount,
    c.total_amount,
    0,
    c.currency,
    current_date,
    current_date,
    now(),
    c.payment_url,
    'shamar_checkout_' || c.id::text,
    c.organization_id,
    c.tenant_id,
    'asaas',
    coalesce(provider_payment, c.provider_payment_id),
    coalesce(provider_customer, c.provider_customer_id),
    c.id,
    now(),
    now()
  )
  on conflict do nothing
  returning id into inv_id;

  insert into public.finance_payments (
    invoice_id,
    amount,
    currency,
    status,
    paid_at,
    confirmed_at,
    transaction_id,
    external_reference,
    gateway_name,
    receipt_url,
    raw_payload,
    organization_id,
    tenant_id,
    billing_provider,
    provider_payment_id,
    provider_customer_id,
    checkout_session_id,
    created_at,
    updated_at
  ) values (
    inv_id,
    c.total_amount,
    c.currency,
    'confirmed',
    now(),
    now(),
    coalesce(provider_payment, c.provider_payment_id),
    'shamar_checkout_' || c.id::text,
    'asaas',
    c.payment_url,
    event_payload,
    c.organization_id,
    c.tenant_id,
    'asaas',
    coalesce(provider_payment, c.provider_payment_id),
    coalesce(provider_customer, c.provider_customer_id),
    c.id,
    now(),
    now()
  )
  on conflict do nothing;

  update public.billing_checkout_sessions
  set status = 'paid',
      paid_at = coalesce(paid_at, now()),
      provider_payment_id = coalesce(provider_payment, provider_payment_id),
      provider_customer_id = coalesce(provider_customer, provider_customer_id),
      raw_payload = coalesce(raw_payload, '{}'::jsonb) || jsonb_build_object('activation_event', event_payload),
      updated_at = now()
  where id = c.id;

  update public.organizations
  set status = 'active', updated_at = now()
  where id = c.organization_id;

  update public.tenants
  set status = 'active', updated_at = now()
  where id = c.tenant_id;

  return jsonb_build_object('ok', true, 'status', 'active', 'subscription_id', sub_id, 'invoice_id', inv_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.agent_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

create or replace view "public"."ai_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.ai_conversation_summaries) AS total_summaries,
    ( SELECT count(*) AS count
           FROM public.ai_reply_suggestions) AS total_reply_suggestions,
    ( SELECT count(*) AS count
           FROM public.ai_reply_suggestions
          WHERE (ai_reply_suggestions.status = 'used'::text)) AS used_reply_suggestions,
    ( SELECT count(*) AS count
           FROM public.ai_lead_scores
          WHERE (ai_lead_scores.temperature = 'hot'::text)) AS hot_leads,
    ( SELECT count(*) AS count
           FROM public.ai_objections
          WHERE (ai_objections.status = 'open'::text)) AS open_objections,
    ( SELECT count(*) AS count
           FROM public.ai_runs
          WHERE (ai_runs.status = 'failed'::text)) AS failed_ai_runs,
    ( SELECT count(*) AS count
           FROM public.ai_runs
          WHERE (ai_runs.status = 'completed'::text)) AS completed_ai_runs;


create or replace view "public"."automation_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.automation_flows) AS total_flows,
    ( SELECT count(*) AS count
           FROM public.automation_flows
          WHERE (automation_flows.is_active = true)) AS active_flows,
    ( SELECT count(*) AS count
           FROM public.automation_flows
          WHERE (automation_flows.status = 'draft'::text)) AS draft_flows,
    ( SELECT count(*) AS count
           FROM public.automation_runs) AS total_runs,
    ( SELECT count(*) AS count
           FROM public.automation_runs
          WHERE (automation_runs.status = 'completed'::text)) AS completed_runs,
    ( SELECT count(*) AS count
           FROM public.automation_runs
          WHERE (automation_runs.status = 'failed'::text)) AS failed_runs,
    ( SELECT count(*) AS count
           FROM public.automation_action_logs
          WHERE (automation_action_logs.status = 'failed'::text)) AS failed_actions,
    ( SELECT count(*) AS count
           FROM public.automation_cooldowns
          WHERE (automation_cooldowns.expires_at > now())) AS active_cooldowns;


create or replace view "public"."automation_flows_summary" as  SELECT f.id,
    f.name,
    f.description,
    f.channel,
    f.trigger_type,
    f.status,
    f.priority,
    f.is_active,
    count(DISTINCT t.id) AS trigger_count,
    count(DISTINCT a.id) AS action_count,
    count(DISTINCT r.id) AS run_count,
    count(DISTINCT r.id) FILTER (WHERE (r.status = 'completed'::text)) AS completed_run_count,
    count(DISTINCT r.id) FILTER (WHERE (r.status = 'failed'::text)) AS failed_run_count
   FROM (((public.automation_flows f
     LEFT JOIN public.automation_triggers t ON ((t.flow_id = f.id)))
     LEFT JOIN public.automation_actions a ON ((a.flow_id = f.id)))
     LEFT JOIN public.automation_runs r ON ((r.flow_id = f.id)))
  GROUP BY f.id;


create or replace view "public"."calendar_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.calendars
          WHERE (calendars.is_active = true)) AS active_calendars,
    ( SELECT count(*) AS count
           FROM public.calendar_events) AS total_events,
    ( SELECT count(*) AS count
           FROM public.calendar_events
          WHERE (((calendar_events.starts_at)::date = CURRENT_DATE) AND (calendar_events.status = 'scheduled'::text))) AS events_today,
    ( SELECT count(*) AS count
           FROM public.calendar_events
          WHERE ((calendar_events.starts_at < now()) AND (calendar_events.status = 'scheduled'::text))) AS overdue_events,
    ( SELECT count(*) AS count
           FROM public.calendar_events
          WHERE (calendar_events.status = 'completed'::text)) AS completed_events,
    ( SELECT count(*) AS count
           FROM public.calendar_events
          WHERE (calendar_events.status = 'cancelled'::text)) AS cancelled_events,
    ( SELECT count(*) AS count
           FROM public.reminders
          WHERE (reminders.status = 'pending'::text)) AS pending_reminders,
    ( SELECT count(*) AS count
           FROM public.reminders
          WHERE ((reminders.scheduled_at <= now()) AND (reminders.status = 'pending'::text))) AS due_reminders,
    ( SELECT count(*) AS count
           FROM public.calendar_event_templates
          WHERE (calendar_event_templates.is_active = true)) AS active_event_templates;


create or replace view "public"."calendar_events_summary" as  SELECT e.id,
    e.title,
    e.description,
    e.event_type,
    e.status,
    e.priority,
    e.starts_at,
    e.ends_at,
    e.all_day,
    e.timezone,
    e.location,
    e.meeting_url,
    e.completed_at,
    e.cancelled_at,
    e.created_at,
    cal.name AS calendar_name,
    cal.color AS calendar_color,
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    u.name AS assigned_to_name,
    u.email AS assigned_to_email,
    c.name AS contact_name,
    c.phone AS contact_phone,
    wc.name AS conversation_name,
    wc.external_chat_id,
    d.title AS deal_title,
    task.title AS task_title,
    count(DISTINCT p.id) AS participant_count,
    count(DISTINCT r.id) AS reminder_count
   FROM (((((((((public.calendar_events e
     LEFT JOIN public.calendars cal ON ((cal.id = e.calendar_id)))
     LEFT JOIN public.tenants t ON ((t.id = e.tenant_id)))
     LEFT JOIN public.app_users u ON ((u.id = e.assigned_to)))
     LEFT JOIN public.crm_contacts c ON ((c.id = e.contact_id)))
     LEFT JOIN public.whatsapp_conversations wc ON ((wc.id = e.conversation_id)))
     LEFT JOIN public.crm_deals d ON ((d.id = e.deal_id)))
     LEFT JOIN public.crm_tasks task ON ((task.id = e.task_id)))
     LEFT JOIN public.calendar_event_participants p ON ((p.event_id = e.id)))
     LEFT JOIN public.reminders r ON ((r.event_id = e.id)))
  GROUP BY e.id, cal.name, cal.color, t.name, t.slug, u.name, u.email, c.name, c.phone, wc.name, wc.external_chat_id, d.title, task.title;


create or replace view "public"."catalog_items_with_category" as  SELECT i.id,
    i.name,
    i.slug,
    i.description,
    i.short_description,
    i.item_type,
    i.status,
    i.price,
    i.compare_at_price,
    i.currency,
    i.sku,
    i.unit,
    i.duration_minutes,
    i.image_url,
    i.external_url,
    i.tags,
    i.is_active,
    i.created_at,
    c.name AS category_name,
    c.slug AS category_slug,
    c.color AS category_color
   FROM (public.catalog_items i
     LEFT JOIN public.catalog_categories c ON ((c.id = i.category_id)));


CREATE OR REPLACE FUNCTION public.catalog_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

create or replace view "public"."commercial_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.catalog_items
          WHERE (catalog_items.is_active = true)) AS active_catalog_items,
    ( SELECT count(*) AS count
           FROM public.commercial_offers
          WHERE (commercial_offers.is_active = true)) AS active_offers,
    ( SELECT count(*) AS count
           FROM public.commercial_proposals) AS total_proposals,
    ( SELECT count(*) AS count
           FROM public.commercial_proposals
          WHERE (commercial_proposals.status = 'draft'::text)) AS draft_proposals,
    ( SELECT count(*) AS count
           FROM public.commercial_proposals
          WHERE (commercial_proposals.status = 'sent'::text)) AS sent_proposals,
    ( SELECT count(*) AS count
           FROM public.commercial_proposals
          WHERE (commercial_proposals.status = 'viewed'::text)) AS viewed_proposals,
    ( SELECT count(*) AS count
           FROM public.commercial_proposals
          WHERE (commercial_proposals.status = 'accepted'::text)) AS accepted_proposals,
    ( SELECT count(*) AS count
           FROM public.commercial_proposals
          WHERE (commercial_proposals.status = 'rejected'::text)) AS rejected_proposals,
    ( SELECT COALESCE(sum(commercial_proposals.total), (0)::numeric) AS "coalesce"
           FROM public.commercial_proposals
          WHERE (commercial_proposals.status = 'accepted'::text)) AS accepted_value,
    ( SELECT COALESCE(sum(commercial_proposals.total), (0)::numeric) AS "coalesce"
           FROM public.commercial_proposals
          WHERE (commercial_proposals.status = ANY (ARRAY['sent'::text, 'viewed'::text]))) AS open_proposal_value;


create or replace view "public"."commercial_proposals_summary" as  SELECT p.id,
    p.proposal_number,
    p.title,
    p.status,
    p.total,
    p.currency,
    p.validity_date,
    p.sent_at,
    p.viewed_at,
    p.accepted_at,
    p.rejected_at,
    p.created_at,
    c.name AS contact_name,
    c.phone AS contact_phone,
    c.email AS contact_email,
    wc.name AS conversation_name,
    wc.external_chat_id,
    d.title AS deal_title,
    count(pi.id) AS item_count
   FROM ((((public.commercial_proposals p
     LEFT JOIN public.crm_contacts c ON ((c.id = p.contact_id)))
     LEFT JOIN public.whatsapp_conversations wc ON ((wc.id = p.conversation_id)))
     LEFT JOIN public.crm_deals d ON ((d.id = p.deal_id)))
     LEFT JOIN public.commercial_proposal_items pi ON ((pi.proposal_id = p.id)))
  GROUP BY p.id, c.name, c.phone, c.email, wc.name, wc.external_chat_id, d.title;


CREATE OR REPLACE FUNCTION public.complete_onboarding_step(p_tenant_slug text, p_step_key text, p_completed_by text DEFAULT 'system'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  status_id uuid;
begin
  update public.tenant_onboarding_step_status ss
  set
    status = 'completed',
    validation_status = case when ss.validation_status = 'not_checked' then 'passed' else ss.validation_status end,
    completed_by = p_completed_by,
    completed_at = now(),
    updated_at = now()
  from public.tenants t, public.onboarding_steps s
  where ss.tenant_id = t.id
    and ss.step_id = s.id
    and t.slug = p_tenant_slug
    and s.step_key = p_step_key
  returning ss.id into status_id;

  update public.tenant_onboarding_progress p
  set
    completed_steps = sub.completed_steps,
    completed_required_steps = sub.completed_required_steps,
    progress_percent = case
      when sub.total_steps > 0 then round((sub.completed_steps::numeric / sub.total_steps::numeric) * 100, 2)
      else 0
    end,
    status = case
      when sub.required_steps > 0 and sub.completed_required_steps >= sub.required_steps then 'completed'
      else 'in_progress'
    end,
    completed_at = case
      when sub.required_steps > 0 and sub.completed_required_steps >= sub.required_steps then now()
      else p.completed_at
    end,
    updated_at = now()
  from (
    select
      ss.tenant_id,
      ss.flow_id,
      count(*) as total_steps,
      count(*) filter (where ss.status = 'completed') as completed_steps,
      count(*) filter (where s.is_required = true) as required_steps,
      count(*) filter (where s.is_required = true and ss.status = 'completed') as completed_required_steps
    from public.tenant_onboarding_step_status ss
    join public.onboarding_steps s on s.id = ss.step_id
    group by ss.tenant_id, ss.flow_id
  ) sub
  where p.tenant_id = sub.tenant_id
    and p.flow_id = sub.flow_id
    and p.tenant_id = (select id from public.tenants where slug = p_tenant_slug);

  return status_id;
end;
$function$
;

create or replace view "public"."conversation_assignment_summary" as  SELECT ca.id,
    ca.external_chat_id,
    ca.status,
    ca.priority,
    ca.assigned_at,
    ca.closed_at,
    ca.last_activity_at,
    ca.created_at,
    q.name AS queue_name,
    u.name AS assigned_to_name,
    u.email AS assigned_to_email,
    wc.name AS conversation_name,
    wc.is_group,
    wc.unread_count,
    wc.last_message_at
   FROM (((public.conversation_assignments ca
     LEFT JOIN public.support_queues q ON ((q.id = ca.queue_id)))
     LEFT JOIN public.app_users u ON ((u.id = ca.assigned_to)))
     LEFT JOIN public.whatsapp_conversations wc ON ((wc.id = ca.conversation_id)));


CREATE OR REPLACE FUNCTION public.create_calendar_event_quick(p_title text, p_starts_at timestamp with time zone, p_event_type text DEFAULT 'follow_up'::text, p_assigned_to uuid DEFAULT NULL::uuid, p_contact_id uuid DEFAULT NULL::uuid, p_conversation_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  event_id uuid;
  default_calendar uuid;
  tenant_uuid uuid;
begin
  select id into tenant_uuid
  from public.tenants
  where slug = 'shamar-connect'
  limit 1;

  select id into default_calendar
  from public.calendars
  where is_default = true
    and (tenant_id = tenant_uuid or tenant_id is null)
  limit 1;

  insert into public.calendar_events (
    calendar_id,
    tenant_id,
    title,
    description,
    event_type,
    starts_at,
    ends_at,
    assigned_to,
    contact_id,
    conversation_id
  )
  values (
    default_calendar,
    tenant_uuid,
    p_title,
    p_description,
    p_event_type,
    p_starts_at,
    p_starts_at + interval '30 minutes',
    p_assigned_to,
    p_contact_id,
    p_conversation_id
  )
  returning id into event_id;

  return event_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_import_job(p_name text, p_import_type text DEFAULT 'contacts'::text, p_source_type text DEFAULT 'manual_paste'::text, p_original_file_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  job_id uuid;
begin
  insert into public.import_jobs (
    name,
    import_type,
    source_type,
    original_file_name,
    status
  )
  values (
    p_name,
    p_import_type,
    p_source_type,
    p_original_file_name,
    'draft'
  )
  returning id into job_id;

  insert into public.import_logs (job_id, log_level, message)
  values (job_id, 'info', 'Job de importação criado.');

  return job_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_notification(p_title text, p_body text, p_module text DEFAULT 'general'::text, p_notification_type text DEFAULT 'info'::text, p_priority text DEFAULT 'normal'::text, p_recipient_user_id uuid DEFAULT NULL::uuid, p_tenant_id uuid DEFAULT NULL::uuid, p_action_url text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  notification_id uuid;
begin
  insert into public.notifications (
    tenant_id,
    recipient_user_id,
    title,
    body,
    module,
    notification_type,
    priority,
    action_url,
    metadata
  )
  values (
    p_tenant_id,
    p_recipient_user_id,
    p_title,
    p_body,
    p_module,
    p_notification_type,
    p_priority,
    p_action_url,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into notification_id;

  return notification_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_qa_bug(p_title text, p_description text DEFAULT NULL::text, p_module text DEFAULT 'general'::text, p_severity text DEFAULT 'medium'::text, p_environment text DEFAULT 'production'::text, p_error_message text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  bug_id uuid;
begin
  insert into public.qa_bugs (
    title,
    description,
    module,
    severity,
    environment,
    error_message,
    reported_by
  )
  values (
    p_title,
    p_description,
    p_module,
    p_severity,
    p_environment,
    p_error_message,
    'system'
  )
  returning id into bug_id;

  return bug_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_reminder(p_title text, p_scheduled_at timestamp with time zone, p_recipient_user_id uuid DEFAULT NULL::uuid, p_body text DEFAULT NULL::text, p_event_id uuid DEFAULT NULL::uuid, p_task_id uuid DEFAULT NULL::uuid, p_priority text DEFAULT 'normal'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  reminder_id uuid;
  tenant_uuid uuid;
begin
  select id into tenant_uuid
  from public.tenants
  where slug = 'shamar-connect'
  limit 1;

  insert into public.reminders (
    tenant_id,
    event_id,
    task_id,
    recipient_user_id,
    title,
    body,
    scheduled_at,
    priority
  )
  values (
    tenant_uuid,
    p_event_id,
    p_task_id,
    p_recipient_user_id,
    p_title,
    p_body,
    p_scheduled_at,
    p_priority
  )
  returning id into reminder_id;

  return reminder_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_system_alert(p_title text, p_description text DEFAULT NULL::text, p_alert_type text DEFAULT 'system'::text, p_severity text DEFAULT 'info'::text, p_module text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  alert_id uuid;
begin
  insert into public.system_alerts (
    title,
    description,
    alert_type,
    severity,
    module,
    metadata
  )
  values (
    p_title,
    p_description,
    p_alert_type,
    p_severity,
    p_module,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into alert_id;

  return alert_id;
end;
$function$
;

create or replace view "public"."crm_contacts_with_tags" as  SELECT c.id,
    c.name,
    c.phone,
    c.email,
    c.company,
    c.source,
    c.consent_status,
    c.created_at,
    c.updated_at,
    COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color)) FILTER (WHERE (t.id IS NOT NULL)), '[]'::jsonb) AS tags
   FROM ((public.crm_contacts c
     LEFT JOIN public.crm_contact_tags ct ON ((ct.contact_id = c.id)))
     LEFT JOIN public.crm_tags t ON ((t.id = ct.tag_id)))
  GROUP BY c.id;


create or replace view "public"."crm_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.crm_contacts) AS total_contacts,
    ( SELECT count(*) AS count
           FROM public.whatsapp_conversations) AS total_conversations,
    ( SELECT count(*) AS count
           FROM public.whatsapp_messages) AS total_messages,
    ( SELECT count(*) AS count
           FROM public.crm_deals
          WHERE (crm_deals.status = 'open'::text)) AS open_deals,
    ( SELECT count(*) AS count
           FROM public.crm_deals
          WHERE (crm_deals.status = 'won'::text)) AS won_deals,
    ( SELECT count(*) AS count
           FROM public.crm_deals
          WHERE (crm_deals.status = 'lost'::text)) AS lost_deals,
    ( SELECT count(*) AS count
           FROM public.crm_tasks
          WHERE (crm_tasks.status = 'pending'::text)) AS pending_tasks,
    ( SELECT count(*) AS count
           FROM public.crm_tasks
          WHERE (crm_tasks.status = 'completed'::text)) AS completed_tasks,
    ( SELECT count(*) AS count
           FROM public.group_contact_list_items
          WHERE (group_contact_list_items.review_status = 'pending'::text)) AS pending_imported_contacts,
    ( SELECT count(*) AS count
           FROM public.group_contact_list_items
          WHERE (group_contact_list_items.review_status = 'approved'::text)) AS approved_imported_contacts,
    ( SELECT count(*) AS count
           FROM public.group_contact_list_items
          WHERE (group_contact_list_items.review_status = 'rejected'::text)) AS rejected_imported_contacts;


create or replace view "public"."customization_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.supported_locales
          WHERE (supported_locales.is_active = true)) AS active_locales,
    ( SELECT count(*) AS count
           FROM public.translation_keys
          WHERE (translation_keys.is_active = true)) AS active_translation_keys,
    ( SELECT count(*) AS count
           FROM public.translations
          WHERE (translations.status = 'published'::text)) AS published_translations,
    ( SELECT count(*) AS count
           FROM public.ui_themes
          WHERE (ui_themes.is_active = true)) AS active_themes,
    ( SELECT count(*) AS count
           FROM public.tenant_ui_preferences) AS tenant_ui_preferences,
    ( SELECT count(*) AS count
           FROM public.navigation_items
          WHERE (navigation_items.is_active = true)) AS active_navigation_items,
    ( SELECT count(*) AS count
           FROM public.system_messages
          WHERE (system_messages.is_active = true)) AS active_system_messages;


create or replace view "public"."documents_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.document_templates
          WHERE (document_templates.is_active = true)) AS active_templates,
    ( SELECT count(*) AS count
           FROM public.documents) AS total_documents,
    ( SELECT count(*) AS count
           FROM public.documents
          WHERE (documents.status = 'draft'::text)) AS draft_documents,
    ( SELECT count(*) AS count
           FROM public.documents
          WHERE (documents.status = 'sent'::text)) AS sent_documents,
    ( SELECT count(*) AS count
           FROM public.documents
          WHERE (documents.status = 'viewed'::text)) AS viewed_documents,
    ( SELECT count(*) AS count
           FROM public.documents
          WHERE (documents.status = 'accepted'::text)) AS accepted_documents,
    ( SELECT count(*) AS count
           FROM public.documents
          WHERE (documents.status = 'rejected'::text)) AS rejected_documents,
    ( SELECT count(*) AS count
           FROM public.documents
          WHERE ((documents.expires_at < now()) AND (documents.status = ANY (ARRAY['sent'::text, 'viewed'::text])))) AS expired_pending_documents,
    ( SELECT count(*) AS count
           FROM public.document_acceptances) AS total_acceptances,
    ( SELECT count(*) AS count
           FROM public.document_files) AS total_document_files;


create or replace view "public"."documents_summary" as  SELECT d.id,
    d.document_number,
    d.title,
    d.document_type,
    d.status,
    d.public_url,
    d.pdf_url,
    d.expires_at,
    d.sent_at,
    d.viewed_at,
    d.accepted_at,
    d.rejected_at,
    d.created_at,
    c.name AS contact_name,
    c.phone AS contact_phone,
    c.email AS contact_email,
    wc.name AS conversation_name,
    wc.external_chat_id,
    deal.title AS deal_title,
    p.title AS proposal_title,
    i.invoice_number,
    count(DISTINCT a.id) AS acceptance_count,
    count(DISTINCT f.id) AS file_count,
    count(DISTINCT e.id) AS event_count
   FROM ((((((((public.documents d
     LEFT JOIN public.crm_contacts c ON ((c.id = d.contact_id)))
     LEFT JOIN public.whatsapp_conversations wc ON ((wc.id = d.conversation_id)))
     LEFT JOIN public.crm_deals deal ON ((deal.id = d.deal_id)))
     LEFT JOIN public.commercial_proposals p ON ((p.id = d.proposal_id)))
     LEFT JOIN public.finance_invoices i ON ((i.id = d.invoice_id)))
     LEFT JOIN public.document_acceptances a ON ((a.document_id = d.id)))
     LEFT JOIN public.document_files f ON ((f.document_id = d.id)))
     LEFT JOIN public.document_events e ON ((e.document_id = d.id)))
  GROUP BY d.id, c.name, c.phone, c.email, wc.name, wc.external_chat_id, deal.title, p.title, i.invoice_number;


create or replace view "public"."external_integrations_summary" as  SELECT i.id,
    i.name,
    i.description,
    i.provider,
    i.integration_type,
    i.status,
    i.base_url,
    i.auth_type,
    i.is_active,
    i.created_at,
    count(DISTINCT inbound.id) AS inbound_endpoint_count,
    count(DISTINCT outbound.id) AS outbound_webhook_count,
    count(DISTINCT events.id) AS inbound_event_count,
    count(DISTINCT deliveries.id) AS outbound_delivery_count,
    count(DISTINCT events.id) FILTER (WHERE (events.processing_status = 'failed'::text)) AS failed_inbound_events,
    count(DISTINCT deliveries.id) FILTER (WHERE (deliveries.status = 'failed'::text)) AS failed_outbound_deliveries
   FROM ((((public.external_integrations i
     LEFT JOIN public.inbound_webhook_endpoints inbound ON ((inbound.integration_id = i.id)))
     LEFT JOIN public.outbound_webhooks outbound ON ((outbound.integration_id = i.id)))
     LEFT JOIN public.inbound_webhook_events events ON ((events.integration_id = i.id)))
     LEFT JOIN public.outbound_webhook_deliveries deliveries ON ((deliveries.integration_id = i.id)))
  GROUP BY i.id;


create or replace view "public"."files_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.files
          WHERE (files.status = 'active'::text)) AS active_files,
    ( SELECT count(*) AS count
           FROM public.files
          WHERE (files.status = 'archived'::text)) AS archived_files,
    ( SELECT count(*) AS count
           FROM public.files
          WHERE (files.status = 'deleted'::text)) AS deleted_files,
    ( SELECT count(*) AS count
           FROM public.files
          WHERE ((files.file_type = 'image'::text) AND (files.status = 'active'::text))) AS image_files,
    ( SELECT count(*) AS count
           FROM public.files
          WHERE ((files.file_type = 'audio'::text) AND (files.status = 'active'::text))) AS audio_files,
    ( SELECT count(*) AS count
           FROM public.files
          WHERE ((files.file_type = 'video'::text) AND (files.status = 'active'::text))) AS video_files,
    ( SELECT count(*) AS count
           FROM public.files
          WHERE ((files.file_type = ANY (ARRAY['document'::text, 'pdf'::text, 'spreadsheet'::text, 'presentation'::text])) AND (files.status = 'active'::text))) AS document_files,
    ( SELECT COALESCE(sum(files.file_size_bytes), (0)::numeric) AS "coalesce"
           FROM public.files
          WHERE (files.status = 'active'::text)) AS total_storage_bytes,
    ( SELECT count(*) AS count
           FROM public.file_shares
          WHERE (file_shares.is_active = true)) AS active_shares,
    ( SELECT count(*) AS count
           FROM public.file_access_logs
          WHERE ((file_access_logs.created_at)::date = CURRENT_DATE)) AS access_logs_today;


create or replace view "public"."files_summary" as  SELECT f.id,
    f.file_name,
    f.original_file_name,
    f.title,
    f.description,
    f.file_type,
    f.mime_type,
    f.file_extension,
    f.file_size_bytes,
    f.storage_provider,
    f.storage_bucket,
    f.storage_path,
    f.public_url,
    f.visibility,
    f.status,
    f.created_at,
    folder.name AS folder_name,
    folder.path AS folder_path,
    c.name AS contact_name,
    c.phone AS contact_phone,
    wc.name AS conversation_name,
    wc.external_chat_id,
    d.title AS deal_title,
    p.title AS proposal_title,
    i.invoice_number,
    doc.title AS document_title,
    COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', tag.id, 'name', tag.name, 'color', tag.color)) FILTER (WHERE (tag.id IS NOT NULL)), '[]'::jsonb) AS tags,
    count(DISTINCT v.id) AS version_count,
    count(DISTINCT s.id) AS share_count
   FROM (((((((((((public.files f
     LEFT JOIN public.file_folders folder ON ((folder.id = f.folder_id)))
     LEFT JOIN public.crm_contacts c ON ((c.id = f.contact_id)))
     LEFT JOIN public.whatsapp_conversations wc ON ((wc.id = f.conversation_id)))
     LEFT JOIN public.crm_deals d ON ((d.id = f.deal_id)))
     LEFT JOIN public.commercial_proposals p ON ((p.id = f.proposal_id)))
     LEFT JOIN public.finance_invoices i ON ((i.id = f.invoice_id)))
     LEFT JOIN public.documents doc ON ((doc.id = f.document_id)))
     LEFT JOIN public.file_tag_links ftl ON ((ftl.file_id = f.id)))
     LEFT JOIN public.file_tags tag ON ((tag.id = ftl.tag_id)))
     LEFT JOIN public.file_versions v ON ((v.file_id = f.id)))
     LEFT JOIN public.file_shares s ON ((s.file_id = f.id)))
  GROUP BY f.id, folder.name, folder.path, c.name, c.phone, wc.name, wc.external_chat_id, d.title, p.title, i.invoice_number, doc.title;


create or replace view "public"."finance_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.finance_invoices) AS total_invoices,
    ( SELECT count(*) AS count
           FROM public.finance_invoices
          WHERE (finance_invoices.status = ANY (ARRAY['issued'::text, 'sent'::text, 'partially_paid'::text, 'overdue'::text]))) AS open_invoices,
    ( SELECT count(*) AS count
           FROM public.finance_invoices
          WHERE (finance_invoices.status = 'paid'::text)) AS paid_invoices,
    ( SELECT count(*) AS count
           FROM public.finance_invoices
          WHERE (finance_invoices.status = 'overdue'::text)) AS overdue_invoices,
    ( SELECT COALESCE(sum(finance_invoices.total), (0)::numeric) AS "coalesce"
           FROM public.finance_invoices) AS total_invoiced,
    ( SELECT COALESCE(sum(finance_invoices.paid_total), (0)::numeric) AS "coalesce"
           FROM public.finance_invoices) AS total_paid,
    ( SELECT COALESCE(sum(finance_invoices.balance_due), (0)::numeric) AS "coalesce"
           FROM public.finance_invoices
          WHERE (finance_invoices.status = ANY (ARRAY['issued'::text, 'sent'::text, 'partially_paid'::text, 'overdue'::text]))) AS total_open_balance,
    ( SELECT count(*) AS count
           FROM public.finance_installments
          WHERE (finance_installments.status = ANY (ARRAY['pending'::text, 'sent'::text, 'partially_paid'::text]))) AS open_installments,
    ( SELECT count(*) AS count
           FROM public.finance_installments
          WHERE ((finance_installments.due_date < CURRENT_DATE) AND (finance_installments.status = ANY (ARRAY['pending'::text, 'sent'::text, 'partially_paid'::text])))) AS overdue_installments,
    ( SELECT count(*) AS count
           FROM public.finance_payments
          WHERE (finance_payments.status = 'confirmed'::text)) AS confirmed_payments,
    ( SELECT COALESCE(sum(finance_payments.amount), (0)::numeric) AS "coalesce"
           FROM public.finance_payments
          WHERE (finance_payments.status = 'confirmed'::text)) AS confirmed_payment_value,
    ( SELECT count(*) AS count
           FROM public.finance_payments
          WHERE (finance_payments.status = 'pending'::text)) AS pending_payments;


create or replace view "public"."finance_invoices_summary" as  SELECT i.id,
    i.invoice_number,
    i.title,
    i.status,
    i.total,
    i.paid_total,
    i.balance_due,
    i.currency,
    i.issue_date,
    i.due_date,
    i.paid_at,
    i.created_at,
    c.name AS contact_name,
    c.phone AS contact_phone,
    c.email AS contact_email,
    d.title AS deal_title,
    p.title AS proposal_title,
    count(DISTINCT it.id) AS item_count,
    count(DISTINCT inst.id) AS installment_count,
    count(DISTINCT pay.id) AS payment_count
   FROM ((((((public.finance_invoices i
     LEFT JOIN public.crm_contacts c ON ((c.id = i.contact_id)))
     LEFT JOIN public.crm_deals d ON ((d.id = i.deal_id)))
     LEFT JOIN public.commercial_proposals p ON ((p.id = i.proposal_id)))
     LEFT JOIN public.finance_invoice_items it ON ((it.invoice_id = i.id)))
     LEFT JOIN public.finance_installments inst ON ((inst.invoice_id = i.id)))
     LEFT JOIN public.finance_payments pay ON ((pay.invoice_id = i.id)))
  GROUP BY i.id, c.name, c.phone, c.email, d.title, p.title;


create or replace view "public"."finance_open_installments" as  SELECT inst.id,
    inst.invoice_id,
    inst.installment_number,
    inst.title,
    inst.amount,
    inst.paid_amount,
    (inst.amount - inst.paid_amount) AS balance_due,
    inst.status,
    inst.due_date,
    inst.payment_url,
    i.invoice_number,
    i.title AS invoice_title,
    c.name AS contact_name,
    c.phone AS contact_phone,
    c.email AS contact_email,
        CASE
            WHEN (inst.status = ANY (ARRAY['paid'::text, 'cancelled'::text, 'refunded'::text])) THEN false
            WHEN (inst.due_date < CURRENT_DATE) THEN true
            ELSE false
        END AS is_overdue,
    (inst.due_date - CURRENT_DATE) AS days_until_due
   FROM ((public.finance_installments inst
     LEFT JOIN public.finance_invoices i ON ((i.id = inst.invoice_id)))
     LEFT JOIN public.crm_contacts c ON ((c.id = i.contact_id)))
  WHERE (inst.status = ANY (ARRAY['pending'::text, 'sent'::text, 'partially_paid'::text, 'overdue'::text]));


CREATE OR REPLACE FUNCTION public.generate_document_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  next_number integer;
  document_code text;
begin
  select coalesce(count(*), 0) + 1
  into next_number
  from public.documents
  where created_at::date = current_date;

  document_code := 'DOC-' || to_char(current_date, 'YYYYMMDD') || '-' || lpad(next_number::text, 4, '0');

  return document_code;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_file_share_token()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
begin
  return encode(gen_random_bytes(24), 'hex');
end;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  next_number integer;
  invoice_code text;
begin
  select coalesce(count(*), 0) + 1
  into next_number
  from public.finance_invoices
  where created_at::date = current_date;

  invoice_code := 'COB-' || to_char(current_date, 'YYYYMMDD') || '-' || lpad(next_number::text, 4, '0');

  return invoice_code;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_proposal_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  next_number integer;
  proposal_code text;
begin
  select coalesce(count(*), 0) + 1
  into next_number
  from public.commercial_proposals
  where created_at::date = current_date;

  proposal_code := 'PROP-' || to_char(current_date, 'YYYYMMDD') || '-' || lpad(next_number::text, 4, '0');

  return proposal_code;
end;
$function$
;

create or replace view "public"."import_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.import_jobs) AS total_import_jobs,
    ( SELECT count(*) AS count
           FROM public.import_jobs
          WHERE (import_jobs.status = 'draft'::text)) AS draft_jobs,
    ( SELECT count(*) AS count
           FROM public.import_jobs
          WHERE (import_jobs.status = 'preview'::text)) AS preview_jobs,
    ( SELECT count(*) AS count
           FROM public.import_jobs
          WHERE (import_jobs.status = 'completed'::text)) AS completed_jobs,
    ( SELECT count(*) AS count
           FROM public.import_jobs
          WHERE (import_jobs.status = 'failed'::text)) AS failed_jobs,
    ( SELECT count(*) AS count
           FROM public.import_rows) AS total_import_rows,
    ( SELECT count(*) AS count
           FROM public.import_rows
          WHERE (import_rows.status = 'valid'::text)) AS valid_rows,
    ( SELECT count(*) AS count
           FROM public.import_rows
          WHERE (import_rows.status = 'invalid'::text)) AS invalid_rows,
    ( SELECT count(*) AS count
           FROM public.import_rows
          WHERE (import_rows.status = 'duplicate'::text)) AS duplicate_rows,
    ( SELECT count(*) AS count
           FROM public.import_rows
          WHERE (import_rows.review_status = 'pending'::text)) AS pending_review_rows;


create or replace view "public"."import_jobs_summary" as  SELECT j.id,
    j.name,
    j.description,
    j.import_type,
    j.source_type,
    j.status,
    j.original_file_name,
    j.total_rows,
    j.parsed_rows,
    j.valid_rows,
    j.invalid_rows,
    j.duplicate_rows,
    j.imported_rows,
    j.skipped_rows,
    j.started_at,
    j.finished_at,
    j.created_by,
    j.created_at,
    count(r.id) AS staging_rows,
    count(r.id) FILTER (WHERE (r.status = 'valid'::text)) AS staging_valid_rows,
    count(r.id) FILTER (WHERE (r.status = 'invalid'::text)) AS staging_invalid_rows,
    count(r.id) FILTER (WHERE (r.status = 'duplicate'::text)) AS staging_duplicate_rows,
    count(r.id) FILTER (WHERE (r.review_status = 'pending'::text)) AS pending_review_rows,
    count(r.id) FILTER (WHERE (r.review_status = 'approved'::text)) AS approved_rows,
    count(r.id) FILTER (WHERE (r.review_status = 'rejected'::text)) AS rejected_rows
   FROM (public.import_jobs j
     LEFT JOIN public.import_rows r ON ((r.job_id = j.id)))
  GROUP BY j.id;


create or replace view "public"."knowledge_articles_summary" as  SELECT a.id,
    a.title,
    a.slug,
    a.summary,
    a.article_type,
    a.status,
    a.visibility,
    a.module,
    a.tags,
    a.difficulty,
    a.estimated_read_minutes,
    a.version,
    a.published_at,
    a.created_at,
    a.updated_at,
    c.name AS category_name,
    c.slug AS category_slug,
    c.category_type
   FROM (public.knowledge_articles a
     LEFT JOIN public.knowledge_categories c ON ((c.id = a.category_id)));


create or replace view "public"."knowledge_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.knowledge_categories
          WHERE (knowledge_categories.is_active = true)) AS active_categories,
    ( SELECT count(*) AS count
           FROM public.knowledge_articles
          WHERE (knowledge_articles.status = 'published'::text)) AS published_articles,
    ( SELECT count(*) AS count
           FROM public.knowledge_articles
          WHERE (knowledge_articles.status = 'draft'::text)) AS draft_articles,
    ( SELECT count(*) AS count
           FROM public.knowledge_faqs
          WHERE (knowledge_faqs.status = 'published'::text)) AS published_faqs,
    ( SELECT count(*) AS count
           FROM public.support_scripts
          WHERE (support_scripts.is_active = true)) AS active_support_scripts,
    ( SELECT count(*) AS count
           FROM public.training_programs
          WHERE (training_programs.is_active = true)) AS active_training_programs,
    ( SELECT count(*) AS count
           FROM public.training_lessons
          WHERE (training_lessons.is_active = true)) AS active_training_lessons,
    ( SELECT count(*) AS count
           FROM public.training_progress
          WHERE (training_progress.status = 'completed'::text)) AS completed_training_lessons,
    ( SELECT count(*) AS count
           FROM public.knowledge_feedback) AS total_feedbacks;


CREATE OR REPLACE FUNCTION public.log_application_event(p_level text, p_source text, p_module text, p_message text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  log_id uuid;
begin
  insert into public.application_logs (
    level,
    source,
    module,
    message,
    metadata
  )
  values (
    p_level,
    p_source,
    p_module,
    p_message,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into log_id;

  return log_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  update public.notifications
  set
    status = 'read',
    read_at = now(),
    updated_at = now()
  where id = p_notification_id;

  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_whatsapp_message_revoked(p_external_message_id text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_message_id uuid;
begin
  update public.whatsapp_messages
  set
    deleted_by_sender = true,
    deleted_at = coalesce(deleted_at, now()),
    revoked_payload = coalesce(p_payload, '{}'::jsonb)
  where external_message_id = p_external_message_id
  returning id into v_message_id;

  return v_message_id;
end;
$function$
;

create or replace view "public"."multi_tenant_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.tenants) AS total_tenants,
    ( SELECT count(*) AS count
           FROM public.tenants
          WHERE (tenants.status = 'active'::text)) AS active_tenants,
    ( SELECT count(*) AS count
           FROM public.organizations
          WHERE (organizations.status = 'active'::text)) AS active_organizations,
    ( SELECT count(*) AS count
           FROM public.tenant_users
          WHERE (tenant_users.status = 'active'::text)) AS active_tenant_users,
    ( SELECT count(*) AS count
           FROM public.white_label_brands
          WHERE (white_label_brands.status = 'active'::text)) AS active_white_label_brands,
    ( SELECT count(*) AS count
           FROM public.tenant_domains
          WHERE (tenant_domains.status = 'active'::text)) AS active_domains,
    ( SELECT count(*) AS count
           FROM public.subscription_plans
          WHERE (subscription_plans.is_active = true)) AS active_plans,
    ( SELECT count(*) AS count
           FROM public.tenant_subscriptions
          WHERE (tenant_subscriptions.status = 'active'::text)) AS active_subscriptions,
    ( SELECT COALESCE(sum(tenant_subscriptions.price), (0)::numeric) AS "coalesce"
           FROM public.tenant_subscriptions
          WHERE (tenant_subscriptions.status = 'active'::text)) AS monthly_recurring_revenue_estimate;


create or replace view "public"."notifications_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.notifications) AS total_notifications,
    ( SELECT count(*) AS count
           FROM public.notifications
          WHERE (notifications.status = 'unread'::text)) AS unread_notifications,
    ( SELECT count(*) AS count
           FROM public.notifications
          WHERE (notifications.status = 'read'::text)) AS read_notifications,
    ( SELECT count(*) AS count
           FROM public.notifications
          WHERE ((notifications.priority = 'urgent'::text) AND (notifications.status = 'unread'::text))) AS urgent_unread_notifications,
    ( SELECT count(*) AS count
           FROM public.notifications
          WHERE ((notifications.created_at)::date = CURRENT_DATE)) AS notifications_today,
    ( SELECT count(*) AS count
           FROM public.notification_deliveries
          WHERE (notification_deliveries.status = 'failed'::text)) AS failed_deliveries,
    ( SELECT count(*) AS count
           FROM public.notification_templates
          WHERE (notification_templates.is_active = true)) AS active_templates,
    ( SELECT count(*) AS count
           FROM public.notification_rules
          WHERE (notification_rules.is_active = true)) AS active_rules,
    ( SELECT count(*) AS count
           FROM public.notification_channels
          WHERE (notification_channels.is_active = true)) AS active_channels;


create or replace view "public"."notifications_summary" as  SELECT n.id,
    n.title,
    n.body,
    n.notification_type,
    n.module,
    n.priority,
    n.status,
    n.related_entity_type,
    n.related_entity_id,
    n.action_label,
    n.action_url,
    n.scheduled_at,
    n.sent_at,
    n.read_at,
    n.archived_at,
    n.expires_at,
    n.created_at,
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    u.name AS recipient_name,
    u.email AS recipient_email,
    count(d.id) AS delivery_count,
    count(d.id) FILTER (WHERE (d.status = 'sent'::text)) AS sent_deliveries,
    count(d.id) FILTER (WHERE (d.status = 'failed'::text)) AS failed_deliveries
   FROM (((public.notifications n
     LEFT JOIN public.tenants t ON ((t.id = n.tenant_id)))
     LEFT JOIN public.app_users u ON ((u.id = n.recipient_user_id)))
     LEFT JOIN public.notification_deliveries d ON ((d.notification_id = n.id)))
  GROUP BY n.id, t.name, t.slug, u.name, u.email;


create or replace view "public"."onboarding_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.onboarding_flows
          WHERE (onboarding_flows.is_active = true)) AS active_flows,
    ( SELECT count(*) AS count
           FROM public.onboarding_steps
          WHERE (onboarding_steps.is_active = true)) AS active_steps,
    ( SELECT count(*) AS count
           FROM public.tenant_onboarding_progress
          WHERE (tenant_onboarding_progress.status = 'in_progress'::text)) AS tenants_in_progress,
    ( SELECT count(*) AS count
           FROM public.tenant_onboarding_progress
          WHERE (tenant_onboarding_progress.status = 'completed'::text)) AS tenants_completed,
    ( SELECT count(*) AS count
           FROM public.tenant_onboarding_step_status
          WHERE (tenant_onboarding_step_status.status = 'pending'::text)) AS pending_steps,
    ( SELECT count(*) AS count
           FROM public.tenant_onboarding_step_status
          WHERE (tenant_onboarding_step_status.status = 'completed'::text)) AS completed_steps,
    ( SELECT count(*) AS count
           FROM public.setup_assistant_sessions
          WHERE (setup_assistant_sessions.status = 'active'::text)) AS active_assistant_sessions,
    ( SELECT count(*) AS count
           FROM public.setup_validation_results
          WHERE (setup_validation_results.status = 'failed'::text)) AS failed_validation_checks;


create or replace view "public"."operational_settings_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.app_settings) AS total_settings,
    ( SELECT count(*) AS count
           FROM public.messaging_policies
          WHERE (messaging_policies.is_active = true)) AS active_policies,
    ( SELECT count(*) AS count
           FROM public.consent_keywords
          WHERE (consent_keywords.is_active = true)) AS active_consent_keywords,
    ( SELECT count(*) AS count
           FROM public.consent_message_templates
          WHERE (consent_message_templates.is_active = true)) AS active_consent_templates,
    ( SELECT count(*) AS count
           FROM public.business_hours
          WHERE (business_hours.is_active = true)) AS business_hours_rules,
    ( SELECT count(*) AS count
           FROM public.blocked_contacts
          WHERE (blocked_contacts.is_active = true)) AS blocked_contacts;


create or replace view "public"."operations_health_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.system_health_checks
          WHERE (system_health_checks.checked_at > (now() - '24:00:00'::interval))) AS health_checks_24h,
    ( SELECT count(*) AS count
           FROM public.system_health_checks
          WHERE (system_health_checks.status = 'healthy'::text)) AS healthy_checks,
    ( SELECT count(*) AS count
           FROM public.system_health_checks
          WHERE (system_health_checks.status = ANY (ARRAY['degraded'::text, 'down'::text, 'error'::text]))) AS unhealthy_checks,
    ( SELECT count(*) AS count
           FROM public.backup_configs
          WHERE (backup_configs.is_active = true)) AS active_backup_configs,
    ( SELECT count(*) AS count
           FROM public.backup_runs
          WHERE (backup_runs.status = 'completed'::text)) AS completed_backups,
    ( SELECT count(*) AS count
           FROM public.backup_runs
          WHERE (backup_runs.status = 'failed'::text)) AS failed_backups,
    ( SELECT count(*) AS count
           FROM public.maintenance_tasks
          WHERE (maintenance_tasks.is_active = true)) AS active_maintenance_tasks,
    ( SELECT count(*) AS count
           FROM public.maintenance_runs
          WHERE (maintenance_runs.status = 'failed'::text)) AS failed_maintenance_runs,
    ( SELECT count(*) AS count
           FROM public.job_queue_status
          WHERE (job_queue_status.status = ANY (ARRAY['degraded'::text, 'stuck'::text, 'down'::text]))) AS unhealthy_queues,
    ( SELECT count(*) AS count
           FROM public.operational_checklists
          WHERE (operational_checklists.is_active = true)) AS active_checklists,
    ( SELECT count(*) AS count
           FROM public.operational_checklist_runs
          WHERE ((operational_checklist_runs.status <> 'completed'::text) AND (operational_checklist_runs.run_date = CURRENT_DATE))) AS open_checklists_today;


create or replace view "public"."pending_operations_tasks" as  SELECT 'maintenance'::text AS task_source,
    (maintenance_tasks.id)::text AS task_id,
    maintenance_tasks.name AS title,
    maintenance_tasks.task_type,
    maintenance_tasks.priority,
    maintenance_tasks.next_run_at,
    maintenance_tasks.status
   FROM public.maintenance_tasks
  WHERE ((maintenance_tasks.is_active = true) AND ((maintenance_tasks.next_run_at IS NULL) OR (maintenance_tasks.next_run_at <= now())))
UNION ALL
 SELECT 'backup'::text AS task_source,
    (backup_configs.id)::text AS task_id,
    backup_configs.name AS title,
    backup_configs.backup_type AS task_type,
    'high'::text AS priority,
    backup_configs.next_run_at,
        CASE
            WHEN backup_configs.is_active THEN 'active'::text
            ELSE 'inactive'::text
        END AS status
   FROM public.backup_configs
  WHERE ((backup_configs.is_active = true) AND ((backup_configs.next_run_at IS NULL) OR (backup_configs.next_run_at <= now())))
  ORDER BY 6 NULLS FIRST;


create or replace view "public"."pending_reminders_summary" as  SELECT r.id,
    r.title,
    r.body,
    r.reminder_type,
    r.scheduled_at,
    r.status,
    r.priority,
    r.created_at,
    u.name AS recipient_name,
    u.email AS recipient_email,
    e.title AS event_title,
    e.starts_at AS event_starts_at,
    task.title AS task_title,
    i.invoice_number,
    i.title AS invoice_title
   FROM ((((public.reminders r
     LEFT JOIN public.app_users u ON ((u.id = r.recipient_user_id)))
     LEFT JOIN public.calendar_events e ON ((e.id = r.event_id)))
     LEFT JOIN public.crm_tasks task ON ((task.id = r.task_id)))
     LEFT JOIN public.finance_invoices i ON ((i.id = r.invoice_id)))
  WHERE (r.status = 'pending'::text)
  ORDER BY r.scheduled_at;


create or replace view "public"."published_translations_summary" as  SELECT k.key,
    k.module,
    k.description,
    k.default_text,
    t.locale_code,
    t.text_value,
    t.status
   FROM (public.translation_keys k
     LEFT JOIN public.translations t ON ((t.translation_key_id = k.id)))
  WHERE ((k.is_active = true) AND ((t.status = 'published'::text) OR (t.status IS NULL)));


create or replace view "public"."qa_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.qa_test_plans) AS total_test_plans,
    ( SELECT count(*) AS count
           FROM public.qa_test_plans
          WHERE (qa_test_plans.status = 'ready'::text)) AS ready_test_plans,
    ( SELECT count(*) AS count
           FROM public.qa_test_cases) AS total_test_cases,
    ( SELECT count(*) AS count
           FROM public.qa_test_cases
          WHERE (qa_test_cases.status = 'passed'::text)) AS passed_test_cases,
    ( SELECT count(*) AS count
           FROM public.qa_test_cases
          WHERE (qa_test_cases.status = 'failed'::text)) AS failed_test_cases,
    ( SELECT count(*) AS count
           FROM public.qa_test_cases
          WHERE (qa_test_cases.status = 'not_run'::text)) AS not_run_test_cases,
    ( SELECT count(*) AS count
           FROM public.qa_bugs
          WHERE (qa_bugs.status = ANY (ARRAY['open'::text, 'triage'::text, 'in_progress'::text]))) AS open_bugs,
    ( SELECT count(*) AS count
           FROM public.qa_bugs
          WHERE ((qa_bugs.severity = 'critical'::text) AND (qa_bugs.status <> ALL (ARRAY['closed'::text, 'wont_fix'::text, 'duplicate'::text])))) AS critical_bugs,
    ( SELECT count(*) AS count
           FROM public.deployments) AS total_deployments,
    ( SELECT count(*) AS count
           FROM public.deployments
          WHERE (deployments.status = 'failed'::text)) AS failed_deployments;


create or replace view "public"."qa_open_bugs_summary" as  SELECT id,
    title,
    description,
    module,
    feature,
    severity,
    priority,
    status,
    environment,
    error_message,
    related_commit_hash,
    related_deployment_url,
    reported_by,
    assigned_to,
    created_at,
    updated_at
   FROM public.qa_bugs b
  WHERE (status = ANY (ARRAY['open'::text, 'triage'::text, 'in_progress'::text]))
  ORDER BY
        CASE severity
            WHEN 'critical'::text THEN 1
            WHEN 'high'::text THEN 2
            WHEN 'medium'::text THEN 3
            ELSE 4
        END, created_at DESC;


create or replace view "public"."recent_system_activity" as  SELECT 'application_log'::text AS activity_source,
    (application_logs.id)::text AS activity_id,
    application_logs.level AS severity,
    application_logs.module,
    application_logs.message AS title,
    application_logs.created_at
   FROM public.application_logs
UNION ALL
 SELECT 'security_event'::text AS activity_source,
    (security_events.id)::text AS activity_id,
    security_events.severity,
    security_events.event_type AS module,
    security_events.title,
    security_events.occurred_at AS created_at
   FROM public.security_events
UNION ALL
 SELECT 'system_alert'::text AS activity_source,
    (system_alerts.id)::text AS activity_id,
    system_alerts.severity,
    system_alerts.alert_type AS module,
    system_alerts.title,
    system_alerts.created_at
   FROM public.system_alerts
  ORDER BY 6 DESC;


CREATE OR REPLACE FUNCTION public.register_inbound_webhook_event(p_provider text, p_event_type text, p_payload jsonb, p_event_id text DEFAULT NULL::text, p_endpoint_key text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  endpoint_record record;
  event_uuid uuid;
begin
  select e.*, i.id as integration_uuid
  into endpoint_record
  from public.inbound_webhook_endpoints e
  left join public.external_integrations i on i.id = e.integration_id
  where
    (p_endpoint_key is not null and e.endpoint_key = p_endpoint_key)
    or
    (p_endpoint_key is null and e.provider = p_provider)
  limit 1;

  insert into public.inbound_webhook_events (
    endpoint_id,
    integration_id,
    provider,
    event_type,
    event_id,
    payload,
    status,
    processing_status
  )
  values (
    endpoint_record.id,
    endpoint_record.integration_uuid,
    p_provider,
    p_event_type,
    p_event_id,
    coalesce(p_payload, '{}'::jsonb),
    'received',
    'pending'
  )
  returning id into event_uuid;

  return event_uuid;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

create or replace view "public"."search_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.global_search_index
          WHERE (global_search_index.is_active = true)) AS indexed_items,
    ( SELECT count(DISTINCT global_search_index.entity_type) AS count
           FROM public.global_search_index
          WHERE (global_search_index.is_active = true)) AS indexed_entity_types,
    ( SELECT count(DISTINCT global_search_index.module) AS count
           FROM public.global_search_index
          WHERE (global_search_index.is_active = true)) AS indexed_modules,
    ( SELECT count(*) AS count
           FROM public.search_queries) AS total_search_queries,
    ( SELECT count(*) AS count
           FROM public.search_queries
          WHERE ((search_queries.created_at)::date = CURRENT_DATE)) AS search_queries_today,
    ( SELECT count(*) AS count
           FROM public.saved_searches
          WHERE (saved_searches.is_active = true)) AS active_saved_searches,
    ( SELECT count(*) AS count
           FROM public.search_settings
          WHERE (search_settings.is_active = true)) AS active_search_settings;


CREATE OR REPLACE FUNCTION public.search_global(p_query text, p_module text DEFAULT NULL::text, p_entity_type text DEFAULT NULL::text, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, entity_type text, entity_id text, title text, subtitle text, summary text, module text, url_path text, rank real, metadata jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select
    g.id,
    g.entity_type,
    g.entity_id,
    g.title,
    g.subtitle,
    g.summary,
    g.module,
    g.url_path,
    ts_rank(
      to_tsvector('portuguese', g.searchable_text),
      plainto_tsquery('portuguese', p_query)
    ) as rank,
    g.metadata
  from public.global_search_index g
  where g.is_active = true
    and (
      p_module is null
      or g.module = p_module
    )
    and (
      p_entity_type is null
      or g.entity_type = p_entity_type
    )
    and (
      to_tsvector('portuguese', g.searchable_text) @@ plainto_tsquery('portuguese', p_query)
      or g.searchable_text ilike '%' || p_query || '%'
    )
  order by
    rank desc,
    g.priority desc,
    g.updated_at desc
  limit p_limit;
end;
$function$
;

create or replace view "public"."search_index_by_module_summary" as  SELECT module,
    entity_type,
    count(*) AS indexed_items,
    max(indexed_at) AS last_indexed_at
   FROM public.global_search_index
  WHERE (is_active = true)
  GROUP BY module, entity_type
  ORDER BY module, entity_type;


create or replace view "public"."security_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.user_sessions
          WHERE (user_sessions.status = 'active'::text)) AS active_sessions,
    ( SELECT count(*) AS count
           FROM public.security_events
          WHERE (security_events.status = 'open'::text)) AS open_security_events,
    ( SELECT count(*) AS count
           FROM public.security_events
          WHERE ((security_events.severity = 'critical'::text) AND (security_events.status = 'open'::text))) AS critical_security_events,
    ( SELECT count(*) AS count
           FROM public.application_logs
          WHERE (application_logs.level = ANY (ARRAY['error'::text, 'critical'::text]))) AS technical_errors,
    ( SELECT count(*) AS count
           FROM public.application_logs
          WHERE (((application_logs.created_at)::date = CURRENT_DATE) AND (application_logs.level = ANY (ARRAY['error'::text, 'critical'::text])))) AS technical_errors_today,
    ( SELECT count(*) AS count
           FROM public.system_alerts
          WHERE (system_alerts.status = 'open'::text)) AS open_alerts,
    ( SELECT count(*) AS count
           FROM public.system_alerts
          WHERE ((system_alerts.severity = 'critical'::text) AND (system_alerts.status = 'open'::text))) AS critical_alerts,
    ( SELECT count(*) AS count
           FROM public.access_attempts
          WHERE ((access_attempts.status = 'failed'::text) AND (access_attempts.created_at > (now() - '24:00:00'::interval)))) AS failed_access_attempts_24h,
    ( SELECT count(*) AS count
           FROM public.api_tokens
          WHERE (api_tokens.status = 'active'::text)) AS active_api_tokens,
    ( SELECT count(*) AS count
           FROM public.security_rules
          WHERE (security_rules.is_active = true)) AS active_security_rules;


CREATE OR REPLACE FUNCTION public.shamar_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.simple_slug(input_text text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
begin
  return lower(
    regexp_replace(
      regexp_replace(
        translate(input_text, 'áàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'),
        '[^a-zA-Z0-9]+',
        '-',
        'g'
      ),
      '(^-|-$)',
      '',
      'g'
    )
  );
end;
$function$
;

create or replace view "public"."support_queue_summary" as  SELECT q.id,
    q.name,
    q.description,
    q.channel,
    q.priority,
    q.is_active,
    count(DISTINCT qa.user_id) AS total_agents,
    count(DISTINCT ca.id) FILTER (WHERE (ca.status = 'open'::text)) AS open_conversations,
    count(DISTINCT ca.id) FILTER (WHERE (ca.status = 'pending'::text)) AS pending_conversations,
    count(DISTINCT ca.id) FILTER (WHERE (ca.status = 'resolved'::text)) AS resolved_conversations
   FROM ((public.support_queues q
     LEFT JOIN public.support_queue_agents qa ON (((qa.queue_id = q.id) AND (qa.is_active = true))))
     LEFT JOIN public.conversation_assignments ca ON ((ca.queue_id = q.id)))
  GROUP BY q.id;


create or replace view "public"."tenant_branding_summary" as  SELECT t.id AS tenant_id,
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    p.app_name,
    p.page_title,
    p.locale_code,
    p.sidebar_collapsed,
    p.show_branding,
    p.show_powered_by,
    COALESCE(p.custom_logo_url, b.logo_url, theme.logo_url) AS logo_url,
    COALESCE(p.custom_icon_url, b.icon_url, theme.icon_url) AS icon_url,
    COALESCE(p.custom_favicon_url, b.favicon_url, theme.favicon_url) AS favicon_url,
    COALESCE(p.custom_primary_color, b.primary_color, theme.primary_color) AS primary_color,
    COALESCE(p.custom_secondary_color, b.secondary_color, theme.secondary_color) AS secondary_color,
    COALESCE(p.custom_accent_color, b.accent_color, theme.accent_color) AS accent_color,
    theme.background_color,
    theme.foreground_color,
    theme.muted_color,
    theme.border_color,
    b.support_email,
    b.support_phone,
    b.support_whatsapp
   FROM (((public.tenants t
     LEFT JOIN public.tenant_ui_preferences p ON ((p.tenant_id = t.id)))
     LEFT JOIN public.white_label_brands b ON ((b.tenant_id = t.id)))
     LEFT JOIN public.ui_themes theme ON ((theme.id = p.theme_id)));


create or replace view "public"."tenant_onboarding_steps_summary" as  SELECT ss.id,
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    f.name AS flow_name,
    s.step_key,
    s.title,
    s.description,
    s.module,
    s.sort_order,
    s.is_required,
    s.action_label,
    s.action_href,
    s.validation_type,
    ss.status,
    ss.validation_status,
    ss.validation_message,
    ss.completed_at,
    ss.updated_at
   FROM (((public.tenant_onboarding_step_status ss
     JOIN public.tenants t ON ((t.id = ss.tenant_id)))
     JOIN public.onboarding_flows f ON ((f.id = ss.flow_id)))
     JOIN public.onboarding_steps s ON ((s.id = ss.step_id)))
  ORDER BY s.sort_order;


create or replace view "public"."tenant_onboarding_summary" as  SELECT p.id,
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    f.name AS flow_name,
    f.flow_type,
    p.status,
    p.total_steps,
    p.completed_steps,
    p.skipped_steps,
    p.required_steps,
    p.completed_required_steps,
    p.progress_percent,
    p.started_at,
    p.completed_at,
    p.updated_at
   FROM ((public.tenant_onboarding_progress p
     JOIN public.tenants t ON ((t.id = p.tenant_id)))
     JOIN public.onboarding_flows f ON ((f.id = p.flow_id)));


create or replace view "public"."tenants_summary" as  SELECT t.id,
    t.name,
    t.slug,
    t.status,
    t.owner_name,
    t.owner_email,
    t.timezone,
    t.locale,
    t.currency,
    t.created_at,
    count(DISTINCT o.id) AS organization_count,
    count(DISTINCT tu.id) AS user_count,
    count(DISTINCT d.id) AS domain_count,
    s.status AS subscription_status,
    p.name AS plan_name,
    p.slug AS plan_slug,
    p.price AS plan_price,
    b.brand_name,
    b.app_name,
    b.logo_url,
    b.icon_url,
    b.primary_color,
    b.secondary_color,
    b.accent_color
   FROM ((((((public.tenants t
     LEFT JOIN public.organizations o ON ((o.tenant_id = t.id)))
     LEFT JOIN public.tenant_users tu ON ((tu.tenant_id = t.id)))
     LEFT JOIN public.tenant_domains d ON ((d.tenant_id = t.id)))
     LEFT JOIN public.tenant_subscriptions s ON ((s.tenant_id = t.id)))
     LEFT JOIN public.subscription_plans p ON ((p.id = s.plan_id)))
     LEFT JOIN public.white_label_brands b ON ((b.tenant_id = t.id)))
  GROUP BY t.id, s.status, p.name, p.slug, p.price, b.brand_name, b.app_name, b.logo_url, b.icon_url, b.primary_color, b.secondary_color, b.accent_color;


CREATE OR REPLACE FUNCTION public.touch_commercial_agent_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.touch_internal_messaging_gateways_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin new.updated_at = now(); return new; end; $function$
;

create or replace view "public"."training_programs_summary" as  SELECT p.id,
    p.name,
    p.description,
    p.program_type,
    p.target_role,
    p.status,
    p.estimated_duration_minutes,
    p.is_required,
    p.is_active,
    p.created_at,
    count(DISTINCT l.id) AS lesson_count,
    count(DISTINCT tp.id) AS progress_records,
    count(DISTINCT tp.id) FILTER (WHERE (tp.status = 'completed'::text)) AS completed_progress_records
   FROM ((public.training_programs p
     LEFT JOIN public.training_lessons l ON ((l.program_id = p.id)))
     LEFT JOIN public.training_progress tp ON ((tp.program_id = p.id)))
  GROUP BY p.id;


create or replace view "public"."unread_notifications_summary" as  SELECT n.id,
    n.title,
    n.body,
    n.notification_type,
    n.module,
    n.priority,
    n.action_url,
    n.created_at,
    t.slug AS tenant_slug,
    u.name AS recipient_name,
    u.email AS recipient_email
   FROM ((public.notifications n
     LEFT JOIN public.tenants t ON ((t.id = n.tenant_id)))
     LEFT JOIN public.app_users u ON ((u.id = n.recipient_user_id)))
  WHERE ((n.status = 'unread'::text) AND ((n.expires_at IS NULL) OR (n.expires_at > now())))
  ORDER BY
        CASE n.priority
            WHEN 'urgent'::text THEN 1
            WHEN 'high'::text THEN 2
            WHEN 'normal'::text THEN 3
            ELSE 4
        END, n.created_at DESC;


CREATE OR REPLACE FUNCTION public.upsert_global_search_item(p_entity_type text, p_entity_id text, p_title text, p_subtitle text DEFAULT NULL::text, p_content text DEFAULT NULL::text, p_summary text DEFAULT NULL::text, p_module text DEFAULT 'general'::text, p_tags text[] DEFAULT '{}'::text[], p_url_path text DEFAULT NULL::text, p_contact_id uuid DEFAULT NULL::uuid, p_conversation_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  search_id uuid;
  combined_text text;
begin
  combined_text := trim(
    coalesce(p_title, '') || ' ' ||
    coalesce(p_subtitle, '') || ' ' ||
    coalesce(p_content, '') || ' ' ||
    coalesce(p_summary, '') || ' ' ||
    array_to_string(coalesce(p_tags, '{}'), ' ')
  );

  insert into public.global_search_index (
    entity_type,
    entity_id,
    title,
    subtitle,
    content,
    summary,
    module,
    searchable_text,
    tags,
    url_path,
    contact_id,
    conversation_id,
    metadata,
    indexed_at,
    updated_at
  )
  values (
    p_entity_type,
    p_entity_id,
    p_title,
    p_subtitle,
    p_content,
    p_summary,
    p_module,
    combined_text,
    coalesce(p_tags, '{}'),
    p_url_path,
    p_contact_id,
    p_conversation_id,
    coalesce(p_metadata, '{}'::jsonb),
    now(),
    now()
  )
  on conflict (entity_type, entity_id) do update
  set
    title = excluded.title,
    subtitle = excluded.subtitle,
    content = excluded.content,
    summary = excluded.summary,
    module = excluded.module,
    searchable_text = excluded.searchable_text,
    tags = excluded.tags,
    url_path = excluded.url_path,
    contact_id = excluded.contact_id,
    conversation_id = excluded.conversation_id,
    metadata = excluded.metadata,
    indexed_at = now(),
    updated_at = now()
  returning id into search_id;

  return search_id;
end;
$function$
;

create or replace view "public"."webhooks_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.external_integrations
          WHERE (external_integrations.is_active = true)) AS active_integrations,
    ( SELECT count(*) AS count
           FROM public.inbound_webhook_endpoints
          WHERE (inbound_webhook_endpoints.is_active = true)) AS active_inbound_endpoints,
    ( SELECT count(*) AS count
           FROM public.outbound_webhooks
          WHERE (outbound_webhooks.is_active = true)) AS active_outbound_webhooks,
    ( SELECT count(*) AS count
           FROM public.inbound_webhook_events) AS total_inbound_events,
    ( SELECT count(*) AS count
           FROM public.inbound_webhook_events
          WHERE ((inbound_webhook_events.received_at)::date = CURRENT_DATE)) AS inbound_events_today,
    ( SELECT count(*) AS count
           FROM public.inbound_webhook_events
          WHERE (inbound_webhook_events.processing_status = 'failed'::text)) AS failed_inbound_events,
    ( SELECT count(*) AS count
           FROM public.outbound_webhook_deliveries) AS total_outbound_deliveries,
    ( SELECT count(*) AS count
           FROM public.outbound_webhook_deliveries
          WHERE (outbound_webhook_deliveries.status = 'pending'::text)) AS pending_outbound_deliveries,
    ( SELECT count(*) AS count
           FROM public.outbound_webhook_deliveries
          WHERE (outbound_webhook_deliveries.status = 'failed'::text)) AS failed_outbound_deliveries,
    ( SELECT count(*) AS count
           FROM public.outbound_webhook_deliveries
          WHERE (outbound_webhook_deliveries.status = 'sent'::text)) AS sent_outbound_deliveries,
    ( SELECT count(*) AS count
           FROM public.outbound_webhook_attempts
          WHERE (outbound_webhook_attempts.status = 'failed'::text)) AS failed_attempts;


create or replace view "public"."whatsapp_media_dashboard_summary" as  SELECT ( SELECT count(*) AS count
           FROM public.whatsapp_media_files) AS total_media_files,
    ( SELECT count(*) AS count
           FROM public.whatsapp_media_files
          WHERE (whatsapp_media_files.media_type = 'image'::text)) AS total_images,
    ( SELECT count(*) AS count
           FROM public.whatsapp_media_files
          WHERE (whatsapp_media_files.media_type = 'audio'::text)) AS total_audios,
    ( SELECT count(*) AS count
           FROM public.whatsapp_media_files
          WHERE (whatsapp_media_files.media_type = 'video'::text)) AS total_videos,
    ( SELECT count(*) AS count
           FROM public.whatsapp_media_files
          WHERE (whatsapp_media_files.media_type = 'document'::text)) AS total_documents,
    ( SELECT count(*) AS count
           FROM public.whatsapp_media_files
          WHERE (whatsapp_media_files.download_status = 'pending'::text)) AS pending_downloads,
    ( SELECT count(*) AS count
           FROM public.whatsapp_media_files
          WHERE (whatsapp_media_files.download_status = 'failed'::text)) AS failed_downloads,
    ( SELECT count(*) AS count
           FROM public.media_processing_jobs
          WHERE (media_processing_jobs.status = 'pending'::text)) AS pending_jobs,
    ( SELECT count(*) AS count
           FROM public.media_processing_jobs
          WHERE (media_processing_jobs.status = 'failed'::text)) AS failed_jobs,
    ( SELECT count(*) AS count
           FROM public.whatsapp_audio_transcriptions) AS total_audio_transcriptions,
    ( SELECT count(*) AS count
           FROM public.whatsapp_media_text_extractions) AS total_text_extractions;


CREATE OR REPLACE FUNCTION public.activate_paid_checkout_subscription(p_checkout_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_checkout          record;
  v_subscription_id   uuid;
  v_addons            jsonb;
  v_storage_gb        integer;
  v_retention_days    integer;
  v_period_end        timestamptz;
BEGIN
  SELECT * INTO v_checkout
  FROM public.billing_checkout_sessions
  WHERE id = p_checkout_id
    AND status IN ('paid_pending_activation', 'active');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'checkout_not_found_or_wrong_status');
  END IF;

  IF v_checkout.tenant_id IS NULL OR v_checkout.organization_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'tenant_not_provisioned_yet');
  END IF;

  SELECT id INTO v_subscription_id
  FROM public.billing_subscriptions
  WHERE checkout_session_id = p_checkout_id;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'subscription_id', v_subscription_id, 'already_exists', true);
  END IF;

  v_addons := COALESCE((v_checkout.metadata -> 'selectedAddons'), '[]'::jsonb);

  v_storage_gb := 5;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_addons) AS a WHERE a->>'slug' = 'storage_100gb') THEN
    v_storage_gb := 105;
  ELSIF EXISTS (SELECT 1 FROM jsonb_array_elements(v_addons) AS a WHERE a->>'slug' = 'storage_50gb') THEN
    v_storage_gb := 55;
  ELSIF EXISTS (SELECT 1 FROM jsonb_array_elements(v_addons) AS a WHERE a->>'slug' = 'storage_10gb') THEN
    v_storage_gb := 15;
  END IF;

  v_retention_days := CASE v_checkout.plan_slug
    WHEN 'starter'      THEN 365
    WHEN 'professional' THEN 730
    WHEN 'business'     THEN 1095
    ELSE 365
  END;

  v_period_end := CASE v_checkout.billing_cycle
    WHEN 'annual' THEN now() + interval '1 year'
    ELSE now() + interval '1 month'
  END;

  INSERT INTO public.billing_subscriptions (
    tenant_id, organization_id, checkout_session_id,
    plan_slug, billing_cycle, status,
    base_amount, setup_amount, extra_whatsapp_connections, extra_users, ai_addon_enabled,
    total_amount, currency, billing_provider,
    addons, storage_quota_gb, message_retention_days,
    started_at, current_period_start, current_period_end,
    metadata, created_at, updated_at
  ) VALUES (
    v_checkout.tenant_id, v_checkout.organization_id, p_checkout_id,
    v_checkout.plan_slug, v_checkout.billing_cycle, 'active',
    COALESCE(v_checkout.base_amount, 0), COALESCE(v_checkout.setup_amount, 0),
    COALESCE(v_checkout.extra_whatsapp_connections, 0), COALESCE(v_checkout.extra_users, 0),
    COALESCE(v_checkout.ai_addon_enabled, false),
    COALESCE(v_checkout.final_amount, v_checkout.total_amount, 0), 'BRL', 'asaas',
    v_addons, v_storage_gb, v_retention_days,
    now(), now(), v_period_end,
    jsonb_build_object('checkout_session_id', p_checkout_id, 'activated_via', 'admin_provision',
      'plan_name', COALESCE(v_checkout.metadata->>'planName', v_checkout.plan_slug)),
    now(), now()
  ) RETURNING id INTO v_subscription_id;

  RETURN jsonb_build_object(
    'ok', true,
    'subscription_id', v_subscription_id,
    'plan_slug', v_checkout.plan_slug,
    'storage_quota_gb', v_storage_gb,
    'message_retention_days', v_retention_days,
    'period_end', v_period_end
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_lips_sla_breaches(escalate_to_supervision boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  changed_count integer := 0;
begin
  with scope_candidates as (
    select distinct c.tenant_id, c.organization_id
    from public.channels c
    join public.organizations o
      on o.id = c.organization_id
     and o.slug = 'auto-pecas-auto-center-lips'
    where c.session_id = 'lips-main'
  ), lips_scope as (
    select min(tenant_id::text)::uuid as tenant_id,
           min(organization_id::text)::uuid as organization_id
    from scope_candidates
    having count(*) = 1
  ), lips_supervision as (
    select d.id
    from public.departments d
    join lips_scope s
      on s.tenant_id = d.tenant_id
     and s.organization_id = d.organization_id
    where public.normalize_department_name(d.name) = 'supervisao'
      and d.is_active = true
    limit 1
  ), changed as (
    update public.whatsapp_conversations c
    set sla_status = 'breached',
        sla_breached_at = coalesce(c.sla_breached_at, now()),
        priority = 'urgent',
        department_id = case
          when escalate_to_supervision then coalesce((select id from lips_supervision), c.department_id)
          else c.department_id
        end,
        updated_at = now()
    from lips_scope s
    where c.tenant_id = s.tenant_id
      and c.organization_id = s.organization_id
      and c.queue_status in ('waiting', 'in_progress', 'awaiting_customer')
      and c.sla_due_at is not null
      and c.sla_due_at <= now()
      and c.sla_breached_at is null
    returning c.id, c.tenant_id, c.organization_id, c.channel_id
  ), events as (
    insert into public.whatsapp_conversation_events (
      tenant_id, organization_id, channel_id, conversation_id,
      actor_type, event_type, event_source, previous_state, new_state,
      description, metadata
    )
    select tenant_id, organization_id, channel_id, id,
           'system', 'sla_breached', 'queue', 'on_time', 'breached',
           'SLA vencido marcado de forma idempotente.',
           jsonb_build_object('escalatedToSupervision', escalate_to_supervision)
    from changed
    returning id
  )
  select count(*) into changed_count from changed;

  return changed_count;
end;
$function$
;

grant delete on table "public"."access_attempts" to "anon";

grant insert on table "public"."access_attempts" to "anon";

grant references on table "public"."access_attempts" to "anon";

grant select on table "public"."access_attempts" to "anon";

grant trigger on table "public"."access_attempts" to "anon";

grant truncate on table "public"."access_attempts" to "anon";

grant update on table "public"."access_attempts" to "anon";

grant delete on table "public"."access_attempts" to "authenticated";

grant insert on table "public"."access_attempts" to "authenticated";

grant references on table "public"."access_attempts" to "authenticated";

grant select on table "public"."access_attempts" to "authenticated";

grant trigger on table "public"."access_attempts" to "authenticated";

grant truncate on table "public"."access_attempts" to "authenticated";

grant update on table "public"."access_attempts" to "authenticated";

grant delete on table "public"."access_attempts" to "service_role";

grant insert on table "public"."access_attempts" to "service_role";

grant references on table "public"."access_attempts" to "service_role";

grant select on table "public"."access_attempts" to "service_role";

grant trigger on table "public"."access_attempts" to "service_role";

grant truncate on table "public"."access_attempts" to "service_role";

grant update on table "public"."access_attempts" to "service_role";

grant delete on table "public"."agent_automation_cooldown" to "anon";

grant insert on table "public"."agent_automation_cooldown" to "anon";

grant references on table "public"."agent_automation_cooldown" to "anon";

grant select on table "public"."agent_automation_cooldown" to "anon";

grant trigger on table "public"."agent_automation_cooldown" to "anon";

grant truncate on table "public"."agent_automation_cooldown" to "anon";

grant update on table "public"."agent_automation_cooldown" to "anon";

grant delete on table "public"."agent_automation_cooldown" to "authenticated";

grant insert on table "public"."agent_automation_cooldown" to "authenticated";

grant references on table "public"."agent_automation_cooldown" to "authenticated";

grant select on table "public"."agent_automation_cooldown" to "authenticated";

grant trigger on table "public"."agent_automation_cooldown" to "authenticated";

grant truncate on table "public"."agent_automation_cooldown" to "authenticated";

grant update on table "public"."agent_automation_cooldown" to "authenticated";

grant delete on table "public"."agent_automation_cooldown" to "service_role";

grant insert on table "public"."agent_automation_cooldown" to "service_role";

grant references on table "public"."agent_automation_cooldown" to "service_role";

grant select on table "public"."agent_automation_cooldown" to "service_role";

grant trigger on table "public"."agent_automation_cooldown" to "service_role";

grant truncate on table "public"."agent_automation_cooldown" to "service_role";

grant update on table "public"."agent_automation_cooldown" to "service_role";

grant delete on table "public"."agent_automation_jobs" to "anon";

grant insert on table "public"."agent_automation_jobs" to "anon";

grant references on table "public"."agent_automation_jobs" to "anon";

grant select on table "public"."agent_automation_jobs" to "anon";

grant trigger on table "public"."agent_automation_jobs" to "anon";

grant truncate on table "public"."agent_automation_jobs" to "anon";

grant update on table "public"."agent_automation_jobs" to "anon";

grant delete on table "public"."agent_automation_jobs" to "authenticated";

grant insert on table "public"."agent_automation_jobs" to "authenticated";

grant references on table "public"."agent_automation_jobs" to "authenticated";

grant select on table "public"."agent_automation_jobs" to "authenticated";

grant trigger on table "public"."agent_automation_jobs" to "authenticated";

grant truncate on table "public"."agent_automation_jobs" to "authenticated";

grant update on table "public"."agent_automation_jobs" to "authenticated";

grant delete on table "public"."agent_automation_jobs" to "service_role";

grant insert on table "public"."agent_automation_jobs" to "service_role";

grant references on table "public"."agent_automation_jobs" to "service_role";

grant select on table "public"."agent_automation_jobs" to "service_role";

grant trigger on table "public"."agent_automation_jobs" to "service_role";

grant truncate on table "public"."agent_automation_jobs" to "service_role";

grant update on table "public"."agent_automation_jobs" to "service_role";

grant delete on table "public"."agent_catalog_products" to "anon";

grant insert on table "public"."agent_catalog_products" to "anon";

grant references on table "public"."agent_catalog_products" to "anon";

grant select on table "public"."agent_catalog_products" to "anon";

grant trigger on table "public"."agent_catalog_products" to "anon";

grant truncate on table "public"."agent_catalog_products" to "anon";

grant update on table "public"."agent_catalog_products" to "anon";

grant delete on table "public"."agent_catalog_products" to "authenticated";

grant insert on table "public"."agent_catalog_products" to "authenticated";

grant references on table "public"."agent_catalog_products" to "authenticated";

grant select on table "public"."agent_catalog_products" to "authenticated";

grant trigger on table "public"."agent_catalog_products" to "authenticated";

grant truncate on table "public"."agent_catalog_products" to "authenticated";

grant update on table "public"."agent_catalog_products" to "authenticated";

grant delete on table "public"."agent_catalog_products" to "service_role";

grant insert on table "public"."agent_catalog_products" to "service_role";

grant references on table "public"."agent_catalog_products" to "service_role";

grant select on table "public"."agent_catalog_products" to "service_role";

grant trigger on table "public"."agent_catalog_products" to "service_role";

grant truncate on table "public"."agent_catalog_products" to "service_role";

grant update on table "public"."agent_catalog_products" to "service_role";

grant delete on table "public"."agent_connector_types" to "anon";

grant insert on table "public"."agent_connector_types" to "anon";

grant references on table "public"."agent_connector_types" to "anon";

grant select on table "public"."agent_connector_types" to "anon";

grant trigger on table "public"."agent_connector_types" to "anon";

grant truncate on table "public"."agent_connector_types" to "anon";

grant update on table "public"."agent_connector_types" to "anon";

grant delete on table "public"."agent_connector_types" to "authenticated";

grant insert on table "public"."agent_connector_types" to "authenticated";

grant references on table "public"."agent_connector_types" to "authenticated";

grant select on table "public"."agent_connector_types" to "authenticated";

grant trigger on table "public"."agent_connector_types" to "authenticated";

grant truncate on table "public"."agent_connector_types" to "authenticated";

grant update on table "public"."agent_connector_types" to "authenticated";

grant delete on table "public"."agent_connector_types" to "service_role";

grant insert on table "public"."agent_connector_types" to "service_role";

grant references on table "public"."agent_connector_types" to "service_role";

grant select on table "public"."agent_connector_types" to "service_role";

grant trigger on table "public"."agent_connector_types" to "service_role";

grant truncate on table "public"."agent_connector_types" to "service_role";

grant update on table "public"."agent_connector_types" to "service_role";

grant delete on table "public"."agent_dialog_templates" to "anon";

grant insert on table "public"."agent_dialog_templates" to "anon";

grant references on table "public"."agent_dialog_templates" to "anon";

grant select on table "public"."agent_dialog_templates" to "anon";

grant trigger on table "public"."agent_dialog_templates" to "anon";

grant truncate on table "public"."agent_dialog_templates" to "anon";

grant update on table "public"."agent_dialog_templates" to "anon";

grant delete on table "public"."agent_dialog_templates" to "authenticated";

grant insert on table "public"."agent_dialog_templates" to "authenticated";

grant references on table "public"."agent_dialog_templates" to "authenticated";

grant select on table "public"."agent_dialog_templates" to "authenticated";

grant trigger on table "public"."agent_dialog_templates" to "authenticated";

grant truncate on table "public"."agent_dialog_templates" to "authenticated";

grant update on table "public"."agent_dialog_templates" to "authenticated";

grant delete on table "public"."agent_dialog_templates" to "service_role";

grant insert on table "public"."agent_dialog_templates" to "service_role";

grant references on table "public"."agent_dialog_templates" to "service_role";

grant select on table "public"."agent_dialog_templates" to "service_role";

grant trigger on table "public"."agent_dialog_templates" to "service_role";

grant truncate on table "public"."agent_dialog_templates" to "service_role";

grant update on table "public"."agent_dialog_templates" to "service_role";

grant delete on table "public"."agent_installations" to "anon";

grant insert on table "public"."agent_installations" to "anon";

grant references on table "public"."agent_installations" to "anon";

grant select on table "public"."agent_installations" to "anon";

grant trigger on table "public"."agent_installations" to "anon";

grant truncate on table "public"."agent_installations" to "anon";

grant update on table "public"."agent_installations" to "anon";

grant delete on table "public"."agent_installations" to "authenticated";

grant insert on table "public"."agent_installations" to "authenticated";

grant references on table "public"."agent_installations" to "authenticated";

grant select on table "public"."agent_installations" to "authenticated";

grant trigger on table "public"."agent_installations" to "authenticated";

grant truncate on table "public"."agent_installations" to "authenticated";

grant update on table "public"."agent_installations" to "authenticated";

grant delete on table "public"."agent_installations" to "service_role";

grant insert on table "public"."agent_installations" to "service_role";

grant references on table "public"."agent_installations" to "service_role";

grant select on table "public"."agent_installations" to "service_role";

grant trigger on table "public"."agent_installations" to "service_role";

grant truncate on table "public"."agent_installations" to "service_role";

grant update on table "public"."agent_installations" to "service_role";

grant delete on table "public"."agent_presence" to "anon";

grant insert on table "public"."agent_presence" to "anon";

grant references on table "public"."agent_presence" to "anon";

grant select on table "public"."agent_presence" to "anon";

grant trigger on table "public"."agent_presence" to "anon";

grant truncate on table "public"."agent_presence" to "anon";

grant update on table "public"."agent_presence" to "anon";

grant delete on table "public"."agent_presence" to "authenticated";

grant insert on table "public"."agent_presence" to "authenticated";

grant references on table "public"."agent_presence" to "authenticated";

grant select on table "public"."agent_presence" to "authenticated";

grant trigger on table "public"."agent_presence" to "authenticated";

grant truncate on table "public"."agent_presence" to "authenticated";

grant update on table "public"."agent_presence" to "authenticated";

grant delete on table "public"."agent_presence" to "service_role";

grant insert on table "public"."agent_presence" to "service_role";

grant references on table "public"."agent_presence" to "service_role";

grant select on table "public"."agent_presence" to "service_role";

grant trigger on table "public"."agent_presence" to "service_role";

grant truncate on table "public"."agent_presence" to "service_role";

grant update on table "public"."agent_presence" to "service_role";

grant delete on table "public"."agent_sync_runs" to "anon";

grant insert on table "public"."agent_sync_runs" to "anon";

grant references on table "public"."agent_sync_runs" to "anon";

grant select on table "public"."agent_sync_runs" to "anon";

grant trigger on table "public"."agent_sync_runs" to "anon";

grant truncate on table "public"."agent_sync_runs" to "anon";

grant update on table "public"."agent_sync_runs" to "anon";

grant delete on table "public"."agent_sync_runs" to "authenticated";

grant insert on table "public"."agent_sync_runs" to "authenticated";

grant references on table "public"."agent_sync_runs" to "authenticated";

grant select on table "public"."agent_sync_runs" to "authenticated";

grant trigger on table "public"."agent_sync_runs" to "authenticated";

grant truncate on table "public"."agent_sync_runs" to "authenticated";

grant update on table "public"."agent_sync_runs" to "authenticated";

grant delete on table "public"."agent_sync_runs" to "service_role";

grant insert on table "public"."agent_sync_runs" to "service_role";

grant references on table "public"."agent_sync_runs" to "service_role";

grant select on table "public"."agent_sync_runs" to "service_role";

grant trigger on table "public"."agent_sync_runs" to "service_role";

grant truncate on table "public"."agent_sync_runs" to "service_role";

grant update on table "public"."agent_sync_runs" to "service_role";

grant delete on table "public"."ai_conversation_summaries" to "anon";

grant insert on table "public"."ai_conversation_summaries" to "anon";

grant references on table "public"."ai_conversation_summaries" to "anon";

grant select on table "public"."ai_conversation_summaries" to "anon";

grant trigger on table "public"."ai_conversation_summaries" to "anon";

grant truncate on table "public"."ai_conversation_summaries" to "anon";

grant update on table "public"."ai_conversation_summaries" to "anon";

grant delete on table "public"."ai_conversation_summaries" to "authenticated";

grant insert on table "public"."ai_conversation_summaries" to "authenticated";

grant references on table "public"."ai_conversation_summaries" to "authenticated";

grant select on table "public"."ai_conversation_summaries" to "authenticated";

grant trigger on table "public"."ai_conversation_summaries" to "authenticated";

grant truncate on table "public"."ai_conversation_summaries" to "authenticated";

grant update on table "public"."ai_conversation_summaries" to "authenticated";

grant delete on table "public"."ai_conversation_summaries" to "service_role";

grant insert on table "public"."ai_conversation_summaries" to "service_role";

grant references on table "public"."ai_conversation_summaries" to "service_role";

grant select on table "public"."ai_conversation_summaries" to "service_role";

grant trigger on table "public"."ai_conversation_summaries" to "service_role";

grant truncate on table "public"."ai_conversation_summaries" to "service_role";

grant update on table "public"."ai_conversation_summaries" to "service_role";

grant delete on table "public"."ai_extracted_customer_data" to "anon";

grant insert on table "public"."ai_extracted_customer_data" to "anon";

grant references on table "public"."ai_extracted_customer_data" to "anon";

grant select on table "public"."ai_extracted_customer_data" to "anon";

grant trigger on table "public"."ai_extracted_customer_data" to "anon";

grant truncate on table "public"."ai_extracted_customer_data" to "anon";

grant update on table "public"."ai_extracted_customer_data" to "anon";

grant delete on table "public"."ai_extracted_customer_data" to "authenticated";

grant insert on table "public"."ai_extracted_customer_data" to "authenticated";

grant references on table "public"."ai_extracted_customer_data" to "authenticated";

grant select on table "public"."ai_extracted_customer_data" to "authenticated";

grant trigger on table "public"."ai_extracted_customer_data" to "authenticated";

grant truncate on table "public"."ai_extracted_customer_data" to "authenticated";

grant update on table "public"."ai_extracted_customer_data" to "authenticated";

grant delete on table "public"."ai_extracted_customer_data" to "service_role";

grant insert on table "public"."ai_extracted_customer_data" to "service_role";

grant references on table "public"."ai_extracted_customer_data" to "service_role";

grant select on table "public"."ai_extracted_customer_data" to "service_role";

grant trigger on table "public"."ai_extracted_customer_data" to "service_role";

grant truncate on table "public"."ai_extracted_customer_data" to "service_role";

grant update on table "public"."ai_extracted_customer_data" to "service_role";

grant delete on table "public"."ai_lead_scores" to "anon";

grant insert on table "public"."ai_lead_scores" to "anon";

grant references on table "public"."ai_lead_scores" to "anon";

grant select on table "public"."ai_lead_scores" to "anon";

grant trigger on table "public"."ai_lead_scores" to "anon";

grant truncate on table "public"."ai_lead_scores" to "anon";

grant update on table "public"."ai_lead_scores" to "anon";

grant delete on table "public"."ai_lead_scores" to "authenticated";

grant insert on table "public"."ai_lead_scores" to "authenticated";

grant references on table "public"."ai_lead_scores" to "authenticated";

grant select on table "public"."ai_lead_scores" to "authenticated";

grant trigger on table "public"."ai_lead_scores" to "authenticated";

grant truncate on table "public"."ai_lead_scores" to "authenticated";

grant update on table "public"."ai_lead_scores" to "authenticated";

grant delete on table "public"."ai_lead_scores" to "service_role";

grant insert on table "public"."ai_lead_scores" to "service_role";

grant references on table "public"."ai_lead_scores" to "service_role";

grant select on table "public"."ai_lead_scores" to "service_role";

grant trigger on table "public"."ai_lead_scores" to "service_role";

grant truncate on table "public"."ai_lead_scores" to "service_role";

grant update on table "public"."ai_lead_scores" to "service_role";

grant delete on table "public"."ai_objections" to "anon";

grant insert on table "public"."ai_objections" to "anon";

grant references on table "public"."ai_objections" to "anon";

grant select on table "public"."ai_objections" to "anon";

grant trigger on table "public"."ai_objections" to "anon";

grant truncate on table "public"."ai_objections" to "anon";

grant update on table "public"."ai_objections" to "anon";

grant delete on table "public"."ai_objections" to "authenticated";

grant insert on table "public"."ai_objections" to "authenticated";

grant references on table "public"."ai_objections" to "authenticated";

grant select on table "public"."ai_objections" to "authenticated";

grant trigger on table "public"."ai_objections" to "authenticated";

grant truncate on table "public"."ai_objections" to "authenticated";

grant update on table "public"."ai_objections" to "authenticated";

grant delete on table "public"."ai_objections" to "service_role";

grant insert on table "public"."ai_objections" to "service_role";

grant references on table "public"."ai_objections" to "service_role";

grant select on table "public"."ai_objections" to "service_role";

grant trigger on table "public"."ai_objections" to "service_role";

grant truncate on table "public"."ai_objections" to "service_role";

grant update on table "public"."ai_objections" to "service_role";

grant delete on table "public"."ai_prompt_templates" to "anon";

grant insert on table "public"."ai_prompt_templates" to "anon";

grant references on table "public"."ai_prompt_templates" to "anon";

grant select on table "public"."ai_prompt_templates" to "anon";

grant trigger on table "public"."ai_prompt_templates" to "anon";

grant truncate on table "public"."ai_prompt_templates" to "anon";

grant update on table "public"."ai_prompt_templates" to "anon";

grant delete on table "public"."ai_prompt_templates" to "authenticated";

grant insert on table "public"."ai_prompt_templates" to "authenticated";

grant references on table "public"."ai_prompt_templates" to "authenticated";

grant select on table "public"."ai_prompt_templates" to "authenticated";

grant trigger on table "public"."ai_prompt_templates" to "authenticated";

grant truncate on table "public"."ai_prompt_templates" to "authenticated";

grant update on table "public"."ai_prompt_templates" to "authenticated";

grant delete on table "public"."ai_prompt_templates" to "service_role";

grant insert on table "public"."ai_prompt_templates" to "service_role";

grant references on table "public"."ai_prompt_templates" to "service_role";

grant select on table "public"."ai_prompt_templates" to "service_role";

grant trigger on table "public"."ai_prompt_templates" to "service_role";

grant truncate on table "public"."ai_prompt_templates" to "service_role";

grant update on table "public"."ai_prompt_templates" to "service_role";

grant delete on table "public"."ai_reply_suggestions" to "anon";

grant insert on table "public"."ai_reply_suggestions" to "anon";

grant references on table "public"."ai_reply_suggestions" to "anon";

grant select on table "public"."ai_reply_suggestions" to "anon";

grant trigger on table "public"."ai_reply_suggestions" to "anon";

grant truncate on table "public"."ai_reply_suggestions" to "anon";

grant update on table "public"."ai_reply_suggestions" to "anon";

grant delete on table "public"."ai_reply_suggestions" to "authenticated";

grant insert on table "public"."ai_reply_suggestions" to "authenticated";

grant references on table "public"."ai_reply_suggestions" to "authenticated";

grant select on table "public"."ai_reply_suggestions" to "authenticated";

grant trigger on table "public"."ai_reply_suggestions" to "authenticated";

grant truncate on table "public"."ai_reply_suggestions" to "authenticated";

grant update on table "public"."ai_reply_suggestions" to "authenticated";

grant delete on table "public"."ai_reply_suggestions" to "service_role";

grant insert on table "public"."ai_reply_suggestions" to "service_role";

grant references on table "public"."ai_reply_suggestions" to "service_role";

grant select on table "public"."ai_reply_suggestions" to "service_role";

grant trigger on table "public"."ai_reply_suggestions" to "service_role";

grant truncate on table "public"."ai_reply_suggestions" to "service_role";

grant update on table "public"."ai_reply_suggestions" to "service_role";

grant delete on table "public"."ai_response_logs" to "anon";

grant insert on table "public"."ai_response_logs" to "anon";

grant references on table "public"."ai_response_logs" to "anon";

grant select on table "public"."ai_response_logs" to "anon";

grant trigger on table "public"."ai_response_logs" to "anon";

grant truncate on table "public"."ai_response_logs" to "anon";

grant update on table "public"."ai_response_logs" to "anon";

grant delete on table "public"."ai_response_logs" to "authenticated";

grant insert on table "public"."ai_response_logs" to "authenticated";

grant references on table "public"."ai_response_logs" to "authenticated";

grant select on table "public"."ai_response_logs" to "authenticated";

grant trigger on table "public"."ai_response_logs" to "authenticated";

grant truncate on table "public"."ai_response_logs" to "authenticated";

grant update on table "public"."ai_response_logs" to "authenticated";

grant delete on table "public"."ai_runs" to "anon";

grant insert on table "public"."ai_runs" to "anon";

grant references on table "public"."ai_runs" to "anon";

grant select on table "public"."ai_runs" to "anon";

grant trigger on table "public"."ai_runs" to "anon";

grant truncate on table "public"."ai_runs" to "anon";

grant update on table "public"."ai_runs" to "anon";

grant delete on table "public"."ai_runs" to "authenticated";

grant insert on table "public"."ai_runs" to "authenticated";

grant references on table "public"."ai_runs" to "authenticated";

grant select on table "public"."ai_runs" to "authenticated";

grant trigger on table "public"."ai_runs" to "authenticated";

grant truncate on table "public"."ai_runs" to "authenticated";

grant update on table "public"."ai_runs" to "authenticated";

grant delete on table "public"."ai_runs" to "service_role";

grant insert on table "public"."ai_runs" to "service_role";

grant references on table "public"."ai_runs" to "service_role";

grant select on table "public"."ai_runs" to "service_role";

grant trigger on table "public"."ai_runs" to "service_role";

grant truncate on table "public"."ai_runs" to "service_role";

grant update on table "public"."ai_runs" to "service_role";

grant delete on table "public"."api_tokens" to "anon";

grant insert on table "public"."api_tokens" to "anon";

grant references on table "public"."api_tokens" to "anon";

grant select on table "public"."api_tokens" to "anon";

grant trigger on table "public"."api_tokens" to "anon";

grant truncate on table "public"."api_tokens" to "anon";

grant update on table "public"."api_tokens" to "anon";

grant delete on table "public"."api_tokens" to "authenticated";

grant insert on table "public"."api_tokens" to "authenticated";

grant references on table "public"."api_tokens" to "authenticated";

grant select on table "public"."api_tokens" to "authenticated";

grant trigger on table "public"."api_tokens" to "authenticated";

grant truncate on table "public"."api_tokens" to "authenticated";

grant update on table "public"."api_tokens" to "authenticated";

grant delete on table "public"."api_tokens" to "service_role";

grant insert on table "public"."api_tokens" to "service_role";

grant references on table "public"."api_tokens" to "service_role";

grant select on table "public"."api_tokens" to "service_role";

grant trigger on table "public"."api_tokens" to "service_role";

grant truncate on table "public"."api_tokens" to "service_role";

grant update on table "public"."api_tokens" to "service_role";

grant delete on table "public"."app_permissions" to "anon";

grant insert on table "public"."app_permissions" to "anon";

grant references on table "public"."app_permissions" to "anon";

grant select on table "public"."app_permissions" to "anon";

grant trigger on table "public"."app_permissions" to "anon";

grant truncate on table "public"."app_permissions" to "anon";

grant update on table "public"."app_permissions" to "anon";

grant delete on table "public"."app_permissions" to "authenticated";

grant insert on table "public"."app_permissions" to "authenticated";

grant references on table "public"."app_permissions" to "authenticated";

grant select on table "public"."app_permissions" to "authenticated";

grant trigger on table "public"."app_permissions" to "authenticated";

grant truncate on table "public"."app_permissions" to "authenticated";

grant update on table "public"."app_permissions" to "authenticated";

grant delete on table "public"."app_permissions" to "service_role";

grant insert on table "public"."app_permissions" to "service_role";

grant references on table "public"."app_permissions" to "service_role";

grant select on table "public"."app_permissions" to "service_role";

grant trigger on table "public"."app_permissions" to "service_role";

grant truncate on table "public"."app_permissions" to "service_role";

grant update on table "public"."app_permissions" to "service_role";

grant delete on table "public"."app_settings" to "anon";

grant insert on table "public"."app_settings" to "anon";

grant references on table "public"."app_settings" to "anon";

grant select on table "public"."app_settings" to "anon";

grant trigger on table "public"."app_settings" to "anon";

grant truncate on table "public"."app_settings" to "anon";

grant update on table "public"."app_settings" to "anon";

grant delete on table "public"."app_settings" to "authenticated";

grant insert on table "public"."app_settings" to "authenticated";

grant references on table "public"."app_settings" to "authenticated";

grant select on table "public"."app_settings" to "authenticated";

grant trigger on table "public"."app_settings" to "authenticated";

grant truncate on table "public"."app_settings" to "authenticated";

grant update on table "public"."app_settings" to "authenticated";

grant delete on table "public"."app_settings" to "service_role";

grant insert on table "public"."app_settings" to "service_role";

grant references on table "public"."app_settings" to "service_role";

grant select on table "public"."app_settings" to "service_role";

grant trigger on table "public"."app_settings" to "service_role";

grant truncate on table "public"."app_settings" to "service_role";

grant update on table "public"."app_settings" to "service_role";

grant delete on table "public"."app_user_permissions" to "anon";

grant insert on table "public"."app_user_permissions" to "anon";

grant references on table "public"."app_user_permissions" to "anon";

grant select on table "public"."app_user_permissions" to "anon";

grant trigger on table "public"."app_user_permissions" to "anon";

grant truncate on table "public"."app_user_permissions" to "anon";

grant update on table "public"."app_user_permissions" to "anon";

grant delete on table "public"."app_user_permissions" to "authenticated";

grant insert on table "public"."app_user_permissions" to "authenticated";

grant references on table "public"."app_user_permissions" to "authenticated";

grant select on table "public"."app_user_permissions" to "authenticated";

grant trigger on table "public"."app_user_permissions" to "authenticated";

grant truncate on table "public"."app_user_permissions" to "authenticated";

grant update on table "public"."app_user_permissions" to "authenticated";

grant delete on table "public"."app_user_permissions" to "service_role";

grant insert on table "public"."app_user_permissions" to "service_role";

grant references on table "public"."app_user_permissions" to "service_role";

grant select on table "public"."app_user_permissions" to "service_role";

grant trigger on table "public"."app_user_permissions" to "service_role";

grant truncate on table "public"."app_user_permissions" to "service_role";

grant update on table "public"."app_user_permissions" to "service_role";

grant delete on table "public"."app_users" to "anon";

grant insert on table "public"."app_users" to "anon";

grant select on table "public"."app_users" to "anon";

grant update on table "public"."app_users" to "anon";

grant delete on table "public"."app_users" to "authenticated";

grant insert on table "public"."app_users" to "authenticated";

grant select on table "public"."app_users" to "authenticated";

grant update on table "public"."app_users" to "authenticated";

grant delete on table "public"."app_users" to "service_role";

grant insert on table "public"."app_users" to "service_role";

grant select on table "public"."app_users" to "service_role";

grant update on table "public"."app_users" to "service_role";

grant delete on table "public"."application_logs" to "anon";

grant insert on table "public"."application_logs" to "anon";

grant references on table "public"."application_logs" to "anon";

grant select on table "public"."application_logs" to "anon";

grant trigger on table "public"."application_logs" to "anon";

grant truncate on table "public"."application_logs" to "anon";

grant update on table "public"."application_logs" to "anon";

grant delete on table "public"."application_logs" to "authenticated";

grant insert on table "public"."application_logs" to "authenticated";

grant references on table "public"."application_logs" to "authenticated";

grant select on table "public"."application_logs" to "authenticated";

grant trigger on table "public"."application_logs" to "authenticated";

grant truncate on table "public"."application_logs" to "authenticated";

grant update on table "public"."application_logs" to "authenticated";

grant delete on table "public"."application_logs" to "service_role";

grant insert on table "public"."application_logs" to "service_role";

grant references on table "public"."application_logs" to "service_role";

grant select on table "public"."application_logs" to "service_role";

grant trigger on table "public"."application_logs" to "service_role";

grant truncate on table "public"."application_logs" to "service_role";

grant update on table "public"."application_logs" to "service_role";

grant delete on table "public"."audit_logs" to "anon";

grant insert on table "public"."audit_logs" to "anon";

grant select on table "public"."audit_logs" to "anon";

grant update on table "public"."audit_logs" to "anon";

grant delete on table "public"."audit_logs" to "authenticated";

grant insert on table "public"."audit_logs" to "authenticated";

grant select on table "public"."audit_logs" to "authenticated";

grant update on table "public"."audit_logs" to "authenticated";

grant delete on table "public"."audit_logs" to "service_role";

grant insert on table "public"."audit_logs" to "service_role";

grant select on table "public"."audit_logs" to "service_role";

grant update on table "public"."audit_logs" to "service_role";

grant delete on table "public"."audit_trail" to "anon";

grant insert on table "public"."audit_trail" to "anon";

grant references on table "public"."audit_trail" to "anon";

grant select on table "public"."audit_trail" to "anon";

grant trigger on table "public"."audit_trail" to "anon";

grant truncate on table "public"."audit_trail" to "anon";

grant update on table "public"."audit_trail" to "anon";

grant delete on table "public"."audit_trail" to "authenticated";

grant insert on table "public"."audit_trail" to "authenticated";

grant references on table "public"."audit_trail" to "authenticated";

grant select on table "public"."audit_trail" to "authenticated";

grant trigger on table "public"."audit_trail" to "authenticated";

grant truncate on table "public"."audit_trail" to "authenticated";

grant update on table "public"."audit_trail" to "authenticated";

grant delete on table "public"."audit_trail" to "service_role";

grant insert on table "public"."audit_trail" to "service_role";

grant references on table "public"."audit_trail" to "service_role";

grant select on table "public"."audit_trail" to "service_role";

grant trigger on table "public"."audit_trail" to "service_role";

grant truncate on table "public"."audit_trail" to "service_role";

grant update on table "public"."audit_trail" to "service_role";

grant delete on table "public"."automation_action_logs" to "anon";

grant insert on table "public"."automation_action_logs" to "anon";

grant references on table "public"."automation_action_logs" to "anon";

grant select on table "public"."automation_action_logs" to "anon";

grant trigger on table "public"."automation_action_logs" to "anon";

grant truncate on table "public"."automation_action_logs" to "anon";

grant update on table "public"."automation_action_logs" to "anon";

grant delete on table "public"."automation_action_logs" to "authenticated";

grant insert on table "public"."automation_action_logs" to "authenticated";

grant references on table "public"."automation_action_logs" to "authenticated";

grant select on table "public"."automation_action_logs" to "authenticated";

grant trigger on table "public"."automation_action_logs" to "authenticated";

grant truncate on table "public"."automation_action_logs" to "authenticated";

grant update on table "public"."automation_action_logs" to "authenticated";

grant delete on table "public"."automation_action_logs" to "service_role";

grant insert on table "public"."automation_action_logs" to "service_role";

grant references on table "public"."automation_action_logs" to "service_role";

grant select on table "public"."automation_action_logs" to "service_role";

grant trigger on table "public"."automation_action_logs" to "service_role";

grant truncate on table "public"."automation_action_logs" to "service_role";

grant update on table "public"."automation_action_logs" to "service_role";

grant delete on table "public"."automation_actions" to "anon";

grant insert on table "public"."automation_actions" to "anon";

grant references on table "public"."automation_actions" to "anon";

grant select on table "public"."automation_actions" to "anon";

grant trigger on table "public"."automation_actions" to "anon";

grant truncate on table "public"."automation_actions" to "anon";

grant update on table "public"."automation_actions" to "anon";

grant delete on table "public"."automation_actions" to "authenticated";

grant insert on table "public"."automation_actions" to "authenticated";

grant references on table "public"."automation_actions" to "authenticated";

grant select on table "public"."automation_actions" to "authenticated";

grant trigger on table "public"."automation_actions" to "authenticated";

grant truncate on table "public"."automation_actions" to "authenticated";

grant update on table "public"."automation_actions" to "authenticated";

grant delete on table "public"."automation_actions" to "service_role";

grant insert on table "public"."automation_actions" to "service_role";

grant references on table "public"."automation_actions" to "service_role";

grant select on table "public"."automation_actions" to "service_role";

grant trigger on table "public"."automation_actions" to "service_role";

grant truncate on table "public"."automation_actions" to "service_role";

grant update on table "public"."automation_actions" to "service_role";

grant delete on table "public"."automation_cooldowns" to "anon";

grant insert on table "public"."automation_cooldowns" to "anon";

grant references on table "public"."automation_cooldowns" to "anon";

grant select on table "public"."automation_cooldowns" to "anon";

grant trigger on table "public"."automation_cooldowns" to "anon";

grant truncate on table "public"."automation_cooldowns" to "anon";

grant update on table "public"."automation_cooldowns" to "anon";

grant delete on table "public"."automation_cooldowns" to "authenticated";

grant insert on table "public"."automation_cooldowns" to "authenticated";

grant references on table "public"."automation_cooldowns" to "authenticated";

grant select on table "public"."automation_cooldowns" to "authenticated";

grant trigger on table "public"."automation_cooldowns" to "authenticated";

grant truncate on table "public"."automation_cooldowns" to "authenticated";

grant update on table "public"."automation_cooldowns" to "authenticated";

grant delete on table "public"."automation_cooldowns" to "service_role";

grant insert on table "public"."automation_cooldowns" to "service_role";

grant references on table "public"."automation_cooldowns" to "service_role";

grant select on table "public"."automation_cooldowns" to "service_role";

grant trigger on table "public"."automation_cooldowns" to "service_role";

grant truncate on table "public"."automation_cooldowns" to "service_role";

grant update on table "public"."automation_cooldowns" to "service_role";

grant delete on table "public"."automation_flows" to "anon";

grant insert on table "public"."automation_flows" to "anon";

grant references on table "public"."automation_flows" to "anon";

grant select on table "public"."automation_flows" to "anon";

grant trigger on table "public"."automation_flows" to "anon";

grant truncate on table "public"."automation_flows" to "anon";

grant update on table "public"."automation_flows" to "anon";

grant delete on table "public"."automation_flows" to "authenticated";

grant insert on table "public"."automation_flows" to "authenticated";

grant references on table "public"."automation_flows" to "authenticated";

grant select on table "public"."automation_flows" to "authenticated";

grant trigger on table "public"."automation_flows" to "authenticated";

grant truncate on table "public"."automation_flows" to "authenticated";

grant update on table "public"."automation_flows" to "authenticated";

grant delete on table "public"."automation_flows" to "service_role";

grant insert on table "public"."automation_flows" to "service_role";

grant references on table "public"."automation_flows" to "service_role";

grant select on table "public"."automation_flows" to "service_role";

grant trigger on table "public"."automation_flows" to "service_role";

grant truncate on table "public"."automation_flows" to "service_role";

grant update on table "public"."automation_flows" to "service_role";

grant delete on table "public"."automation_runs" to "anon";

grant insert on table "public"."automation_runs" to "anon";

grant references on table "public"."automation_runs" to "anon";

grant select on table "public"."automation_runs" to "anon";

grant trigger on table "public"."automation_runs" to "anon";

grant truncate on table "public"."automation_runs" to "anon";

grant update on table "public"."automation_runs" to "anon";

grant delete on table "public"."automation_runs" to "authenticated";

grant insert on table "public"."automation_runs" to "authenticated";

grant references on table "public"."automation_runs" to "authenticated";

grant select on table "public"."automation_runs" to "authenticated";

grant trigger on table "public"."automation_runs" to "authenticated";

grant truncate on table "public"."automation_runs" to "authenticated";

grant update on table "public"."automation_runs" to "authenticated";

grant delete on table "public"."automation_runs" to "service_role";

grant insert on table "public"."automation_runs" to "service_role";

grant references on table "public"."automation_runs" to "service_role";

grant select on table "public"."automation_runs" to "service_role";

grant trigger on table "public"."automation_runs" to "service_role";

grant truncate on table "public"."automation_runs" to "service_role";

grant update on table "public"."automation_runs" to "service_role";

grant delete on table "public"."automation_triggers" to "anon";

grant insert on table "public"."automation_triggers" to "anon";

grant references on table "public"."automation_triggers" to "anon";

grant select on table "public"."automation_triggers" to "anon";

grant trigger on table "public"."automation_triggers" to "anon";

grant truncate on table "public"."automation_triggers" to "anon";

grant update on table "public"."automation_triggers" to "anon";

grant delete on table "public"."automation_triggers" to "authenticated";

grant insert on table "public"."automation_triggers" to "authenticated";

grant references on table "public"."automation_triggers" to "authenticated";

grant select on table "public"."automation_triggers" to "authenticated";

grant trigger on table "public"."automation_triggers" to "authenticated";

grant truncate on table "public"."automation_triggers" to "authenticated";

grant update on table "public"."automation_triggers" to "authenticated";

grant delete on table "public"."automation_triggers" to "service_role";

grant insert on table "public"."automation_triggers" to "service_role";

grant references on table "public"."automation_triggers" to "service_role";

grant select on table "public"."automation_triggers" to "service_role";

grant trigger on table "public"."automation_triggers" to "service_role";

grant truncate on table "public"."automation_triggers" to "service_role";

grant update on table "public"."automation_triggers" to "service_role";

grant delete on table "public"."backup_configs" to "anon";

grant insert on table "public"."backup_configs" to "anon";

grant references on table "public"."backup_configs" to "anon";

grant select on table "public"."backup_configs" to "anon";

grant trigger on table "public"."backup_configs" to "anon";

grant truncate on table "public"."backup_configs" to "anon";

grant update on table "public"."backup_configs" to "anon";

grant delete on table "public"."backup_configs" to "authenticated";

grant insert on table "public"."backup_configs" to "authenticated";

grant references on table "public"."backup_configs" to "authenticated";

grant select on table "public"."backup_configs" to "authenticated";

grant trigger on table "public"."backup_configs" to "authenticated";

grant truncate on table "public"."backup_configs" to "authenticated";

grant update on table "public"."backup_configs" to "authenticated";

grant delete on table "public"."backup_configs" to "service_role";

grant insert on table "public"."backup_configs" to "service_role";

grant references on table "public"."backup_configs" to "service_role";

grant select on table "public"."backup_configs" to "service_role";

grant trigger on table "public"."backup_configs" to "service_role";

grant truncate on table "public"."backup_configs" to "service_role";

grant update on table "public"."backup_configs" to "service_role";

grant delete on table "public"."backup_runs" to "anon";

grant insert on table "public"."backup_runs" to "anon";

grant references on table "public"."backup_runs" to "anon";

grant select on table "public"."backup_runs" to "anon";

grant trigger on table "public"."backup_runs" to "anon";

grant truncate on table "public"."backup_runs" to "anon";

grant update on table "public"."backup_runs" to "anon";

grant delete on table "public"."backup_runs" to "authenticated";

grant insert on table "public"."backup_runs" to "authenticated";

grant references on table "public"."backup_runs" to "authenticated";

grant select on table "public"."backup_runs" to "authenticated";

grant trigger on table "public"."backup_runs" to "authenticated";

grant truncate on table "public"."backup_runs" to "authenticated";

grant update on table "public"."backup_runs" to "authenticated";

grant delete on table "public"."backup_runs" to "service_role";

grant insert on table "public"."backup_runs" to "service_role";

grant references on table "public"."backup_runs" to "service_role";

grant select on table "public"."backup_runs" to "service_role";

grant trigger on table "public"."backup_runs" to "service_role";

grant truncate on table "public"."backup_runs" to "service_role";

grant update on table "public"."backup_runs" to "service_role";

grant delete on table "public"."billing_checkout_sessions" to "anon";

grant insert on table "public"."billing_checkout_sessions" to "anon";

grant references on table "public"."billing_checkout_sessions" to "anon";

grant select on table "public"."billing_checkout_sessions" to "anon";

grant trigger on table "public"."billing_checkout_sessions" to "anon";

grant truncate on table "public"."billing_checkout_sessions" to "anon";

grant update on table "public"."billing_checkout_sessions" to "anon";

grant delete on table "public"."billing_checkout_sessions" to "authenticated";

grant insert on table "public"."billing_checkout_sessions" to "authenticated";

grant references on table "public"."billing_checkout_sessions" to "authenticated";

grant select on table "public"."billing_checkout_sessions" to "authenticated";

grant trigger on table "public"."billing_checkout_sessions" to "authenticated";

grant truncate on table "public"."billing_checkout_sessions" to "authenticated";

grant update on table "public"."billing_checkout_sessions" to "authenticated";

grant delete on table "public"."billing_payment_method_rules" to "anon";

grant insert on table "public"."billing_payment_method_rules" to "anon";

grant select on table "public"."billing_payment_method_rules" to "anon";

grant update on table "public"."billing_payment_method_rules" to "anon";

grant delete on table "public"."billing_payment_method_rules" to "authenticated";

grant insert on table "public"."billing_payment_method_rules" to "authenticated";

grant select on table "public"."billing_payment_method_rules" to "authenticated";

grant update on table "public"."billing_payment_method_rules" to "authenticated";

grant delete on table "public"."billing_payment_method_rules" to "service_role";

grant insert on table "public"."billing_payment_method_rules" to "service_role";

grant select on table "public"."billing_payment_method_rules" to "service_role";

grant update on table "public"."billing_payment_method_rules" to "service_role";

grant delete on table "public"."billing_plan_price_rules" to "anon";

grant insert on table "public"."billing_plan_price_rules" to "anon";

grant references on table "public"."billing_plan_price_rules" to "anon";

grant select on table "public"."billing_plan_price_rules" to "anon";

grant trigger on table "public"."billing_plan_price_rules" to "anon";

grant truncate on table "public"."billing_plan_price_rules" to "anon";

grant update on table "public"."billing_plan_price_rules" to "anon";

grant delete on table "public"."billing_plan_price_rules" to "authenticated";

grant insert on table "public"."billing_plan_price_rules" to "authenticated";

grant references on table "public"."billing_plan_price_rules" to "authenticated";

grant select on table "public"."billing_plan_price_rules" to "authenticated";

grant trigger on table "public"."billing_plan_price_rules" to "authenticated";

grant truncate on table "public"."billing_plan_price_rules" to "authenticated";

grant update on table "public"."billing_plan_price_rules" to "authenticated";

grant delete on table "public"."billing_plan_price_rules" to "service_role";

grant insert on table "public"."billing_plan_price_rules" to "service_role";

grant references on table "public"."billing_plan_price_rules" to "service_role";

grant select on table "public"."billing_plan_price_rules" to "service_role";

grant trigger on table "public"."billing_plan_price_rules" to "service_role";

grant truncate on table "public"."billing_plan_price_rules" to "service_role";

grant update on table "public"."billing_plan_price_rules" to "service_role";

grant delete on table "public"."billing_subscriptions" to "anon";

grant insert on table "public"."billing_subscriptions" to "anon";

grant references on table "public"."billing_subscriptions" to "anon";

grant select on table "public"."billing_subscriptions" to "anon";

grant trigger on table "public"."billing_subscriptions" to "anon";

grant truncate on table "public"."billing_subscriptions" to "anon";

grant update on table "public"."billing_subscriptions" to "anon";

grant delete on table "public"."billing_subscriptions" to "authenticated";

grant insert on table "public"."billing_subscriptions" to "authenticated";

grant references on table "public"."billing_subscriptions" to "authenticated";

grant select on table "public"."billing_subscriptions" to "authenticated";

grant trigger on table "public"."billing_subscriptions" to "authenticated";

grant truncate on table "public"."billing_subscriptions" to "authenticated";

grant update on table "public"."billing_subscriptions" to "authenticated";

grant delete on table "public"."blocked_contacts" to "anon";

grant insert on table "public"."blocked_contacts" to "anon";

grant references on table "public"."blocked_contacts" to "anon";

grant select on table "public"."blocked_contacts" to "anon";

grant trigger on table "public"."blocked_contacts" to "anon";

grant truncate on table "public"."blocked_contacts" to "anon";

grant update on table "public"."blocked_contacts" to "anon";

grant delete on table "public"."blocked_contacts" to "authenticated";

grant insert on table "public"."blocked_contacts" to "authenticated";

grant references on table "public"."blocked_contacts" to "authenticated";

grant select on table "public"."blocked_contacts" to "authenticated";

grant trigger on table "public"."blocked_contacts" to "authenticated";

grant truncate on table "public"."blocked_contacts" to "authenticated";

grant update on table "public"."blocked_contacts" to "authenticated";

grant delete on table "public"."blocked_contacts" to "service_role";

grant insert on table "public"."blocked_contacts" to "service_role";

grant references on table "public"."blocked_contacts" to "service_role";

grant select on table "public"."blocked_contacts" to "service_role";

grant trigger on table "public"."blocked_contacts" to "service_role";

grant truncate on table "public"."blocked_contacts" to "service_role";

grant update on table "public"."blocked_contacts" to "service_role";

grant delete on table "public"."business_holidays" to "anon";

grant insert on table "public"."business_holidays" to "anon";

grant references on table "public"."business_holidays" to "anon";

grant select on table "public"."business_holidays" to "anon";

grant trigger on table "public"."business_holidays" to "anon";

grant truncate on table "public"."business_holidays" to "anon";

grant update on table "public"."business_holidays" to "anon";

grant delete on table "public"."business_holidays" to "authenticated";

grant insert on table "public"."business_holidays" to "authenticated";

grant references on table "public"."business_holidays" to "authenticated";

grant select on table "public"."business_holidays" to "authenticated";

grant trigger on table "public"."business_holidays" to "authenticated";

grant truncate on table "public"."business_holidays" to "authenticated";

grant update on table "public"."business_holidays" to "authenticated";

grant delete on table "public"."business_holidays" to "service_role";

grant insert on table "public"."business_holidays" to "service_role";

grant references on table "public"."business_holidays" to "service_role";

grant select on table "public"."business_holidays" to "service_role";

grant trigger on table "public"."business_holidays" to "service_role";

grant truncate on table "public"."business_holidays" to "service_role";

grant update on table "public"."business_holidays" to "service_role";

grant delete on table "public"."business_hours" to "anon";

grant insert on table "public"."business_hours" to "anon";

grant references on table "public"."business_hours" to "anon";

grant select on table "public"."business_hours" to "anon";

grant trigger on table "public"."business_hours" to "anon";

grant truncate on table "public"."business_hours" to "anon";

grant update on table "public"."business_hours" to "anon";

grant delete on table "public"."business_hours" to "authenticated";

grant insert on table "public"."business_hours" to "authenticated";

grant references on table "public"."business_hours" to "authenticated";

grant select on table "public"."business_hours" to "authenticated";

grant trigger on table "public"."business_hours" to "authenticated";

grant truncate on table "public"."business_hours" to "authenticated";

grant update on table "public"."business_hours" to "authenticated";

grant delete on table "public"."business_hours" to "service_role";

grant insert on table "public"."business_hours" to "service_role";

grant references on table "public"."business_hours" to "service_role";

grant select on table "public"."business_hours" to "service_role";

grant trigger on table "public"."business_hours" to "service_role";

grant truncate on table "public"."business_hours" to "service_role";

grant update on table "public"."business_hours" to "service_role";

grant delete on table "public"."calendar_event_participants" to "anon";

grant insert on table "public"."calendar_event_participants" to "anon";

grant references on table "public"."calendar_event_participants" to "anon";

grant select on table "public"."calendar_event_participants" to "anon";

grant trigger on table "public"."calendar_event_participants" to "anon";

grant truncate on table "public"."calendar_event_participants" to "anon";

grant update on table "public"."calendar_event_participants" to "anon";

grant delete on table "public"."calendar_event_participants" to "authenticated";

grant insert on table "public"."calendar_event_participants" to "authenticated";

grant references on table "public"."calendar_event_participants" to "authenticated";

grant select on table "public"."calendar_event_participants" to "authenticated";

grant trigger on table "public"."calendar_event_participants" to "authenticated";

grant truncate on table "public"."calendar_event_participants" to "authenticated";

grant update on table "public"."calendar_event_participants" to "authenticated";

grant delete on table "public"."calendar_event_participants" to "service_role";

grant insert on table "public"."calendar_event_participants" to "service_role";

grant references on table "public"."calendar_event_participants" to "service_role";

grant select on table "public"."calendar_event_participants" to "service_role";

grant trigger on table "public"."calendar_event_participants" to "service_role";

grant truncate on table "public"."calendar_event_participants" to "service_role";

grant update on table "public"."calendar_event_participants" to "service_role";

grant delete on table "public"."calendar_event_templates" to "anon";

grant insert on table "public"."calendar_event_templates" to "anon";

grant references on table "public"."calendar_event_templates" to "anon";

grant select on table "public"."calendar_event_templates" to "anon";

grant trigger on table "public"."calendar_event_templates" to "anon";

grant truncate on table "public"."calendar_event_templates" to "anon";

grant update on table "public"."calendar_event_templates" to "anon";

grant delete on table "public"."calendar_event_templates" to "authenticated";

grant insert on table "public"."calendar_event_templates" to "authenticated";

grant references on table "public"."calendar_event_templates" to "authenticated";

grant select on table "public"."calendar_event_templates" to "authenticated";

grant trigger on table "public"."calendar_event_templates" to "authenticated";

grant truncate on table "public"."calendar_event_templates" to "authenticated";

grant update on table "public"."calendar_event_templates" to "authenticated";

grant delete on table "public"."calendar_event_templates" to "service_role";

grant insert on table "public"."calendar_event_templates" to "service_role";

grant references on table "public"."calendar_event_templates" to "service_role";

grant select on table "public"."calendar_event_templates" to "service_role";

grant trigger on table "public"."calendar_event_templates" to "service_role";

grant truncate on table "public"."calendar_event_templates" to "service_role";

grant update on table "public"."calendar_event_templates" to "service_role";

grant delete on table "public"."calendar_events" to "anon";

grant insert on table "public"."calendar_events" to "anon";

grant references on table "public"."calendar_events" to "anon";

grant select on table "public"."calendar_events" to "anon";

grant trigger on table "public"."calendar_events" to "anon";

grant truncate on table "public"."calendar_events" to "anon";

grant update on table "public"."calendar_events" to "anon";

grant delete on table "public"."calendar_events" to "authenticated";

grant insert on table "public"."calendar_events" to "authenticated";

grant references on table "public"."calendar_events" to "authenticated";

grant select on table "public"."calendar_events" to "authenticated";

grant trigger on table "public"."calendar_events" to "authenticated";

grant truncate on table "public"."calendar_events" to "authenticated";

grant update on table "public"."calendar_events" to "authenticated";

grant delete on table "public"."calendar_events" to "service_role";

grant insert on table "public"."calendar_events" to "service_role";

grant references on table "public"."calendar_events" to "service_role";

grant select on table "public"."calendar_events" to "service_role";

grant trigger on table "public"."calendar_events" to "service_role";

grant truncate on table "public"."calendar_events" to "service_role";

grant update on table "public"."calendar_events" to "service_role";

grant delete on table "public"."calendars" to "anon";

grant insert on table "public"."calendars" to "anon";

grant references on table "public"."calendars" to "anon";

grant select on table "public"."calendars" to "anon";

grant trigger on table "public"."calendars" to "anon";

grant truncate on table "public"."calendars" to "anon";

grant update on table "public"."calendars" to "anon";

grant delete on table "public"."calendars" to "authenticated";

grant insert on table "public"."calendars" to "authenticated";

grant references on table "public"."calendars" to "authenticated";

grant select on table "public"."calendars" to "authenticated";

grant trigger on table "public"."calendars" to "authenticated";

grant truncate on table "public"."calendars" to "authenticated";

grant update on table "public"."calendars" to "authenticated";

grant delete on table "public"."calendars" to "service_role";

grant insert on table "public"."calendars" to "service_role";

grant references on table "public"."calendars" to "service_role";

grant select on table "public"."calendars" to "service_role";

grant trigger on table "public"."calendars" to "service_role";

grant truncate on table "public"."calendars" to "service_role";

grant update on table "public"."calendars" to "service_role";

grant delete on table "public"."catalog_categories" to "anon";

grant insert on table "public"."catalog_categories" to "anon";

grant references on table "public"."catalog_categories" to "anon";

grant select on table "public"."catalog_categories" to "anon";

grant trigger on table "public"."catalog_categories" to "anon";

grant truncate on table "public"."catalog_categories" to "anon";

grant update on table "public"."catalog_categories" to "anon";

grant delete on table "public"."catalog_categories" to "authenticated";

grant insert on table "public"."catalog_categories" to "authenticated";

grant references on table "public"."catalog_categories" to "authenticated";

grant select on table "public"."catalog_categories" to "authenticated";

grant trigger on table "public"."catalog_categories" to "authenticated";

grant truncate on table "public"."catalog_categories" to "authenticated";

grant update on table "public"."catalog_categories" to "authenticated";

grant delete on table "public"."catalog_categories" to "service_role";

grant insert on table "public"."catalog_categories" to "service_role";

grant references on table "public"."catalog_categories" to "service_role";

grant select on table "public"."catalog_categories" to "service_role";

grant trigger on table "public"."catalog_categories" to "service_role";

grant truncate on table "public"."catalog_categories" to "service_role";

grant update on table "public"."catalog_categories" to "service_role";

grant delete on table "public"."catalog_items" to "anon";

grant insert on table "public"."catalog_items" to "anon";

grant references on table "public"."catalog_items" to "anon";

grant select on table "public"."catalog_items" to "anon";

grant trigger on table "public"."catalog_items" to "anon";

grant truncate on table "public"."catalog_items" to "anon";

grant update on table "public"."catalog_items" to "anon";

grant delete on table "public"."catalog_items" to "authenticated";

grant insert on table "public"."catalog_items" to "authenticated";

grant references on table "public"."catalog_items" to "authenticated";

grant select on table "public"."catalog_items" to "authenticated";

grant trigger on table "public"."catalog_items" to "authenticated";

grant truncate on table "public"."catalog_items" to "authenticated";

grant update on table "public"."catalog_items" to "authenticated";

grant delete on table "public"."catalog_items" to "service_role";

grant insert on table "public"."catalog_items" to "service_role";

grant references on table "public"."catalog_items" to "service_role";

grant select on table "public"."catalog_items" to "service_role";

grant trigger on table "public"."catalog_items" to "service_role";

grant truncate on table "public"."catalog_items" to "service_role";

grant update on table "public"."catalog_items" to "service_role";

grant delete on table "public"."channel_credentials" to "anon";

grant insert on table "public"."channel_credentials" to "anon";

grant select on table "public"."channel_credentials" to "anon";

grant update on table "public"."channel_credentials" to "anon";

grant delete on table "public"."channel_credentials" to "authenticated";

grant insert on table "public"."channel_credentials" to "authenticated";

grant select on table "public"."channel_credentials" to "authenticated";

grant update on table "public"."channel_credentials" to "authenticated";

grant delete on table "public"."channel_credentials" to "service_role";

grant insert on table "public"."channel_credentials" to "service_role";

grant select on table "public"."channel_credentials" to "service_role";

grant update on table "public"."channel_credentials" to "service_role";

grant delete on table "public"."channels" to "anon";

grant insert on table "public"."channels" to "anon";

grant select on table "public"."channels" to "anon";

grant update on table "public"."channels" to "anon";

grant delete on table "public"."channels" to "authenticated";

grant insert on table "public"."channels" to "authenticated";

grant select on table "public"."channels" to "authenticated";

grant update on table "public"."channels" to "authenticated";

grant delete on table "public"."channels" to "service_role";

grant insert on table "public"."channels" to "service_role";

grant select on table "public"."channels" to "service_role";

grant update on table "public"."channels" to "service_role";

grant delete on table "public"."commercial_agent_profiles" to "service_role";

grant insert on table "public"."commercial_agent_profiles" to "service_role";

grant references on table "public"."commercial_agent_profiles" to "service_role";

grant select on table "public"."commercial_agent_profiles" to "service_role";

grant trigger on table "public"."commercial_agent_profiles" to "service_role";

grant truncate on table "public"."commercial_agent_profiles" to "service_role";

grant update on table "public"."commercial_agent_profiles" to "service_role";

grant delete on table "public"."commercial_conversation_analysis" to "service_role";

grant insert on table "public"."commercial_conversation_analysis" to "service_role";

grant references on table "public"."commercial_conversation_analysis" to "service_role";

grant select on table "public"."commercial_conversation_analysis" to "service_role";

grant trigger on table "public"."commercial_conversation_analysis" to "service_role";

grant truncate on table "public"."commercial_conversation_analysis" to "service_role";

grant update on table "public"."commercial_conversation_analysis" to "service_role";

grant delete on table "public"."commercial_follow_ups" to "service_role";

grant insert on table "public"."commercial_follow_ups" to "service_role";

grant references on table "public"."commercial_follow_ups" to "service_role";

grant select on table "public"."commercial_follow_ups" to "service_role";

grant trigger on table "public"."commercial_follow_ups" to "service_role";

grant truncate on table "public"."commercial_follow_ups" to "service_role";

grant update on table "public"."commercial_follow_ups" to "service_role";

grant delete on table "public"."commercial_offer_items" to "anon";

grant insert on table "public"."commercial_offer_items" to "anon";

grant references on table "public"."commercial_offer_items" to "anon";

grant select on table "public"."commercial_offer_items" to "anon";

grant trigger on table "public"."commercial_offer_items" to "anon";

grant truncate on table "public"."commercial_offer_items" to "anon";

grant update on table "public"."commercial_offer_items" to "anon";

grant delete on table "public"."commercial_offer_items" to "authenticated";

grant insert on table "public"."commercial_offer_items" to "authenticated";

grant references on table "public"."commercial_offer_items" to "authenticated";

grant select on table "public"."commercial_offer_items" to "authenticated";

grant trigger on table "public"."commercial_offer_items" to "authenticated";

grant truncate on table "public"."commercial_offer_items" to "authenticated";

grant update on table "public"."commercial_offer_items" to "authenticated";

grant delete on table "public"."commercial_offer_items" to "service_role";

grant insert on table "public"."commercial_offer_items" to "service_role";

grant references on table "public"."commercial_offer_items" to "service_role";

grant select on table "public"."commercial_offer_items" to "service_role";

grant trigger on table "public"."commercial_offer_items" to "service_role";

grant truncate on table "public"."commercial_offer_items" to "service_role";

grant update on table "public"."commercial_offer_items" to "service_role";

grant delete on table "public"."commercial_offers" to "anon";

grant insert on table "public"."commercial_offers" to "anon";

grant references on table "public"."commercial_offers" to "anon";

grant select on table "public"."commercial_offers" to "anon";

grant trigger on table "public"."commercial_offers" to "anon";

grant truncate on table "public"."commercial_offers" to "anon";

grant update on table "public"."commercial_offers" to "anon";

grant delete on table "public"."commercial_offers" to "authenticated";

grant insert on table "public"."commercial_offers" to "authenticated";

grant references on table "public"."commercial_offers" to "authenticated";

grant select on table "public"."commercial_offers" to "authenticated";

grant trigger on table "public"."commercial_offers" to "authenticated";

grant truncate on table "public"."commercial_offers" to "authenticated";

grant update on table "public"."commercial_offers" to "authenticated";

grant delete on table "public"."commercial_offers" to "service_role";

grant insert on table "public"."commercial_offers" to "service_role";

grant references on table "public"."commercial_offers" to "service_role";

grant select on table "public"."commercial_offers" to "service_role";

grant trigger on table "public"."commercial_offers" to "service_role";

grant truncate on table "public"."commercial_offers" to "service_role";

grant update on table "public"."commercial_offers" to "service_role";

grant delete on table "public"."commercial_opportunities" to "service_role";

grant insert on table "public"."commercial_opportunities" to "service_role";

grant references on table "public"."commercial_opportunities" to "service_role";

grant select on table "public"."commercial_opportunities" to "service_role";

grant trigger on table "public"."commercial_opportunities" to "service_role";

grant truncate on table "public"."commercial_opportunities" to "service_role";

grant update on table "public"."commercial_opportunities" to "service_role";

grant delete on table "public"."commercial_proposal_events" to "anon";

grant insert on table "public"."commercial_proposal_events" to "anon";

grant references on table "public"."commercial_proposal_events" to "anon";

grant select on table "public"."commercial_proposal_events" to "anon";

grant trigger on table "public"."commercial_proposal_events" to "anon";

grant truncate on table "public"."commercial_proposal_events" to "anon";

grant update on table "public"."commercial_proposal_events" to "anon";

grant delete on table "public"."commercial_proposal_events" to "authenticated";

grant insert on table "public"."commercial_proposal_events" to "authenticated";

grant references on table "public"."commercial_proposal_events" to "authenticated";

grant select on table "public"."commercial_proposal_events" to "authenticated";

grant trigger on table "public"."commercial_proposal_events" to "authenticated";

grant truncate on table "public"."commercial_proposal_events" to "authenticated";

grant update on table "public"."commercial_proposal_events" to "authenticated";

grant delete on table "public"."commercial_proposal_events" to "service_role";

grant insert on table "public"."commercial_proposal_events" to "service_role";

grant references on table "public"."commercial_proposal_events" to "service_role";

grant select on table "public"."commercial_proposal_events" to "service_role";

grant trigger on table "public"."commercial_proposal_events" to "service_role";

grant truncate on table "public"."commercial_proposal_events" to "service_role";

grant update on table "public"."commercial_proposal_events" to "service_role";

grant delete on table "public"."commercial_proposal_items" to "anon";

grant insert on table "public"."commercial_proposal_items" to "anon";

grant references on table "public"."commercial_proposal_items" to "anon";

grant select on table "public"."commercial_proposal_items" to "anon";

grant trigger on table "public"."commercial_proposal_items" to "anon";

grant truncate on table "public"."commercial_proposal_items" to "anon";

grant update on table "public"."commercial_proposal_items" to "anon";

grant delete on table "public"."commercial_proposal_items" to "authenticated";

grant insert on table "public"."commercial_proposal_items" to "authenticated";

grant references on table "public"."commercial_proposal_items" to "authenticated";

grant select on table "public"."commercial_proposal_items" to "authenticated";

grant trigger on table "public"."commercial_proposal_items" to "authenticated";

grant truncate on table "public"."commercial_proposal_items" to "authenticated";

grant update on table "public"."commercial_proposal_items" to "authenticated";

grant delete on table "public"."commercial_proposal_items" to "service_role";

grant insert on table "public"."commercial_proposal_items" to "service_role";

grant references on table "public"."commercial_proposal_items" to "service_role";

grant select on table "public"."commercial_proposal_items" to "service_role";

grant trigger on table "public"."commercial_proposal_items" to "service_role";

grant truncate on table "public"."commercial_proposal_items" to "service_role";

grant update on table "public"."commercial_proposal_items" to "service_role";

grant delete on table "public"."commercial_proposals" to "anon";

grant insert on table "public"."commercial_proposals" to "anon";

grant references on table "public"."commercial_proposals" to "anon";

grant select on table "public"."commercial_proposals" to "anon";

grant trigger on table "public"."commercial_proposals" to "anon";

grant truncate on table "public"."commercial_proposals" to "anon";

grant update on table "public"."commercial_proposals" to "anon";

grant delete on table "public"."commercial_proposals" to "authenticated";

grant insert on table "public"."commercial_proposals" to "authenticated";

grant references on table "public"."commercial_proposals" to "authenticated";

grant select on table "public"."commercial_proposals" to "authenticated";

grant trigger on table "public"."commercial_proposals" to "authenticated";

grant truncate on table "public"."commercial_proposals" to "authenticated";

grant update on table "public"."commercial_proposals" to "authenticated";

grant delete on table "public"."commercial_proposals" to "service_role";

grant insert on table "public"."commercial_proposals" to "service_role";

grant references on table "public"."commercial_proposals" to "service_role";

grant select on table "public"."commercial_proposals" to "service_role";

grant trigger on table "public"."commercial_proposals" to "service_role";

grant truncate on table "public"."commercial_proposals" to "service_role";

grant update on table "public"."commercial_proposals" to "service_role";

grant delete on table "public"."commercial_response_suggestions" to "service_role";

grant insert on table "public"."commercial_response_suggestions" to "service_role";

grant references on table "public"."commercial_response_suggestions" to "service_role";

grant select on table "public"."commercial_response_suggestions" to "service_role";

grant trigger on table "public"."commercial_response_suggestions" to "service_role";

grant truncate on table "public"."commercial_response_suggestions" to "service_role";

grant update on table "public"."commercial_response_suggestions" to "service_role";

grant delete on table "public"."consent_keywords" to "anon";

grant insert on table "public"."consent_keywords" to "anon";

grant references on table "public"."consent_keywords" to "anon";

grant select on table "public"."consent_keywords" to "anon";

grant trigger on table "public"."consent_keywords" to "anon";

grant truncate on table "public"."consent_keywords" to "anon";

grant update on table "public"."consent_keywords" to "anon";

grant delete on table "public"."consent_keywords" to "authenticated";

grant insert on table "public"."consent_keywords" to "authenticated";

grant references on table "public"."consent_keywords" to "authenticated";

grant select on table "public"."consent_keywords" to "authenticated";

grant trigger on table "public"."consent_keywords" to "authenticated";

grant truncate on table "public"."consent_keywords" to "authenticated";

grant update on table "public"."consent_keywords" to "authenticated";

grant delete on table "public"."consent_keywords" to "service_role";

grant insert on table "public"."consent_keywords" to "service_role";

grant references on table "public"."consent_keywords" to "service_role";

grant select on table "public"."consent_keywords" to "service_role";

grant trigger on table "public"."consent_keywords" to "service_role";

grant truncate on table "public"."consent_keywords" to "service_role";

grant update on table "public"."consent_keywords" to "service_role";

grant delete on table "public"."consent_message_templates" to "anon";

grant insert on table "public"."consent_message_templates" to "anon";

grant references on table "public"."consent_message_templates" to "anon";

grant select on table "public"."consent_message_templates" to "anon";

grant trigger on table "public"."consent_message_templates" to "anon";

grant truncate on table "public"."consent_message_templates" to "anon";

grant update on table "public"."consent_message_templates" to "anon";

grant delete on table "public"."consent_message_templates" to "authenticated";

grant insert on table "public"."consent_message_templates" to "authenticated";

grant references on table "public"."consent_message_templates" to "authenticated";

grant select on table "public"."consent_message_templates" to "authenticated";

grant trigger on table "public"."consent_message_templates" to "authenticated";

grant truncate on table "public"."consent_message_templates" to "authenticated";

grant update on table "public"."consent_message_templates" to "authenticated";

grant delete on table "public"."consent_message_templates" to "service_role";

grant insert on table "public"."consent_message_templates" to "service_role";

grant references on table "public"."consent_message_templates" to "service_role";

grant select on table "public"."consent_message_templates" to "service_role";

grant trigger on table "public"."consent_message_templates" to "service_role";

grant truncate on table "public"."consent_message_templates" to "service_role";

grant update on table "public"."consent_message_templates" to "service_role";

grant delete on table "public"."contact_identities" to "anon";

grant insert on table "public"."contact_identities" to "anon";

grant references on table "public"."contact_identities" to "anon";

grant select on table "public"."contact_identities" to "anon";

grant trigger on table "public"."contact_identities" to "anon";

grant truncate on table "public"."contact_identities" to "anon";

grant update on table "public"."contact_identities" to "anon";

grant delete on table "public"."contact_identities" to "authenticated";

grant insert on table "public"."contact_identities" to "authenticated";

grant references on table "public"."contact_identities" to "authenticated";

grant select on table "public"."contact_identities" to "authenticated";

grant trigger on table "public"."contact_identities" to "authenticated";

grant truncate on table "public"."contact_identities" to "authenticated";

grant update on table "public"."contact_identities" to "authenticated";

grant delete on table "public"."contact_identities" to "service_role";

grant insert on table "public"."contact_identities" to "service_role";

grant references on table "public"."contact_identities" to "service_role";

grant select on table "public"."contact_identities" to "service_role";

grant trigger on table "public"."contact_identities" to "service_role";

grant truncate on table "public"."contact_identities" to "service_role";

grant update on table "public"."contact_identities" to "service_role";

grant delete on table "public"."content_broadcast_targets" to "anon";

grant insert on table "public"."content_broadcast_targets" to "anon";

grant select on table "public"."content_broadcast_targets" to "anon";

grant update on table "public"."content_broadcast_targets" to "anon";

grant delete on table "public"."content_broadcast_targets" to "authenticated";

grant insert on table "public"."content_broadcast_targets" to "authenticated";

grant select on table "public"."content_broadcast_targets" to "authenticated";

grant update on table "public"."content_broadcast_targets" to "authenticated";

grant delete on table "public"."content_broadcast_targets" to "service_role";

grant insert on table "public"."content_broadcast_targets" to "service_role";

grant select on table "public"."content_broadcast_targets" to "service_role";

grant update on table "public"."content_broadcast_targets" to "service_role";

grant delete on table "public"."content_broadcasts" to "anon";

grant insert on table "public"."content_broadcasts" to "anon";

grant select on table "public"."content_broadcasts" to "anon";

grant update on table "public"."content_broadcasts" to "anon";

grant delete on table "public"."content_broadcasts" to "authenticated";

grant insert on table "public"."content_broadcasts" to "authenticated";

grant select on table "public"."content_broadcasts" to "authenticated";

grant update on table "public"."content_broadcasts" to "authenticated";

grant delete on table "public"."content_broadcasts" to "service_role";

grant insert on table "public"."content_broadcasts" to "service_role";

grant select on table "public"."content_broadcasts" to "service_role";

grant update on table "public"."content_broadcasts" to "service_role";

grant delete on table "public"."conversation_assignment_events" to "anon";

grant insert on table "public"."conversation_assignment_events" to "anon";

grant references on table "public"."conversation_assignment_events" to "anon";

grant select on table "public"."conversation_assignment_events" to "anon";

grant trigger on table "public"."conversation_assignment_events" to "anon";

grant truncate on table "public"."conversation_assignment_events" to "anon";

grant update on table "public"."conversation_assignment_events" to "anon";

grant delete on table "public"."conversation_assignment_events" to "authenticated";

grant insert on table "public"."conversation_assignment_events" to "authenticated";

grant references on table "public"."conversation_assignment_events" to "authenticated";

grant select on table "public"."conversation_assignment_events" to "authenticated";

grant trigger on table "public"."conversation_assignment_events" to "authenticated";

grant truncate on table "public"."conversation_assignment_events" to "authenticated";

grant update on table "public"."conversation_assignment_events" to "authenticated";

grant delete on table "public"."conversation_assignment_events" to "service_role";

grant insert on table "public"."conversation_assignment_events" to "service_role";

grant references on table "public"."conversation_assignment_events" to "service_role";

grant select on table "public"."conversation_assignment_events" to "service_role";

grant trigger on table "public"."conversation_assignment_events" to "service_role";

grant truncate on table "public"."conversation_assignment_events" to "service_role";

grant update on table "public"."conversation_assignment_events" to "service_role";

grant delete on table "public"."conversation_assignments" to "anon";

grant insert on table "public"."conversation_assignments" to "anon";

grant references on table "public"."conversation_assignments" to "anon";

grant select on table "public"."conversation_assignments" to "anon";

grant trigger on table "public"."conversation_assignments" to "anon";

grant truncate on table "public"."conversation_assignments" to "anon";

grant update on table "public"."conversation_assignments" to "anon";

grant delete on table "public"."conversation_assignments" to "authenticated";

grant insert on table "public"."conversation_assignments" to "authenticated";

grant references on table "public"."conversation_assignments" to "authenticated";

grant select on table "public"."conversation_assignments" to "authenticated";

grant trigger on table "public"."conversation_assignments" to "authenticated";

grant truncate on table "public"."conversation_assignments" to "authenticated";

grant update on table "public"."conversation_assignments" to "authenticated";

grant delete on table "public"."conversation_assignments" to "service_role";

grant insert on table "public"."conversation_assignments" to "service_role";

grant references on table "public"."conversation_assignments" to "service_role";

grant select on table "public"."conversation_assignments" to "service_role";

grant trigger on table "public"."conversation_assignments" to "service_role";

grant truncate on table "public"."conversation_assignments" to "service_role";

grant update on table "public"."conversation_assignments" to "service_role";

grant delete on table "public"."conversation_flow_sessions" to "anon";

grant insert on table "public"."conversation_flow_sessions" to "anon";

grant references on table "public"."conversation_flow_sessions" to "anon";

grant select on table "public"."conversation_flow_sessions" to "anon";

grant trigger on table "public"."conversation_flow_sessions" to "anon";

grant truncate on table "public"."conversation_flow_sessions" to "anon";

grant update on table "public"."conversation_flow_sessions" to "anon";

grant delete on table "public"."conversation_flow_sessions" to "authenticated";

grant insert on table "public"."conversation_flow_sessions" to "authenticated";

grant references on table "public"."conversation_flow_sessions" to "authenticated";

grant select on table "public"."conversation_flow_sessions" to "authenticated";

grant trigger on table "public"."conversation_flow_sessions" to "authenticated";

grant truncate on table "public"."conversation_flow_sessions" to "authenticated";

grant update on table "public"."conversation_flow_sessions" to "authenticated";

grant delete on table "public"."conversation_flow_sessions" to "service_role";

grant insert on table "public"."conversation_flow_sessions" to "service_role";

grant references on table "public"."conversation_flow_sessions" to "service_role";

grant select on table "public"."conversation_flow_sessions" to "service_role";

grant trigger on table "public"."conversation_flow_sessions" to "service_role";

grant truncate on table "public"."conversation_flow_sessions" to "service_role";

grant update on table "public"."conversation_flow_sessions" to "service_role";

grant delete on table "public"."conversation_flow_steps" to "anon";

grant insert on table "public"."conversation_flow_steps" to "anon";

grant references on table "public"."conversation_flow_steps" to "anon";

grant select on table "public"."conversation_flow_steps" to "anon";

grant trigger on table "public"."conversation_flow_steps" to "anon";

grant truncate on table "public"."conversation_flow_steps" to "anon";

grant update on table "public"."conversation_flow_steps" to "anon";

grant delete on table "public"."conversation_flow_steps" to "authenticated";

grant insert on table "public"."conversation_flow_steps" to "authenticated";

grant references on table "public"."conversation_flow_steps" to "authenticated";

grant select on table "public"."conversation_flow_steps" to "authenticated";

grant trigger on table "public"."conversation_flow_steps" to "authenticated";

grant truncate on table "public"."conversation_flow_steps" to "authenticated";

grant update on table "public"."conversation_flow_steps" to "authenticated";

grant delete on table "public"."conversation_flow_steps" to "service_role";

grant insert on table "public"."conversation_flow_steps" to "service_role";

grant references on table "public"."conversation_flow_steps" to "service_role";

grant select on table "public"."conversation_flow_steps" to "service_role";

grant trigger on table "public"."conversation_flow_steps" to "service_role";

grant truncate on table "public"."conversation_flow_steps" to "service_role";

grant update on table "public"."conversation_flow_steps" to "service_role";

grant delete on table "public"."conversation_flows" to "anon";

grant insert on table "public"."conversation_flows" to "anon";

grant references on table "public"."conversation_flows" to "anon";

grant select on table "public"."conversation_flows" to "anon";

grant trigger on table "public"."conversation_flows" to "anon";

grant truncate on table "public"."conversation_flows" to "anon";

grant update on table "public"."conversation_flows" to "anon";

grant delete on table "public"."conversation_flows" to "authenticated";

grant insert on table "public"."conversation_flows" to "authenticated";

grant references on table "public"."conversation_flows" to "authenticated";

grant select on table "public"."conversation_flows" to "authenticated";

grant trigger on table "public"."conversation_flows" to "authenticated";

grant truncate on table "public"."conversation_flows" to "authenticated";

grant update on table "public"."conversation_flows" to "authenticated";

grant delete on table "public"."conversation_flows" to "service_role";

grant insert on table "public"."conversation_flows" to "service_role";

grant references on table "public"."conversation_flows" to "service_role";

grant select on table "public"."conversation_flows" to "service_role";

grant trigger on table "public"."conversation_flows" to "service_role";

grant truncate on table "public"."conversation_flows" to "service_role";

grant update on table "public"."conversation_flows" to "service_role";

grant delete on table "public"."conversation_notes" to "anon";

grant insert on table "public"."conversation_notes" to "anon";

grant references on table "public"."conversation_notes" to "anon";

grant select on table "public"."conversation_notes" to "anon";

grant trigger on table "public"."conversation_notes" to "anon";

grant truncate on table "public"."conversation_notes" to "anon";

grant update on table "public"."conversation_notes" to "anon";

grant delete on table "public"."conversation_notes" to "authenticated";

grant insert on table "public"."conversation_notes" to "authenticated";

grant references on table "public"."conversation_notes" to "authenticated";

grant select on table "public"."conversation_notes" to "authenticated";

grant trigger on table "public"."conversation_notes" to "authenticated";

grant truncate on table "public"."conversation_notes" to "authenticated";

grant update on table "public"."conversation_notes" to "authenticated";

grant delete on table "public"."conversation_notes" to "service_role";

grant insert on table "public"."conversation_notes" to "service_role";

grant references on table "public"."conversation_notes" to "service_role";

grant select on table "public"."conversation_notes" to "service_role";

grant trigger on table "public"."conversation_notes" to "service_role";

grant truncate on table "public"."conversation_notes" to "service_role";

grant update on table "public"."conversation_notes" to "service_role";

grant delete on table "public"."crm_activities" to "anon";

grant insert on table "public"."crm_activities" to "anon";

grant references on table "public"."crm_activities" to "anon";

grant select on table "public"."crm_activities" to "anon";

grant trigger on table "public"."crm_activities" to "anon";

grant truncate on table "public"."crm_activities" to "anon";

grant update on table "public"."crm_activities" to "anon";

grant delete on table "public"."crm_activities" to "authenticated";

grant insert on table "public"."crm_activities" to "authenticated";

grant references on table "public"."crm_activities" to "authenticated";

grant select on table "public"."crm_activities" to "authenticated";

grant trigger on table "public"."crm_activities" to "authenticated";

grant truncate on table "public"."crm_activities" to "authenticated";

grant update on table "public"."crm_activities" to "authenticated";

grant delete on table "public"."crm_activities" to "service_role";

grant insert on table "public"."crm_activities" to "service_role";

grant references on table "public"."crm_activities" to "service_role";

grant select on table "public"."crm_activities" to "service_role";

grant trigger on table "public"."crm_activities" to "service_role";

grant truncate on table "public"."crm_activities" to "service_role";

grant update on table "public"."crm_activities" to "service_role";

grant delete on table "public"."crm_campaign_recipients" to "anon";

grant insert on table "public"."crm_campaign_recipients" to "anon";

grant references on table "public"."crm_campaign_recipients" to "anon";

grant select on table "public"."crm_campaign_recipients" to "anon";

grant trigger on table "public"."crm_campaign_recipients" to "anon";

grant truncate on table "public"."crm_campaign_recipients" to "anon";

grant update on table "public"."crm_campaign_recipients" to "anon";

grant delete on table "public"."crm_campaign_recipients" to "authenticated";

grant insert on table "public"."crm_campaign_recipients" to "authenticated";

grant references on table "public"."crm_campaign_recipients" to "authenticated";

grant select on table "public"."crm_campaign_recipients" to "authenticated";

grant trigger on table "public"."crm_campaign_recipients" to "authenticated";

grant truncate on table "public"."crm_campaign_recipients" to "authenticated";

grant update on table "public"."crm_campaign_recipients" to "authenticated";

grant delete on table "public"."crm_campaign_recipients" to "service_role";

grant insert on table "public"."crm_campaign_recipients" to "service_role";

grant references on table "public"."crm_campaign_recipients" to "service_role";

grant select on table "public"."crm_campaign_recipients" to "service_role";

grant trigger on table "public"."crm_campaign_recipients" to "service_role";

grant truncate on table "public"."crm_campaign_recipients" to "service_role";

grant update on table "public"."crm_campaign_recipients" to "service_role";

grant delete on table "public"."crm_campaigns" to "anon";

grant insert on table "public"."crm_campaigns" to "anon";

grant references on table "public"."crm_campaigns" to "anon";

grant select on table "public"."crm_campaigns" to "anon";

grant trigger on table "public"."crm_campaigns" to "anon";

grant truncate on table "public"."crm_campaigns" to "anon";

grant update on table "public"."crm_campaigns" to "anon";

grant delete on table "public"."crm_campaigns" to "authenticated";

grant insert on table "public"."crm_campaigns" to "authenticated";

grant references on table "public"."crm_campaigns" to "authenticated";

grant select on table "public"."crm_campaigns" to "authenticated";

grant trigger on table "public"."crm_campaigns" to "authenticated";

grant truncate on table "public"."crm_campaigns" to "authenticated";

grant update on table "public"."crm_campaigns" to "authenticated";

grant delete on table "public"."crm_campaigns" to "service_role";

grant insert on table "public"."crm_campaigns" to "service_role";

grant references on table "public"."crm_campaigns" to "service_role";

grant select on table "public"."crm_campaigns" to "service_role";

grant trigger on table "public"."crm_campaigns" to "service_role";

grant truncate on table "public"."crm_campaigns" to "service_role";

grant update on table "public"."crm_campaigns" to "service_role";

grant delete on table "public"."crm_consent_events" to "anon";

grant insert on table "public"."crm_consent_events" to "anon";

grant references on table "public"."crm_consent_events" to "anon";

grant select on table "public"."crm_consent_events" to "anon";

grant trigger on table "public"."crm_consent_events" to "anon";

grant truncate on table "public"."crm_consent_events" to "anon";

grant update on table "public"."crm_consent_events" to "anon";

grant delete on table "public"."crm_consent_events" to "authenticated";

grant insert on table "public"."crm_consent_events" to "authenticated";

grant references on table "public"."crm_consent_events" to "authenticated";

grant select on table "public"."crm_consent_events" to "authenticated";

grant trigger on table "public"."crm_consent_events" to "authenticated";

grant truncate on table "public"."crm_consent_events" to "authenticated";

grant update on table "public"."crm_consent_events" to "authenticated";

grant delete on table "public"."crm_consent_events" to "service_role";

grant insert on table "public"."crm_consent_events" to "service_role";

grant references on table "public"."crm_consent_events" to "service_role";

grant select on table "public"."crm_consent_events" to "service_role";

grant trigger on table "public"."crm_consent_events" to "service_role";

grant truncate on table "public"."crm_consent_events" to "service_role";

grant update on table "public"."crm_consent_events" to "service_role";

grant delete on table "public"."crm_contact_list_items" to "anon";

grant insert on table "public"."crm_contact_list_items" to "anon";

grant references on table "public"."crm_contact_list_items" to "anon";

grant select on table "public"."crm_contact_list_items" to "anon";

grant trigger on table "public"."crm_contact_list_items" to "anon";

grant truncate on table "public"."crm_contact_list_items" to "anon";

grant update on table "public"."crm_contact_list_items" to "anon";

grant delete on table "public"."crm_contact_list_items" to "authenticated";

grant insert on table "public"."crm_contact_list_items" to "authenticated";

grant references on table "public"."crm_contact_list_items" to "authenticated";

grant select on table "public"."crm_contact_list_items" to "authenticated";

grant trigger on table "public"."crm_contact_list_items" to "authenticated";

grant truncate on table "public"."crm_contact_list_items" to "authenticated";

grant update on table "public"."crm_contact_list_items" to "authenticated";

grant delete on table "public"."crm_contact_list_items" to "service_role";

grant insert on table "public"."crm_contact_list_items" to "service_role";

grant references on table "public"."crm_contact_list_items" to "service_role";

grant select on table "public"."crm_contact_list_items" to "service_role";

grant trigger on table "public"."crm_contact_list_items" to "service_role";

grant truncate on table "public"."crm_contact_list_items" to "service_role";

grant update on table "public"."crm_contact_list_items" to "service_role";

grant delete on table "public"."crm_contact_lists" to "anon";

grant insert on table "public"."crm_contact_lists" to "anon";

grant references on table "public"."crm_contact_lists" to "anon";

grant select on table "public"."crm_contact_lists" to "anon";

grant trigger on table "public"."crm_contact_lists" to "anon";

grant truncate on table "public"."crm_contact_lists" to "anon";

grant update on table "public"."crm_contact_lists" to "anon";

grant delete on table "public"."crm_contact_lists" to "authenticated";

grant insert on table "public"."crm_contact_lists" to "authenticated";

grant references on table "public"."crm_contact_lists" to "authenticated";

grant select on table "public"."crm_contact_lists" to "authenticated";

grant trigger on table "public"."crm_contact_lists" to "authenticated";

grant truncate on table "public"."crm_contact_lists" to "authenticated";

grant update on table "public"."crm_contact_lists" to "authenticated";

grant delete on table "public"."crm_contact_lists" to "service_role";

grant insert on table "public"."crm_contact_lists" to "service_role";

grant references on table "public"."crm_contact_lists" to "service_role";

grant select on table "public"."crm_contact_lists" to "service_role";

grant trigger on table "public"."crm_contact_lists" to "service_role";

grant truncate on table "public"."crm_contact_lists" to "service_role";

grant update on table "public"."crm_contact_lists" to "service_role";

grant delete on table "public"."crm_contact_notes" to "anon";

grant insert on table "public"."crm_contact_notes" to "anon";

grant select on table "public"."crm_contact_notes" to "anon";

grant update on table "public"."crm_contact_notes" to "anon";

grant delete on table "public"."crm_contact_notes" to "authenticated";

grant insert on table "public"."crm_contact_notes" to "authenticated";

grant select on table "public"."crm_contact_notes" to "authenticated";

grant update on table "public"."crm_contact_notes" to "authenticated";

grant delete on table "public"."crm_contact_notes" to "service_role";

grant insert on table "public"."crm_contact_notes" to "service_role";

grant select on table "public"."crm_contact_notes" to "service_role";

grant update on table "public"."crm_contact_notes" to "service_role";

grant delete on table "public"."crm_contact_tags" to "anon";

grant insert on table "public"."crm_contact_tags" to "anon";

grant references on table "public"."crm_contact_tags" to "anon";

grant select on table "public"."crm_contact_tags" to "anon";

grant trigger on table "public"."crm_contact_tags" to "anon";

grant truncate on table "public"."crm_contact_tags" to "anon";

grant update on table "public"."crm_contact_tags" to "anon";

grant delete on table "public"."crm_contact_tags" to "authenticated";

grant insert on table "public"."crm_contact_tags" to "authenticated";

grant references on table "public"."crm_contact_tags" to "authenticated";

grant select on table "public"."crm_contact_tags" to "authenticated";

grant trigger on table "public"."crm_contact_tags" to "authenticated";

grant truncate on table "public"."crm_contact_tags" to "authenticated";

grant update on table "public"."crm_contact_tags" to "authenticated";

grant delete on table "public"."crm_contact_tags" to "service_role";

grant insert on table "public"."crm_contact_tags" to "service_role";

grant references on table "public"."crm_contact_tags" to "service_role";

grant select on table "public"."crm_contact_tags" to "service_role";

grant trigger on table "public"."crm_contact_tags" to "service_role";

grant truncate on table "public"."crm_contact_tags" to "service_role";

grant update on table "public"."crm_contact_tags" to "service_role";

grant delete on table "public"."crm_contacts" to "anon";

grant insert on table "public"."crm_contacts" to "anon";

grant select on table "public"."crm_contacts" to "anon";

grant update on table "public"."crm_contacts" to "anon";

grant delete on table "public"."crm_contacts" to "authenticated";

grant insert on table "public"."crm_contacts" to "authenticated";

grant select on table "public"."crm_contacts" to "authenticated";

grant update on table "public"."crm_contacts" to "authenticated";

grant delete on table "public"."crm_contacts" to "service_role";

grant insert on table "public"."crm_contacts" to "service_role";

grant select on table "public"."crm_contacts" to "service_role";

grant update on table "public"."crm_contacts" to "service_role";

grant delete on table "public"."crm_deals" to "anon";

grant insert on table "public"."crm_deals" to "anon";

grant references on table "public"."crm_deals" to "anon";

grant select on table "public"."crm_deals" to "anon";

grant trigger on table "public"."crm_deals" to "anon";

grant truncate on table "public"."crm_deals" to "anon";

grant update on table "public"."crm_deals" to "anon";

grant delete on table "public"."crm_deals" to "authenticated";

grant insert on table "public"."crm_deals" to "authenticated";

grant references on table "public"."crm_deals" to "authenticated";

grant select on table "public"."crm_deals" to "authenticated";

grant trigger on table "public"."crm_deals" to "authenticated";

grant truncate on table "public"."crm_deals" to "authenticated";

grant update on table "public"."crm_deals" to "authenticated";

grant delete on table "public"."crm_deals" to "service_role";

grant insert on table "public"."crm_deals" to "service_role";

grant references on table "public"."crm_deals" to "service_role";

grant select on table "public"."crm_deals" to "service_role";

grant trigger on table "public"."crm_deals" to "service_role";

grant truncate on table "public"."crm_deals" to "service_role";

grant update on table "public"."crm_deals" to "service_role";

grant delete on table "public"."crm_pipeline_stages" to "anon";

grant insert on table "public"."crm_pipeline_stages" to "anon";

grant references on table "public"."crm_pipeline_stages" to "anon";

grant select on table "public"."crm_pipeline_stages" to "anon";

grant trigger on table "public"."crm_pipeline_stages" to "anon";

grant truncate on table "public"."crm_pipeline_stages" to "anon";

grant update on table "public"."crm_pipeline_stages" to "anon";

grant delete on table "public"."crm_pipeline_stages" to "authenticated";

grant insert on table "public"."crm_pipeline_stages" to "authenticated";

grant references on table "public"."crm_pipeline_stages" to "authenticated";

grant select on table "public"."crm_pipeline_stages" to "authenticated";

grant trigger on table "public"."crm_pipeline_stages" to "authenticated";

grant truncate on table "public"."crm_pipeline_stages" to "authenticated";

grant update on table "public"."crm_pipeline_stages" to "authenticated";

grant delete on table "public"."crm_pipeline_stages" to "service_role";

grant insert on table "public"."crm_pipeline_stages" to "service_role";

grant references on table "public"."crm_pipeline_stages" to "service_role";

grant select on table "public"."crm_pipeline_stages" to "service_role";

grant trigger on table "public"."crm_pipeline_stages" to "service_role";

grant truncate on table "public"."crm_pipeline_stages" to "service_role";

grant update on table "public"."crm_pipeline_stages" to "service_role";

grant delete on table "public"."crm_tags" to "anon";

grant insert on table "public"."crm_tags" to "anon";

grant references on table "public"."crm_tags" to "anon";

grant select on table "public"."crm_tags" to "anon";

grant trigger on table "public"."crm_tags" to "anon";

grant truncate on table "public"."crm_tags" to "anon";

grant update on table "public"."crm_tags" to "anon";

grant delete on table "public"."crm_tags" to "authenticated";

grant insert on table "public"."crm_tags" to "authenticated";

grant references on table "public"."crm_tags" to "authenticated";

grant select on table "public"."crm_tags" to "authenticated";

grant trigger on table "public"."crm_tags" to "authenticated";

grant truncate on table "public"."crm_tags" to "authenticated";

grant update on table "public"."crm_tags" to "authenticated";

grant delete on table "public"."crm_tags" to "service_role";

grant insert on table "public"."crm_tags" to "service_role";

grant references on table "public"."crm_tags" to "service_role";

grant select on table "public"."crm_tags" to "service_role";

grant trigger on table "public"."crm_tags" to "service_role";

grant truncate on table "public"."crm_tags" to "service_role";

grant update on table "public"."crm_tags" to "service_role";

grant delete on table "public"."crm_task_templates" to "anon";

grant insert on table "public"."crm_task_templates" to "anon";

grant references on table "public"."crm_task_templates" to "anon";

grant select on table "public"."crm_task_templates" to "anon";

grant trigger on table "public"."crm_task_templates" to "anon";

grant truncate on table "public"."crm_task_templates" to "anon";

grant update on table "public"."crm_task_templates" to "anon";

grant delete on table "public"."crm_task_templates" to "authenticated";

grant insert on table "public"."crm_task_templates" to "authenticated";

grant references on table "public"."crm_task_templates" to "authenticated";

grant select on table "public"."crm_task_templates" to "authenticated";

grant trigger on table "public"."crm_task_templates" to "authenticated";

grant truncate on table "public"."crm_task_templates" to "authenticated";

grant update on table "public"."crm_task_templates" to "authenticated";

grant delete on table "public"."crm_task_templates" to "service_role";

grant insert on table "public"."crm_task_templates" to "service_role";

grant references on table "public"."crm_task_templates" to "service_role";

grant select on table "public"."crm_task_templates" to "service_role";

grant trigger on table "public"."crm_task_templates" to "service_role";

grant truncate on table "public"."crm_task_templates" to "service_role";

grant update on table "public"."crm_task_templates" to "service_role";

grant delete on table "public"."crm_tasks" to "anon";

grant insert on table "public"."crm_tasks" to "anon";

grant references on table "public"."crm_tasks" to "anon";

grant select on table "public"."crm_tasks" to "anon";

grant trigger on table "public"."crm_tasks" to "anon";

grant truncate on table "public"."crm_tasks" to "anon";

grant update on table "public"."crm_tasks" to "anon";

grant delete on table "public"."crm_tasks" to "authenticated";

grant insert on table "public"."crm_tasks" to "authenticated";

grant references on table "public"."crm_tasks" to "authenticated";

grant select on table "public"."crm_tasks" to "authenticated";

grant trigger on table "public"."crm_tasks" to "authenticated";

grant truncate on table "public"."crm_tasks" to "authenticated";

grant update on table "public"."crm_tasks" to "authenticated";

grant delete on table "public"."crm_tasks" to "service_role";

grant insert on table "public"."crm_tasks" to "service_role";

grant references on table "public"."crm_tasks" to "service_role";

grant select on table "public"."crm_tasks" to "service_role";

grant trigger on table "public"."crm_tasks" to "service_role";

grant truncate on table "public"."crm_tasks" to "service_role";

grant update on table "public"."crm_tasks" to "service_role";

grant delete on table "public"."departments" to "anon";

grant insert on table "public"."departments" to "anon";

grant select on table "public"."departments" to "anon";

grant update on table "public"."departments" to "anon";

grant delete on table "public"."departments" to "authenticated";

grant insert on table "public"."departments" to "authenticated";

grant select on table "public"."departments" to "authenticated";

grant update on table "public"."departments" to "authenticated";

grant delete on table "public"."departments" to "service_role";

grant insert on table "public"."departments" to "service_role";

grant select on table "public"."departments" to "service_role";

grant update on table "public"."departments" to "service_role";

grant delete on table "public"."deploy_checklist_items" to "anon";

grant insert on table "public"."deploy_checklist_items" to "anon";

grant references on table "public"."deploy_checklist_items" to "anon";

grant select on table "public"."deploy_checklist_items" to "anon";

grant trigger on table "public"."deploy_checklist_items" to "anon";

grant truncate on table "public"."deploy_checklist_items" to "anon";

grant update on table "public"."deploy_checklist_items" to "anon";

grant delete on table "public"."deploy_checklist_items" to "authenticated";

grant insert on table "public"."deploy_checklist_items" to "authenticated";

grant references on table "public"."deploy_checklist_items" to "authenticated";

grant select on table "public"."deploy_checklist_items" to "authenticated";

grant trigger on table "public"."deploy_checklist_items" to "authenticated";

grant truncate on table "public"."deploy_checklist_items" to "authenticated";

grant update on table "public"."deploy_checklist_items" to "authenticated";

grant delete on table "public"."deploy_checklist_items" to "service_role";

grant insert on table "public"."deploy_checklist_items" to "service_role";

grant references on table "public"."deploy_checklist_items" to "service_role";

grant select on table "public"."deploy_checklist_items" to "service_role";

grant trigger on table "public"."deploy_checklist_items" to "service_role";

grant truncate on table "public"."deploy_checklist_items" to "service_role";

grant update on table "public"."deploy_checklist_items" to "service_role";

grant delete on table "public"."deploy_checklists" to "anon";

grant insert on table "public"."deploy_checklists" to "anon";

grant references on table "public"."deploy_checklists" to "anon";

grant select on table "public"."deploy_checklists" to "anon";

grant trigger on table "public"."deploy_checklists" to "anon";

grant truncate on table "public"."deploy_checklists" to "anon";

grant update on table "public"."deploy_checklists" to "anon";

grant delete on table "public"."deploy_checklists" to "authenticated";

grant insert on table "public"."deploy_checklists" to "authenticated";

grant references on table "public"."deploy_checklists" to "authenticated";

grant select on table "public"."deploy_checklists" to "authenticated";

grant trigger on table "public"."deploy_checklists" to "authenticated";

grant truncate on table "public"."deploy_checklists" to "authenticated";

grant update on table "public"."deploy_checklists" to "authenticated";

grant delete on table "public"."deploy_checklists" to "service_role";

grant insert on table "public"."deploy_checklists" to "service_role";

grant references on table "public"."deploy_checklists" to "service_role";

grant select on table "public"."deploy_checklists" to "service_role";

grant trigger on table "public"."deploy_checklists" to "service_role";

grant truncate on table "public"."deploy_checklists" to "service_role";

grant update on table "public"."deploy_checklists" to "service_role";

grant delete on table "public"."deployments" to "anon";

grant insert on table "public"."deployments" to "anon";

grant references on table "public"."deployments" to "anon";

grant select on table "public"."deployments" to "anon";

grant trigger on table "public"."deployments" to "anon";

grant truncate on table "public"."deployments" to "anon";

grant update on table "public"."deployments" to "anon";

grant delete on table "public"."deployments" to "authenticated";

grant insert on table "public"."deployments" to "authenticated";

grant references on table "public"."deployments" to "authenticated";

grant select on table "public"."deployments" to "authenticated";

grant trigger on table "public"."deployments" to "authenticated";

grant truncate on table "public"."deployments" to "authenticated";

grant update on table "public"."deployments" to "authenticated";

grant delete on table "public"."deployments" to "service_role";

grant insert on table "public"."deployments" to "service_role";

grant references on table "public"."deployments" to "service_role";

grant select on table "public"."deployments" to "service_role";

grant trigger on table "public"."deployments" to "service_role";

grant truncate on table "public"."deployments" to "service_role";

grant update on table "public"."deployments" to "service_role";

grant delete on table "public"."distribution_channels" to "anon";

grant insert on table "public"."distribution_channels" to "anon";

grant select on table "public"."distribution_channels" to "anon";

grant update on table "public"."distribution_channels" to "anon";

grant delete on table "public"."distribution_channels" to "authenticated";

grant insert on table "public"."distribution_channels" to "authenticated";

grant select on table "public"."distribution_channels" to "authenticated";

grant update on table "public"."distribution_channels" to "authenticated";

grant delete on table "public"."distribution_channels" to "service_role";

grant insert on table "public"."distribution_channels" to "service_role";

grant select on table "public"."distribution_channels" to "service_role";

grant update on table "public"."distribution_channels" to "service_role";

grant delete on table "public"."document_acceptances" to "anon";

grant insert on table "public"."document_acceptances" to "anon";

grant references on table "public"."document_acceptances" to "anon";

grant select on table "public"."document_acceptances" to "anon";

grant trigger on table "public"."document_acceptances" to "anon";

grant truncate on table "public"."document_acceptances" to "anon";

grant update on table "public"."document_acceptances" to "anon";

grant delete on table "public"."document_acceptances" to "authenticated";

grant insert on table "public"."document_acceptances" to "authenticated";

grant references on table "public"."document_acceptances" to "authenticated";

grant select on table "public"."document_acceptances" to "authenticated";

grant trigger on table "public"."document_acceptances" to "authenticated";

grant truncate on table "public"."document_acceptances" to "authenticated";

grant update on table "public"."document_acceptances" to "authenticated";

grant delete on table "public"."document_acceptances" to "service_role";

grant insert on table "public"."document_acceptances" to "service_role";

grant references on table "public"."document_acceptances" to "service_role";

grant select on table "public"."document_acceptances" to "service_role";

grant trigger on table "public"."document_acceptances" to "service_role";

grant truncate on table "public"."document_acceptances" to "service_role";

grant update on table "public"."document_acceptances" to "service_role";

grant delete on table "public"."document_events" to "anon";

grant insert on table "public"."document_events" to "anon";

grant references on table "public"."document_events" to "anon";

grant select on table "public"."document_events" to "anon";

grant trigger on table "public"."document_events" to "anon";

grant truncate on table "public"."document_events" to "anon";

grant update on table "public"."document_events" to "anon";

grant delete on table "public"."document_events" to "authenticated";

grant insert on table "public"."document_events" to "authenticated";

grant references on table "public"."document_events" to "authenticated";

grant select on table "public"."document_events" to "authenticated";

grant trigger on table "public"."document_events" to "authenticated";

grant truncate on table "public"."document_events" to "authenticated";

grant update on table "public"."document_events" to "authenticated";

grant delete on table "public"."document_events" to "service_role";

grant insert on table "public"."document_events" to "service_role";

grant references on table "public"."document_events" to "service_role";

grant select on table "public"."document_events" to "service_role";

grant trigger on table "public"."document_events" to "service_role";

grant truncate on table "public"."document_events" to "service_role";

grant update on table "public"."document_events" to "service_role";

grant delete on table "public"."document_files" to "anon";

grant insert on table "public"."document_files" to "anon";

grant references on table "public"."document_files" to "anon";

grant select on table "public"."document_files" to "anon";

grant trigger on table "public"."document_files" to "anon";

grant truncate on table "public"."document_files" to "anon";

grant update on table "public"."document_files" to "anon";

grant delete on table "public"."document_files" to "authenticated";

grant insert on table "public"."document_files" to "authenticated";

grant references on table "public"."document_files" to "authenticated";

grant select on table "public"."document_files" to "authenticated";

grant trigger on table "public"."document_files" to "authenticated";

grant truncate on table "public"."document_files" to "authenticated";

grant update on table "public"."document_files" to "authenticated";

grant delete on table "public"."document_files" to "service_role";

grant insert on table "public"."document_files" to "service_role";

grant references on table "public"."document_files" to "service_role";

grant select on table "public"."document_files" to "service_role";

grant trigger on table "public"."document_files" to "service_role";

grant truncate on table "public"."document_files" to "service_role";

grant update on table "public"."document_files" to "service_role";

grant delete on table "public"."document_public_links" to "anon";

grant insert on table "public"."document_public_links" to "anon";

grant references on table "public"."document_public_links" to "anon";

grant select on table "public"."document_public_links" to "anon";

grant trigger on table "public"."document_public_links" to "anon";

grant truncate on table "public"."document_public_links" to "anon";

grant update on table "public"."document_public_links" to "anon";

grant delete on table "public"."document_public_links" to "authenticated";

grant insert on table "public"."document_public_links" to "authenticated";

grant references on table "public"."document_public_links" to "authenticated";

grant select on table "public"."document_public_links" to "authenticated";

grant trigger on table "public"."document_public_links" to "authenticated";

grant truncate on table "public"."document_public_links" to "authenticated";

grant update on table "public"."document_public_links" to "authenticated";

grant delete on table "public"."document_public_links" to "service_role";

grant insert on table "public"."document_public_links" to "service_role";

grant references on table "public"."document_public_links" to "service_role";

grant select on table "public"."document_public_links" to "service_role";

grant trigger on table "public"."document_public_links" to "service_role";

grant truncate on table "public"."document_public_links" to "service_role";

grant update on table "public"."document_public_links" to "service_role";

grant delete on table "public"."document_templates" to "anon";

grant insert on table "public"."document_templates" to "anon";

grant references on table "public"."document_templates" to "anon";

grant select on table "public"."document_templates" to "anon";

grant trigger on table "public"."document_templates" to "anon";

grant truncate on table "public"."document_templates" to "anon";

grant update on table "public"."document_templates" to "anon";

grant delete on table "public"."document_templates" to "authenticated";

grant insert on table "public"."document_templates" to "authenticated";

grant references on table "public"."document_templates" to "authenticated";

grant select on table "public"."document_templates" to "authenticated";

grant trigger on table "public"."document_templates" to "authenticated";

grant truncate on table "public"."document_templates" to "authenticated";

grant update on table "public"."document_templates" to "authenticated";

grant delete on table "public"."document_templates" to "service_role";

grant insert on table "public"."document_templates" to "service_role";

grant references on table "public"."document_templates" to "service_role";

grant select on table "public"."document_templates" to "service_role";

grant trigger on table "public"."document_templates" to "service_role";

grant truncate on table "public"."document_templates" to "service_role";

grant update on table "public"."document_templates" to "service_role";

grant delete on table "public"."documents" to "anon";

grant insert on table "public"."documents" to "anon";

grant references on table "public"."documents" to "anon";

grant select on table "public"."documents" to "anon";

grant trigger on table "public"."documents" to "anon";

grant truncate on table "public"."documents" to "anon";

grant update on table "public"."documents" to "anon";

grant delete on table "public"."documents" to "authenticated";

grant insert on table "public"."documents" to "authenticated";

grant references on table "public"."documents" to "authenticated";

grant select on table "public"."documents" to "authenticated";

grant trigger on table "public"."documents" to "authenticated";

grant truncate on table "public"."documents" to "authenticated";

grant update on table "public"."documents" to "authenticated";

grant delete on table "public"."documents" to "service_role";

grant insert on table "public"."documents" to "service_role";

grant references on table "public"."documents" to "service_role";

grant select on table "public"."documents" to "service_role";

grant trigger on table "public"."documents" to "service_role";

grant truncate on table "public"."documents" to "service_role";

grant update on table "public"."documents" to "service_role";

grant delete on table "public"."external_integrations" to "anon";

grant insert on table "public"."external_integrations" to "anon";

grant references on table "public"."external_integrations" to "anon";

grant select on table "public"."external_integrations" to "anon";

grant trigger on table "public"."external_integrations" to "anon";

grant truncate on table "public"."external_integrations" to "anon";

grant update on table "public"."external_integrations" to "anon";

grant delete on table "public"."external_integrations" to "authenticated";

grant insert on table "public"."external_integrations" to "authenticated";

grant references on table "public"."external_integrations" to "authenticated";

grant select on table "public"."external_integrations" to "authenticated";

grant trigger on table "public"."external_integrations" to "authenticated";

grant truncate on table "public"."external_integrations" to "authenticated";

grant update on table "public"."external_integrations" to "authenticated";

grant delete on table "public"."external_integrations" to "service_role";

grant insert on table "public"."external_integrations" to "service_role";

grant references on table "public"."external_integrations" to "service_role";

grant select on table "public"."external_integrations" to "service_role";

grant trigger on table "public"."external_integrations" to "service_role";

grant truncate on table "public"."external_integrations" to "service_role";

grant update on table "public"."external_integrations" to "service_role";

grant delete on table "public"."file_access_logs" to "anon";

grant insert on table "public"."file_access_logs" to "anon";

grant references on table "public"."file_access_logs" to "anon";

grant select on table "public"."file_access_logs" to "anon";

grant trigger on table "public"."file_access_logs" to "anon";

grant truncate on table "public"."file_access_logs" to "anon";

grant update on table "public"."file_access_logs" to "anon";

grant delete on table "public"."file_access_logs" to "authenticated";

grant insert on table "public"."file_access_logs" to "authenticated";

grant references on table "public"."file_access_logs" to "authenticated";

grant select on table "public"."file_access_logs" to "authenticated";

grant trigger on table "public"."file_access_logs" to "authenticated";

grant truncate on table "public"."file_access_logs" to "authenticated";

grant update on table "public"."file_access_logs" to "authenticated";

grant delete on table "public"."file_access_logs" to "service_role";

grant insert on table "public"."file_access_logs" to "service_role";

grant references on table "public"."file_access_logs" to "service_role";

grant select on table "public"."file_access_logs" to "service_role";

grant trigger on table "public"."file_access_logs" to "service_role";

grant truncate on table "public"."file_access_logs" to "service_role";

grant update on table "public"."file_access_logs" to "service_role";

grant delete on table "public"."file_folders" to "anon";

grant insert on table "public"."file_folders" to "anon";

grant references on table "public"."file_folders" to "anon";

grant select on table "public"."file_folders" to "anon";

grant trigger on table "public"."file_folders" to "anon";

grant truncate on table "public"."file_folders" to "anon";

grant update on table "public"."file_folders" to "anon";

grant delete on table "public"."file_folders" to "authenticated";

grant insert on table "public"."file_folders" to "authenticated";

grant references on table "public"."file_folders" to "authenticated";

grant select on table "public"."file_folders" to "authenticated";

grant trigger on table "public"."file_folders" to "authenticated";

grant truncate on table "public"."file_folders" to "authenticated";

grant update on table "public"."file_folders" to "authenticated";

grant delete on table "public"."file_folders" to "service_role";

grant insert on table "public"."file_folders" to "service_role";

grant references on table "public"."file_folders" to "service_role";

grant select on table "public"."file_folders" to "service_role";

grant trigger on table "public"."file_folders" to "service_role";

grant truncate on table "public"."file_folders" to "service_role";

grant update on table "public"."file_folders" to "service_role";

grant delete on table "public"."file_shares" to "anon";

grant insert on table "public"."file_shares" to "anon";

grant references on table "public"."file_shares" to "anon";

grant select on table "public"."file_shares" to "anon";

grant trigger on table "public"."file_shares" to "anon";

grant truncate on table "public"."file_shares" to "anon";

grant update on table "public"."file_shares" to "anon";

grant delete on table "public"."file_shares" to "authenticated";

grant insert on table "public"."file_shares" to "authenticated";

grant references on table "public"."file_shares" to "authenticated";

grant select on table "public"."file_shares" to "authenticated";

grant trigger on table "public"."file_shares" to "authenticated";

grant truncate on table "public"."file_shares" to "authenticated";

grant update on table "public"."file_shares" to "authenticated";

grant delete on table "public"."file_shares" to "service_role";

grant insert on table "public"."file_shares" to "service_role";

grant references on table "public"."file_shares" to "service_role";

grant select on table "public"."file_shares" to "service_role";

grant trigger on table "public"."file_shares" to "service_role";

grant truncate on table "public"."file_shares" to "service_role";

grant update on table "public"."file_shares" to "service_role";

grant delete on table "public"."file_tag_links" to "anon";

grant insert on table "public"."file_tag_links" to "anon";

grant references on table "public"."file_tag_links" to "anon";

grant select on table "public"."file_tag_links" to "anon";

grant trigger on table "public"."file_tag_links" to "anon";

grant truncate on table "public"."file_tag_links" to "anon";

grant update on table "public"."file_tag_links" to "anon";

grant delete on table "public"."file_tag_links" to "authenticated";

grant insert on table "public"."file_tag_links" to "authenticated";

grant references on table "public"."file_tag_links" to "authenticated";

grant select on table "public"."file_tag_links" to "authenticated";

grant trigger on table "public"."file_tag_links" to "authenticated";

grant truncate on table "public"."file_tag_links" to "authenticated";

grant update on table "public"."file_tag_links" to "authenticated";

grant delete on table "public"."file_tag_links" to "service_role";

grant insert on table "public"."file_tag_links" to "service_role";

grant references on table "public"."file_tag_links" to "service_role";

grant select on table "public"."file_tag_links" to "service_role";

grant trigger on table "public"."file_tag_links" to "service_role";

grant truncate on table "public"."file_tag_links" to "service_role";

grant update on table "public"."file_tag_links" to "service_role";

grant delete on table "public"."file_tags" to "anon";

grant insert on table "public"."file_tags" to "anon";

grant references on table "public"."file_tags" to "anon";

grant select on table "public"."file_tags" to "anon";

grant trigger on table "public"."file_tags" to "anon";

grant truncate on table "public"."file_tags" to "anon";

grant update on table "public"."file_tags" to "anon";

grant delete on table "public"."file_tags" to "authenticated";

grant insert on table "public"."file_tags" to "authenticated";

grant references on table "public"."file_tags" to "authenticated";

grant select on table "public"."file_tags" to "authenticated";

grant trigger on table "public"."file_tags" to "authenticated";

grant truncate on table "public"."file_tags" to "authenticated";

grant update on table "public"."file_tags" to "authenticated";

grant delete on table "public"."file_tags" to "service_role";

grant insert on table "public"."file_tags" to "service_role";

grant references on table "public"."file_tags" to "service_role";

grant select on table "public"."file_tags" to "service_role";

grant trigger on table "public"."file_tags" to "service_role";

grant truncate on table "public"."file_tags" to "service_role";

grant update on table "public"."file_tags" to "service_role";

grant delete on table "public"."file_versions" to "anon";

grant insert on table "public"."file_versions" to "anon";

grant references on table "public"."file_versions" to "anon";

grant select on table "public"."file_versions" to "anon";

grant trigger on table "public"."file_versions" to "anon";

grant truncate on table "public"."file_versions" to "anon";

grant update on table "public"."file_versions" to "anon";

grant delete on table "public"."file_versions" to "authenticated";

grant insert on table "public"."file_versions" to "authenticated";

grant references on table "public"."file_versions" to "authenticated";

grant select on table "public"."file_versions" to "authenticated";

grant trigger on table "public"."file_versions" to "authenticated";

grant truncate on table "public"."file_versions" to "authenticated";

grant update on table "public"."file_versions" to "authenticated";

grant delete on table "public"."file_versions" to "service_role";

grant insert on table "public"."file_versions" to "service_role";

grant references on table "public"."file_versions" to "service_role";

grant select on table "public"."file_versions" to "service_role";

grant trigger on table "public"."file_versions" to "service_role";

grant truncate on table "public"."file_versions" to "service_role";

grant update on table "public"."file_versions" to "service_role";

grant delete on table "public"."files" to "anon";

grant insert on table "public"."files" to "anon";

grant references on table "public"."files" to "anon";

grant select on table "public"."files" to "anon";

grant trigger on table "public"."files" to "anon";

grant truncate on table "public"."files" to "anon";

grant update on table "public"."files" to "anon";

grant delete on table "public"."files" to "authenticated";

grant insert on table "public"."files" to "authenticated";

grant references on table "public"."files" to "authenticated";

grant select on table "public"."files" to "authenticated";

grant trigger on table "public"."files" to "authenticated";

grant truncate on table "public"."files" to "authenticated";

grant update on table "public"."files" to "authenticated";

grant delete on table "public"."files" to "service_role";

grant insert on table "public"."files" to "service_role";

grant references on table "public"."files" to "service_role";

grant select on table "public"."files" to "service_role";

grant trigger on table "public"."files" to "service_role";

grant truncate on table "public"."files" to "service_role";

grant update on table "public"."files" to "service_role";

grant delete on table "public"."finance_accounts" to "anon";

grant insert on table "public"."finance_accounts" to "anon";

grant references on table "public"."finance_accounts" to "anon";

grant select on table "public"."finance_accounts" to "anon";

grant trigger on table "public"."finance_accounts" to "anon";

grant truncate on table "public"."finance_accounts" to "anon";

grant update on table "public"."finance_accounts" to "anon";

grant delete on table "public"."finance_accounts" to "authenticated";

grant insert on table "public"."finance_accounts" to "authenticated";

grant references on table "public"."finance_accounts" to "authenticated";

grant select on table "public"."finance_accounts" to "authenticated";

grant trigger on table "public"."finance_accounts" to "authenticated";

grant truncate on table "public"."finance_accounts" to "authenticated";

grant update on table "public"."finance_accounts" to "authenticated";

grant delete on table "public"."finance_accounts" to "service_role";

grant insert on table "public"."finance_accounts" to "service_role";

grant references on table "public"."finance_accounts" to "service_role";

grant select on table "public"."finance_accounts" to "service_role";

grant trigger on table "public"."finance_accounts" to "service_role";

grant truncate on table "public"."finance_accounts" to "service_role";

grant update on table "public"."finance_accounts" to "service_role";

grant delete on table "public"."finance_events" to "anon";

grant insert on table "public"."finance_events" to "anon";

grant references on table "public"."finance_events" to "anon";

grant select on table "public"."finance_events" to "anon";

grant trigger on table "public"."finance_events" to "anon";

grant truncate on table "public"."finance_events" to "anon";

grant update on table "public"."finance_events" to "anon";

grant delete on table "public"."finance_events" to "authenticated";

grant insert on table "public"."finance_events" to "authenticated";

grant references on table "public"."finance_events" to "authenticated";

grant select on table "public"."finance_events" to "authenticated";

grant trigger on table "public"."finance_events" to "authenticated";

grant truncate on table "public"."finance_events" to "authenticated";

grant update on table "public"."finance_events" to "authenticated";

grant delete on table "public"."finance_events" to "service_role";

grant insert on table "public"."finance_events" to "service_role";

grant references on table "public"."finance_events" to "service_role";

grant select on table "public"."finance_events" to "service_role";

grant trigger on table "public"."finance_events" to "service_role";

grant truncate on table "public"."finance_events" to "service_role";

grant update on table "public"."finance_events" to "service_role";

grant delete on table "public"."finance_installments" to "anon";

grant insert on table "public"."finance_installments" to "anon";

grant references on table "public"."finance_installments" to "anon";

grant select on table "public"."finance_installments" to "anon";

grant trigger on table "public"."finance_installments" to "anon";

grant truncate on table "public"."finance_installments" to "anon";

grant update on table "public"."finance_installments" to "anon";

grant delete on table "public"."finance_installments" to "authenticated";

grant insert on table "public"."finance_installments" to "authenticated";

grant references on table "public"."finance_installments" to "authenticated";

grant select on table "public"."finance_installments" to "authenticated";

grant trigger on table "public"."finance_installments" to "authenticated";

grant truncate on table "public"."finance_installments" to "authenticated";

grant update on table "public"."finance_installments" to "authenticated";

grant delete on table "public"."finance_installments" to "service_role";

grant insert on table "public"."finance_installments" to "service_role";

grant references on table "public"."finance_installments" to "service_role";

grant select on table "public"."finance_installments" to "service_role";

grant trigger on table "public"."finance_installments" to "service_role";

grant truncate on table "public"."finance_installments" to "service_role";

grant update on table "public"."finance_installments" to "service_role";

grant delete on table "public"."finance_invoice_items" to "anon";

grant insert on table "public"."finance_invoice_items" to "anon";

grant references on table "public"."finance_invoice_items" to "anon";

grant select on table "public"."finance_invoice_items" to "anon";

grant trigger on table "public"."finance_invoice_items" to "anon";

grant truncate on table "public"."finance_invoice_items" to "anon";

grant update on table "public"."finance_invoice_items" to "anon";

grant delete on table "public"."finance_invoice_items" to "authenticated";

grant insert on table "public"."finance_invoice_items" to "authenticated";

grant references on table "public"."finance_invoice_items" to "authenticated";

grant select on table "public"."finance_invoice_items" to "authenticated";

grant trigger on table "public"."finance_invoice_items" to "authenticated";

grant truncate on table "public"."finance_invoice_items" to "authenticated";

grant update on table "public"."finance_invoice_items" to "authenticated";

grant delete on table "public"."finance_invoice_items" to "service_role";

grant insert on table "public"."finance_invoice_items" to "service_role";

grant references on table "public"."finance_invoice_items" to "service_role";

grant select on table "public"."finance_invoice_items" to "service_role";

grant trigger on table "public"."finance_invoice_items" to "service_role";

grant truncate on table "public"."finance_invoice_items" to "service_role";

grant update on table "public"."finance_invoice_items" to "service_role";

grant delete on table "public"."finance_invoices" to "anon";

grant insert on table "public"."finance_invoices" to "anon";

grant references on table "public"."finance_invoices" to "anon";

grant select on table "public"."finance_invoices" to "anon";

grant trigger on table "public"."finance_invoices" to "anon";

grant truncate on table "public"."finance_invoices" to "anon";

grant update on table "public"."finance_invoices" to "anon";

grant delete on table "public"."finance_invoices" to "authenticated";

grant insert on table "public"."finance_invoices" to "authenticated";

grant references on table "public"."finance_invoices" to "authenticated";

grant select on table "public"."finance_invoices" to "authenticated";

grant trigger on table "public"."finance_invoices" to "authenticated";

grant truncate on table "public"."finance_invoices" to "authenticated";

grant update on table "public"."finance_invoices" to "authenticated";

grant delete on table "public"."finance_invoices" to "service_role";

grant insert on table "public"."finance_invoices" to "service_role";

grant references on table "public"."finance_invoices" to "service_role";

grant select on table "public"."finance_invoices" to "service_role";

grant trigger on table "public"."finance_invoices" to "service_role";

grant truncate on table "public"."finance_invoices" to "service_role";

grant update on table "public"."finance_invoices" to "service_role";

grant delete on table "public"."finance_payments" to "anon";

grant insert on table "public"."finance_payments" to "anon";

grant references on table "public"."finance_payments" to "anon";

grant select on table "public"."finance_payments" to "anon";

grant trigger on table "public"."finance_payments" to "anon";

grant truncate on table "public"."finance_payments" to "anon";

grant update on table "public"."finance_payments" to "anon";

grant delete on table "public"."finance_payments" to "authenticated";

grant insert on table "public"."finance_payments" to "authenticated";

grant references on table "public"."finance_payments" to "authenticated";

grant select on table "public"."finance_payments" to "authenticated";

grant trigger on table "public"."finance_payments" to "authenticated";

grant truncate on table "public"."finance_payments" to "authenticated";

grant update on table "public"."finance_payments" to "authenticated";

grant delete on table "public"."global_search_index" to "anon";

grant insert on table "public"."global_search_index" to "anon";

grant references on table "public"."global_search_index" to "anon";

grant select on table "public"."global_search_index" to "anon";

grant trigger on table "public"."global_search_index" to "anon";

grant truncate on table "public"."global_search_index" to "anon";

grant update on table "public"."global_search_index" to "anon";

grant delete on table "public"."global_search_index" to "authenticated";

grant insert on table "public"."global_search_index" to "authenticated";

grant references on table "public"."global_search_index" to "authenticated";

grant select on table "public"."global_search_index" to "authenticated";

grant trigger on table "public"."global_search_index" to "authenticated";

grant truncate on table "public"."global_search_index" to "authenticated";

grant update on table "public"."global_search_index" to "authenticated";

grant delete on table "public"."global_search_index" to "service_role";

grant insert on table "public"."global_search_index" to "service_role";

grant references on table "public"."global_search_index" to "service_role";

grant select on table "public"."global_search_index" to "service_role";

grant trigger on table "public"."global_search_index" to "service_role";

grant truncate on table "public"."global_search_index" to "service_role";

grant update on table "public"."global_search_index" to "service_role";

grant delete on table "public"."group_contact_list_items" to "anon";

grant insert on table "public"."group_contact_list_items" to "anon";

grant select on table "public"."group_contact_list_items" to "anon";

grant update on table "public"."group_contact_list_items" to "anon";

grant delete on table "public"."group_contact_list_items" to "authenticated";

grant insert on table "public"."group_contact_list_items" to "authenticated";

grant select on table "public"."group_contact_list_items" to "authenticated";

grant update on table "public"."group_contact_list_items" to "authenticated";

grant delete on table "public"."group_contact_list_items" to "service_role";

grant insert on table "public"."group_contact_list_items" to "service_role";

grant select on table "public"."group_contact_list_items" to "service_role";

grant update on table "public"."group_contact_list_items" to "service_role";

grant delete on table "public"."group_contact_lists" to "anon";

grant insert on table "public"."group_contact_lists" to "anon";

grant select on table "public"."group_contact_lists" to "anon";

grant update on table "public"."group_contact_lists" to "anon";

grant delete on table "public"."group_contact_lists" to "authenticated";

grant insert on table "public"."group_contact_lists" to "authenticated";

grant select on table "public"."group_contact_lists" to "authenticated";

grant update on table "public"."group_contact_lists" to "authenticated";

grant delete on table "public"."group_contact_lists" to "service_role";

grant insert on table "public"."group_contact_lists" to "service_role";

grant select on table "public"."group_contact_lists" to "service_role";

grant update on table "public"."group_contact_lists" to "service_role";

grant delete on table "public"."import_column_mappings" to "anon";

grant insert on table "public"."import_column_mappings" to "anon";

grant references on table "public"."import_column_mappings" to "anon";

grant select on table "public"."import_column_mappings" to "anon";

grant trigger on table "public"."import_column_mappings" to "anon";

grant truncate on table "public"."import_column_mappings" to "anon";

grant update on table "public"."import_column_mappings" to "anon";

grant delete on table "public"."import_column_mappings" to "authenticated";

grant insert on table "public"."import_column_mappings" to "authenticated";

grant references on table "public"."import_column_mappings" to "authenticated";

grant select on table "public"."import_column_mappings" to "authenticated";

grant trigger on table "public"."import_column_mappings" to "authenticated";

grant truncate on table "public"."import_column_mappings" to "authenticated";

grant update on table "public"."import_column_mappings" to "authenticated";

grant delete on table "public"."import_column_mappings" to "service_role";

grant insert on table "public"."import_column_mappings" to "service_role";

grant references on table "public"."import_column_mappings" to "service_role";

grant select on table "public"."import_column_mappings" to "service_role";

grant trigger on table "public"."import_column_mappings" to "service_role";

grant truncate on table "public"."import_column_mappings" to "service_role";

grant update on table "public"."import_column_mappings" to "service_role";

grant delete on table "public"."import_deduplication_rules" to "anon";

grant insert on table "public"."import_deduplication_rules" to "anon";

grant references on table "public"."import_deduplication_rules" to "anon";

grant select on table "public"."import_deduplication_rules" to "anon";

grant trigger on table "public"."import_deduplication_rules" to "anon";

grant truncate on table "public"."import_deduplication_rules" to "anon";

grant update on table "public"."import_deduplication_rules" to "anon";

grant delete on table "public"."import_deduplication_rules" to "authenticated";

grant insert on table "public"."import_deduplication_rules" to "authenticated";

grant references on table "public"."import_deduplication_rules" to "authenticated";

grant select on table "public"."import_deduplication_rules" to "authenticated";

grant trigger on table "public"."import_deduplication_rules" to "authenticated";

grant truncate on table "public"."import_deduplication_rules" to "authenticated";

grant update on table "public"."import_deduplication_rules" to "authenticated";

grant delete on table "public"."import_deduplication_rules" to "service_role";

grant insert on table "public"."import_deduplication_rules" to "service_role";

grant references on table "public"."import_deduplication_rules" to "service_role";

grant select on table "public"."import_deduplication_rules" to "service_role";

grant trigger on table "public"."import_deduplication_rules" to "service_role";

grant truncate on table "public"."import_deduplication_rules" to "service_role";

grant update on table "public"."import_deduplication_rules" to "service_role";

grant delete on table "public"."import_jobs" to "anon";

grant insert on table "public"."import_jobs" to "anon";

grant references on table "public"."import_jobs" to "anon";

grant select on table "public"."import_jobs" to "anon";

grant trigger on table "public"."import_jobs" to "anon";

grant truncate on table "public"."import_jobs" to "anon";

grant update on table "public"."import_jobs" to "anon";

grant delete on table "public"."import_jobs" to "authenticated";

grant insert on table "public"."import_jobs" to "authenticated";

grant references on table "public"."import_jobs" to "authenticated";

grant select on table "public"."import_jobs" to "authenticated";

grant trigger on table "public"."import_jobs" to "authenticated";

grant truncate on table "public"."import_jobs" to "authenticated";

grant update on table "public"."import_jobs" to "authenticated";

grant delete on table "public"."import_jobs" to "service_role";

grant insert on table "public"."import_jobs" to "service_role";

grant references on table "public"."import_jobs" to "service_role";

grant select on table "public"."import_jobs" to "service_role";

grant trigger on table "public"."import_jobs" to "service_role";

grant truncate on table "public"."import_jobs" to "service_role";

grant update on table "public"."import_jobs" to "service_role";

grant delete on table "public"."import_logs" to "anon";

grant insert on table "public"."import_logs" to "anon";

grant references on table "public"."import_logs" to "anon";

grant select on table "public"."import_logs" to "anon";

grant trigger on table "public"."import_logs" to "anon";

grant truncate on table "public"."import_logs" to "anon";

grant update on table "public"."import_logs" to "anon";

grant delete on table "public"."import_logs" to "authenticated";

grant insert on table "public"."import_logs" to "authenticated";

grant references on table "public"."import_logs" to "authenticated";

grant select on table "public"."import_logs" to "authenticated";

grant trigger on table "public"."import_logs" to "authenticated";

grant truncate on table "public"."import_logs" to "authenticated";

grant update on table "public"."import_logs" to "authenticated";

grant delete on table "public"."import_logs" to "service_role";

grant insert on table "public"."import_logs" to "service_role";

grant references on table "public"."import_logs" to "service_role";

grant select on table "public"."import_logs" to "service_role";

grant trigger on table "public"."import_logs" to "service_role";

grant truncate on table "public"."import_logs" to "service_role";

grant update on table "public"."import_logs" to "service_role";

grant delete on table "public"."import_rows" to "anon";

grant insert on table "public"."import_rows" to "anon";

grant references on table "public"."import_rows" to "anon";

grant select on table "public"."import_rows" to "anon";

grant trigger on table "public"."import_rows" to "anon";

grant truncate on table "public"."import_rows" to "anon";

grant update on table "public"."import_rows" to "anon";

grant delete on table "public"."import_rows" to "authenticated";

grant insert on table "public"."import_rows" to "authenticated";

grant references on table "public"."import_rows" to "authenticated";

grant select on table "public"."import_rows" to "authenticated";

grant trigger on table "public"."import_rows" to "authenticated";

grant truncate on table "public"."import_rows" to "authenticated";

grant update on table "public"."import_rows" to "authenticated";

grant delete on table "public"."import_rows" to "service_role";

grant insert on table "public"."import_rows" to "service_role";

grant references on table "public"."import_rows" to "service_role";

grant select on table "public"."import_rows" to "service_role";

grant trigger on table "public"."import_rows" to "service_role";

grant truncate on table "public"."import_rows" to "service_role";

grant update on table "public"."import_rows" to "service_role";

grant delete on table "public"."inbound_webhook_endpoints" to "anon";

grant insert on table "public"."inbound_webhook_endpoints" to "anon";

grant references on table "public"."inbound_webhook_endpoints" to "anon";

grant select on table "public"."inbound_webhook_endpoints" to "anon";

grant trigger on table "public"."inbound_webhook_endpoints" to "anon";

grant truncate on table "public"."inbound_webhook_endpoints" to "anon";

grant update on table "public"."inbound_webhook_endpoints" to "anon";

grant delete on table "public"."inbound_webhook_endpoints" to "authenticated";

grant insert on table "public"."inbound_webhook_endpoints" to "authenticated";

grant references on table "public"."inbound_webhook_endpoints" to "authenticated";

grant select on table "public"."inbound_webhook_endpoints" to "authenticated";

grant trigger on table "public"."inbound_webhook_endpoints" to "authenticated";

grant truncate on table "public"."inbound_webhook_endpoints" to "authenticated";

grant update on table "public"."inbound_webhook_endpoints" to "authenticated";

grant delete on table "public"."inbound_webhook_endpoints" to "service_role";

grant insert on table "public"."inbound_webhook_endpoints" to "service_role";

grant references on table "public"."inbound_webhook_endpoints" to "service_role";

grant select on table "public"."inbound_webhook_endpoints" to "service_role";

grant trigger on table "public"."inbound_webhook_endpoints" to "service_role";

grant truncate on table "public"."inbound_webhook_endpoints" to "service_role";

grant update on table "public"."inbound_webhook_endpoints" to "service_role";

grant delete on table "public"."inbound_webhook_events" to "anon";

grant insert on table "public"."inbound_webhook_events" to "anon";

grant references on table "public"."inbound_webhook_events" to "anon";

grant select on table "public"."inbound_webhook_events" to "anon";

grant trigger on table "public"."inbound_webhook_events" to "anon";

grant truncate on table "public"."inbound_webhook_events" to "anon";

grant update on table "public"."inbound_webhook_events" to "anon";

grant delete on table "public"."inbound_webhook_events" to "authenticated";

grant insert on table "public"."inbound_webhook_events" to "authenticated";

grant references on table "public"."inbound_webhook_events" to "authenticated";

grant select on table "public"."inbound_webhook_events" to "authenticated";

grant trigger on table "public"."inbound_webhook_events" to "authenticated";

grant truncate on table "public"."inbound_webhook_events" to "authenticated";

grant update on table "public"."inbound_webhook_events" to "authenticated";

grant delete on table "public"."inbound_webhook_events" to "service_role";

grant insert on table "public"."inbound_webhook_events" to "service_role";

grant references on table "public"."inbound_webhook_events" to "service_role";

grant select on table "public"."inbound_webhook_events" to "service_role";

grant trigger on table "public"."inbound_webhook_events" to "service_role";

grant truncate on table "public"."inbound_webhook_events" to "service_role";

grant update on table "public"."inbound_webhook_events" to "service_role";

grant delete on table "public"."integration_agents" to "anon";

grant insert on table "public"."integration_agents" to "anon";

grant references on table "public"."integration_agents" to "anon";

grant select on table "public"."integration_agents" to "anon";

grant trigger on table "public"."integration_agents" to "anon";

grant truncate on table "public"."integration_agents" to "anon";

grant update on table "public"."integration_agents" to "anon";

grant delete on table "public"."integration_agents" to "authenticated";

grant insert on table "public"."integration_agents" to "authenticated";

grant references on table "public"."integration_agents" to "authenticated";

grant select on table "public"."integration_agents" to "authenticated";

grant trigger on table "public"."integration_agents" to "authenticated";

grant truncate on table "public"."integration_agents" to "authenticated";

grant update on table "public"."integration_agents" to "authenticated";

grant delete on table "public"."integration_agents" to "service_role";

grant insert on table "public"."integration_agents" to "service_role";

grant references on table "public"."integration_agents" to "service_role";

grant select on table "public"."integration_agents" to "service_role";

grant trigger on table "public"."integration_agents" to "service_role";

grant truncate on table "public"."integration_agents" to "service_role";

grant update on table "public"."integration_agents" to "service_role";

grant delete on table "public"."integration_event_mappings" to "anon";

grant insert on table "public"."integration_event_mappings" to "anon";

grant references on table "public"."integration_event_mappings" to "anon";

grant select on table "public"."integration_event_mappings" to "anon";

grant trigger on table "public"."integration_event_mappings" to "anon";

grant truncate on table "public"."integration_event_mappings" to "anon";

grant update on table "public"."integration_event_mappings" to "anon";

grant delete on table "public"."integration_event_mappings" to "authenticated";

grant insert on table "public"."integration_event_mappings" to "authenticated";

grant references on table "public"."integration_event_mappings" to "authenticated";

grant select on table "public"."integration_event_mappings" to "authenticated";

grant trigger on table "public"."integration_event_mappings" to "authenticated";

grant truncate on table "public"."integration_event_mappings" to "authenticated";

grant update on table "public"."integration_event_mappings" to "authenticated";

grant delete on table "public"."integration_event_mappings" to "service_role";

grant insert on table "public"."integration_event_mappings" to "service_role";

grant references on table "public"."integration_event_mappings" to "service_role";

grant select on table "public"."integration_event_mappings" to "service_role";

grant trigger on table "public"."integration_event_mappings" to "service_role";

grant truncate on table "public"."integration_event_mappings" to "service_role";

grant update on table "public"."integration_event_mappings" to "service_role";

grant delete on table "public"."integration_sources" to "anon";

grant insert on table "public"."integration_sources" to "anon";

grant references on table "public"."integration_sources" to "anon";

grant select on table "public"."integration_sources" to "anon";

grant trigger on table "public"."integration_sources" to "anon";

grant truncate on table "public"."integration_sources" to "anon";

grant update on table "public"."integration_sources" to "anon";

grant delete on table "public"."integration_sources" to "authenticated";

grant insert on table "public"."integration_sources" to "authenticated";

grant references on table "public"."integration_sources" to "authenticated";

grant select on table "public"."integration_sources" to "authenticated";

grant trigger on table "public"."integration_sources" to "authenticated";

grant truncate on table "public"."integration_sources" to "authenticated";

grant update on table "public"."integration_sources" to "authenticated";

grant delete on table "public"."integration_sources" to "service_role";

grant insert on table "public"."integration_sources" to "service_role";

grant references on table "public"."integration_sources" to "service_role";

grant select on table "public"."integration_sources" to "service_role";

grant trigger on table "public"."integration_sources" to "service_role";

grant truncate on table "public"."integration_sources" to "service_role";

grant update on table "public"."integration_sources" to "service_role";

grant delete on table "public"."integration_sync_logs" to "anon";

grant insert on table "public"."integration_sync_logs" to "anon";

grant references on table "public"."integration_sync_logs" to "anon";

grant select on table "public"."integration_sync_logs" to "anon";

grant trigger on table "public"."integration_sync_logs" to "anon";

grant truncate on table "public"."integration_sync_logs" to "anon";

grant update on table "public"."integration_sync_logs" to "anon";

grant delete on table "public"."integration_sync_logs" to "authenticated";

grant insert on table "public"."integration_sync_logs" to "authenticated";

grant references on table "public"."integration_sync_logs" to "authenticated";

grant select on table "public"."integration_sync_logs" to "authenticated";

grant trigger on table "public"."integration_sync_logs" to "authenticated";

grant truncate on table "public"."integration_sync_logs" to "authenticated";

grant update on table "public"."integration_sync_logs" to "authenticated";

grant delete on table "public"."integration_sync_logs" to "service_role";

grant insert on table "public"."integration_sync_logs" to "service_role";

grant references on table "public"."integration_sync_logs" to "service_role";

grant select on table "public"."integration_sync_logs" to "service_role";

grant trigger on table "public"."integration_sync_logs" to "service_role";

grant truncate on table "public"."integration_sync_logs" to "service_role";

grant update on table "public"."integration_sync_logs" to "service_role";

grant delete on table "public"."integration_sync_runs" to "anon";

grant insert on table "public"."integration_sync_runs" to "anon";

grant references on table "public"."integration_sync_runs" to "anon";

grant select on table "public"."integration_sync_runs" to "anon";

grant trigger on table "public"."integration_sync_runs" to "anon";

grant truncate on table "public"."integration_sync_runs" to "anon";

grant update on table "public"."integration_sync_runs" to "anon";

grant delete on table "public"."integration_sync_runs" to "authenticated";

grant insert on table "public"."integration_sync_runs" to "authenticated";

grant references on table "public"."integration_sync_runs" to "authenticated";

grant select on table "public"."integration_sync_runs" to "authenticated";

grant trigger on table "public"."integration_sync_runs" to "authenticated";

grant truncate on table "public"."integration_sync_runs" to "authenticated";

grant update on table "public"."integration_sync_runs" to "authenticated";

grant delete on table "public"."integration_sync_runs" to "service_role";

grant insert on table "public"."integration_sync_runs" to "service_role";

grant references on table "public"."integration_sync_runs" to "service_role";

grant select on table "public"."integration_sync_runs" to "service_role";

grant trigger on table "public"."integration_sync_runs" to "service_role";

grant truncate on table "public"."integration_sync_runs" to "service_role";

grant update on table "public"."integration_sync_runs" to "service_role";

grant delete on table "public"."internal_messaging_gateways" to "service_role";

grant insert on table "public"."internal_messaging_gateways" to "service_role";

grant references on table "public"."internal_messaging_gateways" to "service_role";

grant select on table "public"."internal_messaging_gateways" to "service_role";

grant trigger on table "public"."internal_messaging_gateways" to "service_role";

grant truncate on table "public"."internal_messaging_gateways" to "service_role";

grant update on table "public"."internal_messaging_gateways" to "service_role";

grant delete on table "public"."job_queue_status" to "anon";

grant insert on table "public"."job_queue_status" to "anon";

grant references on table "public"."job_queue_status" to "anon";

grant select on table "public"."job_queue_status" to "anon";

grant trigger on table "public"."job_queue_status" to "anon";

grant truncate on table "public"."job_queue_status" to "anon";

grant update on table "public"."job_queue_status" to "anon";

grant delete on table "public"."job_queue_status" to "authenticated";

grant insert on table "public"."job_queue_status" to "authenticated";

grant references on table "public"."job_queue_status" to "authenticated";

grant select on table "public"."job_queue_status" to "authenticated";

grant trigger on table "public"."job_queue_status" to "authenticated";

grant truncate on table "public"."job_queue_status" to "authenticated";

grant update on table "public"."job_queue_status" to "authenticated";

grant delete on table "public"."job_queue_status" to "service_role";

grant insert on table "public"."job_queue_status" to "service_role";

grant references on table "public"."job_queue_status" to "service_role";

grant select on table "public"."job_queue_status" to "service_role";

grant trigger on table "public"."job_queue_status" to "service_role";

grant truncate on table "public"."job_queue_status" to "service_role";

grant update on table "public"."job_queue_status" to "service_role";

grant delete on table "public"."knowledge_article_versions" to "anon";

grant insert on table "public"."knowledge_article_versions" to "anon";

grant references on table "public"."knowledge_article_versions" to "anon";

grant select on table "public"."knowledge_article_versions" to "anon";

grant trigger on table "public"."knowledge_article_versions" to "anon";

grant truncate on table "public"."knowledge_article_versions" to "anon";

grant update on table "public"."knowledge_article_versions" to "anon";

grant delete on table "public"."knowledge_article_versions" to "authenticated";

grant insert on table "public"."knowledge_article_versions" to "authenticated";

grant references on table "public"."knowledge_article_versions" to "authenticated";

grant select on table "public"."knowledge_article_versions" to "authenticated";

grant trigger on table "public"."knowledge_article_versions" to "authenticated";

grant truncate on table "public"."knowledge_article_versions" to "authenticated";

grant update on table "public"."knowledge_article_versions" to "authenticated";

grant delete on table "public"."knowledge_article_versions" to "service_role";

grant insert on table "public"."knowledge_article_versions" to "service_role";

grant references on table "public"."knowledge_article_versions" to "service_role";

grant select on table "public"."knowledge_article_versions" to "service_role";

grant trigger on table "public"."knowledge_article_versions" to "service_role";

grant truncate on table "public"."knowledge_article_versions" to "service_role";

grant update on table "public"."knowledge_article_versions" to "service_role";

grant delete on table "public"."knowledge_articles" to "anon";

grant insert on table "public"."knowledge_articles" to "anon";

grant references on table "public"."knowledge_articles" to "anon";

grant select on table "public"."knowledge_articles" to "anon";

grant trigger on table "public"."knowledge_articles" to "anon";

grant truncate on table "public"."knowledge_articles" to "anon";

grant update on table "public"."knowledge_articles" to "anon";

grant delete on table "public"."knowledge_articles" to "authenticated";

grant insert on table "public"."knowledge_articles" to "authenticated";

grant references on table "public"."knowledge_articles" to "authenticated";

grant select on table "public"."knowledge_articles" to "authenticated";

grant trigger on table "public"."knowledge_articles" to "authenticated";

grant truncate on table "public"."knowledge_articles" to "authenticated";

grant update on table "public"."knowledge_articles" to "authenticated";

grant delete on table "public"."knowledge_articles" to "service_role";

grant insert on table "public"."knowledge_articles" to "service_role";

grant references on table "public"."knowledge_articles" to "service_role";

grant select on table "public"."knowledge_articles" to "service_role";

grant trigger on table "public"."knowledge_articles" to "service_role";

grant truncate on table "public"."knowledge_articles" to "service_role";

grant update on table "public"."knowledge_articles" to "service_role";

grant delete on table "public"."knowledge_categories" to "anon";

grant insert on table "public"."knowledge_categories" to "anon";

grant references on table "public"."knowledge_categories" to "anon";

grant select on table "public"."knowledge_categories" to "anon";

grant trigger on table "public"."knowledge_categories" to "anon";

grant truncate on table "public"."knowledge_categories" to "anon";

grant update on table "public"."knowledge_categories" to "anon";

grant delete on table "public"."knowledge_categories" to "authenticated";

grant insert on table "public"."knowledge_categories" to "authenticated";

grant references on table "public"."knowledge_categories" to "authenticated";

grant select on table "public"."knowledge_categories" to "authenticated";

grant trigger on table "public"."knowledge_categories" to "authenticated";

grant truncate on table "public"."knowledge_categories" to "authenticated";

grant update on table "public"."knowledge_categories" to "authenticated";

grant delete on table "public"."knowledge_categories" to "service_role";

grant insert on table "public"."knowledge_categories" to "service_role";

grant references on table "public"."knowledge_categories" to "service_role";

grant select on table "public"."knowledge_categories" to "service_role";

grant trigger on table "public"."knowledge_categories" to "service_role";

grant truncate on table "public"."knowledge_categories" to "service_role";

grant update on table "public"."knowledge_categories" to "service_role";

grant delete on table "public"."knowledge_faqs" to "anon";

grant insert on table "public"."knowledge_faqs" to "anon";

grant references on table "public"."knowledge_faqs" to "anon";

grant select on table "public"."knowledge_faqs" to "anon";

grant trigger on table "public"."knowledge_faqs" to "anon";

grant truncate on table "public"."knowledge_faqs" to "anon";

grant update on table "public"."knowledge_faqs" to "anon";

grant delete on table "public"."knowledge_faqs" to "authenticated";

grant insert on table "public"."knowledge_faqs" to "authenticated";

grant references on table "public"."knowledge_faqs" to "authenticated";

grant select on table "public"."knowledge_faqs" to "authenticated";

grant trigger on table "public"."knowledge_faqs" to "authenticated";

grant truncate on table "public"."knowledge_faqs" to "authenticated";

grant update on table "public"."knowledge_faqs" to "authenticated";

grant delete on table "public"."knowledge_faqs" to "service_role";

grant insert on table "public"."knowledge_faqs" to "service_role";

grant references on table "public"."knowledge_faqs" to "service_role";

grant select on table "public"."knowledge_faqs" to "service_role";

grant trigger on table "public"."knowledge_faqs" to "service_role";

grant truncate on table "public"."knowledge_faqs" to "service_role";

grant update on table "public"."knowledge_faqs" to "service_role";

grant delete on table "public"."knowledge_feedback" to "anon";

grant insert on table "public"."knowledge_feedback" to "anon";

grant references on table "public"."knowledge_feedback" to "anon";

grant select on table "public"."knowledge_feedback" to "anon";

grant trigger on table "public"."knowledge_feedback" to "anon";

grant truncate on table "public"."knowledge_feedback" to "anon";

grant update on table "public"."knowledge_feedback" to "anon";

grant delete on table "public"."knowledge_feedback" to "authenticated";

grant insert on table "public"."knowledge_feedback" to "authenticated";

grant references on table "public"."knowledge_feedback" to "authenticated";

grant select on table "public"."knowledge_feedback" to "authenticated";

grant trigger on table "public"."knowledge_feedback" to "authenticated";

grant truncate on table "public"."knowledge_feedback" to "authenticated";

grant update on table "public"."knowledge_feedback" to "authenticated";

grant delete on table "public"."knowledge_feedback" to "service_role";

grant insert on table "public"."knowledge_feedback" to "service_role";

grant references on table "public"."knowledge_feedback" to "service_role";

grant select on table "public"."knowledge_feedback" to "service_role";

grant trigger on table "public"."knowledge_feedback" to "service_role";

grant truncate on table "public"."knowledge_feedback" to "service_role";

grant update on table "public"."knowledge_feedback" to "service_role";

grant delete on table "public"."maintenance_runs" to "anon";

grant insert on table "public"."maintenance_runs" to "anon";

grant references on table "public"."maintenance_runs" to "anon";

grant select on table "public"."maintenance_runs" to "anon";

grant trigger on table "public"."maintenance_runs" to "anon";

grant truncate on table "public"."maintenance_runs" to "anon";

grant update on table "public"."maintenance_runs" to "anon";

grant delete on table "public"."maintenance_runs" to "authenticated";

grant insert on table "public"."maintenance_runs" to "authenticated";

grant references on table "public"."maintenance_runs" to "authenticated";

grant select on table "public"."maintenance_runs" to "authenticated";

grant trigger on table "public"."maintenance_runs" to "authenticated";

grant truncate on table "public"."maintenance_runs" to "authenticated";

grant update on table "public"."maintenance_runs" to "authenticated";

grant delete on table "public"."maintenance_runs" to "service_role";

grant insert on table "public"."maintenance_runs" to "service_role";

grant references on table "public"."maintenance_runs" to "service_role";

grant select on table "public"."maintenance_runs" to "service_role";

grant trigger on table "public"."maintenance_runs" to "service_role";

grant truncate on table "public"."maintenance_runs" to "service_role";

grant update on table "public"."maintenance_runs" to "service_role";

grant delete on table "public"."maintenance_tasks" to "anon";

grant insert on table "public"."maintenance_tasks" to "anon";

grant references on table "public"."maintenance_tasks" to "anon";

grant select on table "public"."maintenance_tasks" to "anon";

grant trigger on table "public"."maintenance_tasks" to "anon";

grant truncate on table "public"."maintenance_tasks" to "anon";

grant update on table "public"."maintenance_tasks" to "anon";

grant delete on table "public"."maintenance_tasks" to "authenticated";

grant insert on table "public"."maintenance_tasks" to "authenticated";

grant references on table "public"."maintenance_tasks" to "authenticated";

grant select on table "public"."maintenance_tasks" to "authenticated";

grant trigger on table "public"."maintenance_tasks" to "authenticated";

grant truncate on table "public"."maintenance_tasks" to "authenticated";

grant update on table "public"."maintenance_tasks" to "authenticated";

grant delete on table "public"."maintenance_tasks" to "service_role";

grant insert on table "public"."maintenance_tasks" to "service_role";

grant references on table "public"."maintenance_tasks" to "service_role";

grant select on table "public"."maintenance_tasks" to "service_role";

grant trigger on table "public"."maintenance_tasks" to "service_role";

grant truncate on table "public"."maintenance_tasks" to "service_role";

grant update on table "public"."maintenance_tasks" to "service_role";

grant delete on table "public"."media_access_logs" to "anon";

grant insert on table "public"."media_access_logs" to "anon";

grant references on table "public"."media_access_logs" to "anon";

grant select on table "public"."media_access_logs" to "anon";

grant trigger on table "public"."media_access_logs" to "anon";

grant truncate on table "public"."media_access_logs" to "anon";

grant update on table "public"."media_access_logs" to "anon";

grant delete on table "public"."media_access_logs" to "authenticated";

grant insert on table "public"."media_access_logs" to "authenticated";

grant references on table "public"."media_access_logs" to "authenticated";

grant select on table "public"."media_access_logs" to "authenticated";

grant trigger on table "public"."media_access_logs" to "authenticated";

grant truncate on table "public"."media_access_logs" to "authenticated";

grant update on table "public"."media_access_logs" to "authenticated";

grant delete on table "public"."media_access_logs" to "service_role";

grant insert on table "public"."media_access_logs" to "service_role";

grant references on table "public"."media_access_logs" to "service_role";

grant select on table "public"."media_access_logs" to "service_role";

grant trigger on table "public"."media_access_logs" to "service_role";

grant truncate on table "public"."media_access_logs" to "service_role";

grant update on table "public"."media_access_logs" to "service_role";

grant delete on table "public"."media_processing_jobs" to "anon";

grant insert on table "public"."media_processing_jobs" to "anon";

grant references on table "public"."media_processing_jobs" to "anon";

grant select on table "public"."media_processing_jobs" to "anon";

grant trigger on table "public"."media_processing_jobs" to "anon";

grant truncate on table "public"."media_processing_jobs" to "anon";

grant update on table "public"."media_processing_jobs" to "anon";

grant delete on table "public"."media_processing_jobs" to "authenticated";

grant insert on table "public"."media_processing_jobs" to "authenticated";

grant references on table "public"."media_processing_jobs" to "authenticated";

grant select on table "public"."media_processing_jobs" to "authenticated";

grant trigger on table "public"."media_processing_jobs" to "authenticated";

grant truncate on table "public"."media_processing_jobs" to "authenticated";

grant update on table "public"."media_processing_jobs" to "authenticated";

grant delete on table "public"."media_processing_jobs" to "service_role";

grant insert on table "public"."media_processing_jobs" to "service_role";

grant references on table "public"."media_processing_jobs" to "service_role";

grant select on table "public"."media_processing_jobs" to "service_role";

grant trigger on table "public"."media_processing_jobs" to "service_role";

grant truncate on table "public"."media_processing_jobs" to "service_role";

grant update on table "public"."media_processing_jobs" to "service_role";

grant delete on table "public"."message_media" to "anon";

grant insert on table "public"."message_media" to "anon";

grant references on table "public"."message_media" to "anon";

grant select on table "public"."message_media" to "anon";

grant trigger on table "public"."message_media" to "anon";

grant truncate on table "public"."message_media" to "anon";

grant update on table "public"."message_media" to "anon";

grant delete on table "public"."message_media" to "authenticated";

grant insert on table "public"."message_media" to "authenticated";

grant references on table "public"."message_media" to "authenticated";

grant select on table "public"."message_media" to "authenticated";

grant trigger on table "public"."message_media" to "authenticated";

grant truncate on table "public"."message_media" to "authenticated";

grant update on table "public"."message_media" to "authenticated";

grant delete on table "public"."message_media" to "service_role";

grant insert on table "public"."message_media" to "service_role";

grant references on table "public"."message_media" to "service_role";

grant select on table "public"."message_media" to "service_role";

grant trigger on table "public"."message_media" to "service_role";

grant truncate on table "public"."message_media" to "service_role";

grant update on table "public"."message_media" to "service_role";

grant delete on table "public"."message_outbox" to "anon";

grant insert on table "public"."message_outbox" to "anon";

grant references on table "public"."message_outbox" to "anon";

grant select on table "public"."message_outbox" to "anon";

grant trigger on table "public"."message_outbox" to "anon";

grant truncate on table "public"."message_outbox" to "anon";

grant update on table "public"."message_outbox" to "anon";

grant delete on table "public"."message_outbox" to "authenticated";

grant insert on table "public"."message_outbox" to "authenticated";

grant references on table "public"."message_outbox" to "authenticated";

grant select on table "public"."message_outbox" to "authenticated";

grant trigger on table "public"."message_outbox" to "authenticated";

grant truncate on table "public"."message_outbox" to "authenticated";

grant update on table "public"."message_outbox" to "authenticated";

grant delete on table "public"."message_outbox" to "service_role";

grant insert on table "public"."message_outbox" to "service_role";

grant references on table "public"."message_outbox" to "service_role";

grant select on table "public"."message_outbox" to "service_role";

grant trigger on table "public"."message_outbox" to "service_role";

grant truncate on table "public"."message_outbox" to "service_role";

grant update on table "public"."message_outbox" to "service_role";

grant delete on table "public"."message_transcriptions" to "anon";

grant insert on table "public"."message_transcriptions" to "anon";

grant references on table "public"."message_transcriptions" to "anon";

grant select on table "public"."message_transcriptions" to "anon";

grant trigger on table "public"."message_transcriptions" to "anon";

grant truncate on table "public"."message_transcriptions" to "anon";

grant update on table "public"."message_transcriptions" to "anon";

grant delete on table "public"."message_transcriptions" to "authenticated";

grant insert on table "public"."message_transcriptions" to "authenticated";

grant references on table "public"."message_transcriptions" to "authenticated";

grant select on table "public"."message_transcriptions" to "authenticated";

grant trigger on table "public"."message_transcriptions" to "authenticated";

grant truncate on table "public"."message_transcriptions" to "authenticated";

grant update on table "public"."message_transcriptions" to "authenticated";

grant delete on table "public"."message_transcriptions" to "service_role";

grant insert on table "public"."message_transcriptions" to "service_role";

grant references on table "public"."message_transcriptions" to "service_role";

grant select on table "public"."message_transcriptions" to "service_role";

grant trigger on table "public"."message_transcriptions" to "service_role";

grant truncate on table "public"."message_transcriptions" to "service_role";

grant update on table "public"."message_transcriptions" to "service_role";

grant delete on table "public"."messaging_policies" to "anon";

grant insert on table "public"."messaging_policies" to "anon";

grant references on table "public"."messaging_policies" to "anon";

grant select on table "public"."messaging_policies" to "anon";

grant trigger on table "public"."messaging_policies" to "anon";

grant truncate on table "public"."messaging_policies" to "anon";

grant update on table "public"."messaging_policies" to "anon";

grant delete on table "public"."messaging_policies" to "authenticated";

grant insert on table "public"."messaging_policies" to "authenticated";

grant references on table "public"."messaging_policies" to "authenticated";

grant select on table "public"."messaging_policies" to "authenticated";

grant trigger on table "public"."messaging_policies" to "authenticated";

grant truncate on table "public"."messaging_policies" to "authenticated";

grant update on table "public"."messaging_policies" to "authenticated";

grant delete on table "public"."messaging_policies" to "service_role";

grant insert on table "public"."messaging_policies" to "service_role";

grant references on table "public"."messaging_policies" to "service_role";

grant select on table "public"."messaging_policies" to "service_role";

grant trigger on table "public"."messaging_policies" to "service_role";

grant truncate on table "public"."messaging_policies" to "service_role";

grant update on table "public"."messaging_policies" to "service_role";

grant delete on table "public"."navigation_items" to "anon";

grant insert on table "public"."navigation_items" to "anon";

grant references on table "public"."navigation_items" to "anon";

grant select on table "public"."navigation_items" to "anon";

grant trigger on table "public"."navigation_items" to "anon";

grant truncate on table "public"."navigation_items" to "anon";

grant update on table "public"."navigation_items" to "anon";

grant delete on table "public"."navigation_items" to "authenticated";

grant insert on table "public"."navigation_items" to "authenticated";

grant references on table "public"."navigation_items" to "authenticated";

grant select on table "public"."navigation_items" to "authenticated";

grant trigger on table "public"."navigation_items" to "authenticated";

grant truncate on table "public"."navigation_items" to "authenticated";

grant update on table "public"."navigation_items" to "authenticated";

grant delete on table "public"."navigation_items" to "service_role";

grant insert on table "public"."navigation_items" to "service_role";

grant references on table "public"."navigation_items" to "service_role";

grant select on table "public"."navigation_items" to "service_role";

grant trigger on table "public"."navigation_items" to "service_role";

grant truncate on table "public"."navigation_items" to "service_role";

grant update on table "public"."navigation_items" to "service_role";

grant delete on table "public"."notification_channels" to "anon";

grant insert on table "public"."notification_channels" to "anon";

grant references on table "public"."notification_channels" to "anon";

grant select on table "public"."notification_channels" to "anon";

grant trigger on table "public"."notification_channels" to "anon";

grant truncate on table "public"."notification_channels" to "anon";

grant update on table "public"."notification_channels" to "anon";

grant delete on table "public"."notification_channels" to "authenticated";

grant insert on table "public"."notification_channels" to "authenticated";

grant references on table "public"."notification_channels" to "authenticated";

grant select on table "public"."notification_channels" to "authenticated";

grant trigger on table "public"."notification_channels" to "authenticated";

grant truncate on table "public"."notification_channels" to "authenticated";

grant update on table "public"."notification_channels" to "authenticated";

grant delete on table "public"."notification_channels" to "service_role";

grant insert on table "public"."notification_channels" to "service_role";

grant references on table "public"."notification_channels" to "service_role";

grant select on table "public"."notification_channels" to "service_role";

grant trigger on table "public"."notification_channels" to "service_role";

grant truncate on table "public"."notification_channels" to "service_role";

grant update on table "public"."notification_channels" to "service_role";

grant delete on table "public"."notification_deliveries" to "anon";

grant insert on table "public"."notification_deliveries" to "anon";

grant references on table "public"."notification_deliveries" to "anon";

grant select on table "public"."notification_deliveries" to "anon";

grant trigger on table "public"."notification_deliveries" to "anon";

grant truncate on table "public"."notification_deliveries" to "anon";

grant update on table "public"."notification_deliveries" to "anon";

grant delete on table "public"."notification_deliveries" to "authenticated";

grant insert on table "public"."notification_deliveries" to "authenticated";

grant references on table "public"."notification_deliveries" to "authenticated";

grant select on table "public"."notification_deliveries" to "authenticated";

grant trigger on table "public"."notification_deliveries" to "authenticated";

grant truncate on table "public"."notification_deliveries" to "authenticated";

grant update on table "public"."notification_deliveries" to "authenticated";

grant delete on table "public"."notification_deliveries" to "service_role";

grant insert on table "public"."notification_deliveries" to "service_role";

grant references on table "public"."notification_deliveries" to "service_role";

grant select on table "public"."notification_deliveries" to "service_role";

grant trigger on table "public"."notification_deliveries" to "service_role";

grant truncate on table "public"."notification_deliveries" to "service_role";

grant update on table "public"."notification_deliveries" to "service_role";

grant delete on table "public"."notification_rules" to "anon";

grant insert on table "public"."notification_rules" to "anon";

grant references on table "public"."notification_rules" to "anon";

grant select on table "public"."notification_rules" to "anon";

grant trigger on table "public"."notification_rules" to "anon";

grant truncate on table "public"."notification_rules" to "anon";

grant update on table "public"."notification_rules" to "anon";

grant delete on table "public"."notification_rules" to "authenticated";

grant insert on table "public"."notification_rules" to "authenticated";

grant references on table "public"."notification_rules" to "authenticated";

grant select on table "public"."notification_rules" to "authenticated";

grant trigger on table "public"."notification_rules" to "authenticated";

grant truncate on table "public"."notification_rules" to "authenticated";

grant update on table "public"."notification_rules" to "authenticated";

grant delete on table "public"."notification_rules" to "service_role";

grant insert on table "public"."notification_rules" to "service_role";

grant references on table "public"."notification_rules" to "service_role";

grant select on table "public"."notification_rules" to "service_role";

grant trigger on table "public"."notification_rules" to "service_role";

grant truncate on table "public"."notification_rules" to "service_role";

grant update on table "public"."notification_rules" to "service_role";

grant delete on table "public"."notification_templates" to "anon";

grant insert on table "public"."notification_templates" to "anon";

grant references on table "public"."notification_templates" to "anon";

grant select on table "public"."notification_templates" to "anon";

grant trigger on table "public"."notification_templates" to "anon";

grant truncate on table "public"."notification_templates" to "anon";

grant update on table "public"."notification_templates" to "anon";

grant delete on table "public"."notification_templates" to "authenticated";

grant insert on table "public"."notification_templates" to "authenticated";

grant references on table "public"."notification_templates" to "authenticated";

grant select on table "public"."notification_templates" to "authenticated";

grant trigger on table "public"."notification_templates" to "authenticated";

grant truncate on table "public"."notification_templates" to "authenticated";

grant update on table "public"."notification_templates" to "authenticated";

grant delete on table "public"."notification_templates" to "service_role";

grant insert on table "public"."notification_templates" to "service_role";

grant references on table "public"."notification_templates" to "service_role";

grant select on table "public"."notification_templates" to "service_role";

grant trigger on table "public"."notification_templates" to "service_role";

grant truncate on table "public"."notification_templates" to "service_role";

grant update on table "public"."notification_templates" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."onboarding_flows" to "anon";

grant insert on table "public"."onboarding_flows" to "anon";

grant references on table "public"."onboarding_flows" to "anon";

grant select on table "public"."onboarding_flows" to "anon";

grant trigger on table "public"."onboarding_flows" to "anon";

grant truncate on table "public"."onboarding_flows" to "anon";

grant update on table "public"."onboarding_flows" to "anon";

grant delete on table "public"."onboarding_flows" to "authenticated";

grant insert on table "public"."onboarding_flows" to "authenticated";

grant references on table "public"."onboarding_flows" to "authenticated";

grant select on table "public"."onboarding_flows" to "authenticated";

grant trigger on table "public"."onboarding_flows" to "authenticated";

grant truncate on table "public"."onboarding_flows" to "authenticated";

grant update on table "public"."onboarding_flows" to "authenticated";

grant delete on table "public"."onboarding_flows" to "service_role";

grant insert on table "public"."onboarding_flows" to "service_role";

grant references on table "public"."onboarding_flows" to "service_role";

grant select on table "public"."onboarding_flows" to "service_role";

grant trigger on table "public"."onboarding_flows" to "service_role";

grant truncate on table "public"."onboarding_flows" to "service_role";

grant update on table "public"."onboarding_flows" to "service_role";

grant delete on table "public"."onboarding_steps" to "anon";

grant insert on table "public"."onboarding_steps" to "anon";

grant references on table "public"."onboarding_steps" to "anon";

grant select on table "public"."onboarding_steps" to "anon";

grant trigger on table "public"."onboarding_steps" to "anon";

grant truncate on table "public"."onboarding_steps" to "anon";

grant update on table "public"."onboarding_steps" to "anon";

grant delete on table "public"."onboarding_steps" to "authenticated";

grant insert on table "public"."onboarding_steps" to "authenticated";

grant references on table "public"."onboarding_steps" to "authenticated";

grant select on table "public"."onboarding_steps" to "authenticated";

grant trigger on table "public"."onboarding_steps" to "authenticated";

grant truncate on table "public"."onboarding_steps" to "authenticated";

grant update on table "public"."onboarding_steps" to "authenticated";

grant delete on table "public"."onboarding_steps" to "service_role";

grant insert on table "public"."onboarding_steps" to "service_role";

grant references on table "public"."onboarding_steps" to "service_role";

grant select on table "public"."onboarding_steps" to "service_role";

grant trigger on table "public"."onboarding_steps" to "service_role";

grant truncate on table "public"."onboarding_steps" to "service_role";

grant update on table "public"."onboarding_steps" to "service_role";

grant delete on table "public"."operational_checklist_items" to "anon";

grant insert on table "public"."operational_checklist_items" to "anon";

grant references on table "public"."operational_checklist_items" to "anon";

grant select on table "public"."operational_checklist_items" to "anon";

grant trigger on table "public"."operational_checklist_items" to "anon";

grant truncate on table "public"."operational_checklist_items" to "anon";

grant update on table "public"."operational_checklist_items" to "anon";

grant delete on table "public"."operational_checklist_items" to "authenticated";

grant insert on table "public"."operational_checklist_items" to "authenticated";

grant references on table "public"."operational_checklist_items" to "authenticated";

grant select on table "public"."operational_checklist_items" to "authenticated";

grant trigger on table "public"."operational_checklist_items" to "authenticated";

grant truncate on table "public"."operational_checklist_items" to "authenticated";

grant update on table "public"."operational_checklist_items" to "authenticated";

grant delete on table "public"."operational_checklist_items" to "service_role";

grant insert on table "public"."operational_checklist_items" to "service_role";

grant references on table "public"."operational_checklist_items" to "service_role";

grant select on table "public"."operational_checklist_items" to "service_role";

grant trigger on table "public"."operational_checklist_items" to "service_role";

grant truncate on table "public"."operational_checklist_items" to "service_role";

grant update on table "public"."operational_checklist_items" to "service_role";

grant delete on table "public"."operational_checklist_runs" to "anon";

grant insert on table "public"."operational_checklist_runs" to "anon";

grant references on table "public"."operational_checklist_runs" to "anon";

grant select on table "public"."operational_checklist_runs" to "anon";

grant trigger on table "public"."operational_checklist_runs" to "anon";

grant truncate on table "public"."operational_checklist_runs" to "anon";

grant update on table "public"."operational_checklist_runs" to "anon";

grant delete on table "public"."operational_checklist_runs" to "authenticated";

grant insert on table "public"."operational_checklist_runs" to "authenticated";

grant references on table "public"."operational_checklist_runs" to "authenticated";

grant select on table "public"."operational_checklist_runs" to "authenticated";

grant trigger on table "public"."operational_checklist_runs" to "authenticated";

grant truncate on table "public"."operational_checklist_runs" to "authenticated";

grant update on table "public"."operational_checklist_runs" to "authenticated";

grant delete on table "public"."operational_checklist_runs" to "service_role";

grant insert on table "public"."operational_checklist_runs" to "service_role";

grant references on table "public"."operational_checklist_runs" to "service_role";

grant select on table "public"."operational_checklist_runs" to "service_role";

grant trigger on table "public"."operational_checklist_runs" to "service_role";

grant truncate on table "public"."operational_checklist_runs" to "service_role";

grant update on table "public"."operational_checklist_runs" to "service_role";

grant delete on table "public"."operational_checklists" to "anon";

grant insert on table "public"."operational_checklists" to "anon";

grant references on table "public"."operational_checklists" to "anon";

grant select on table "public"."operational_checklists" to "anon";

grant trigger on table "public"."operational_checklists" to "anon";

grant truncate on table "public"."operational_checklists" to "anon";

grant update on table "public"."operational_checklists" to "anon";

grant delete on table "public"."operational_checklists" to "authenticated";

grant insert on table "public"."operational_checklists" to "authenticated";

grant references on table "public"."operational_checklists" to "authenticated";

grant select on table "public"."operational_checklists" to "authenticated";

grant trigger on table "public"."operational_checklists" to "authenticated";

grant truncate on table "public"."operational_checklists" to "authenticated";

grant update on table "public"."operational_checklists" to "authenticated";

grant delete on table "public"."operational_checklists" to "service_role";

grant insert on table "public"."operational_checklists" to "service_role";

grant references on table "public"."operational_checklists" to "service_role";

grant select on table "public"."operational_checklists" to "service_role";

grant trigger on table "public"."operational_checklists" to "service_role";

grant truncate on table "public"."operational_checklists" to "service_role";

grant update on table "public"."operational_checklists" to "service_role";

grant delete on table "public"."organization_pipeline_stages" to "anon";

grant insert on table "public"."organization_pipeline_stages" to "anon";

grant references on table "public"."organization_pipeline_stages" to "anon";

grant select on table "public"."organization_pipeline_stages" to "anon";

grant trigger on table "public"."organization_pipeline_stages" to "anon";

grant truncate on table "public"."organization_pipeline_stages" to "anon";

grant update on table "public"."organization_pipeline_stages" to "anon";

grant delete on table "public"."organization_pipeline_stages" to "authenticated";

grant insert on table "public"."organization_pipeline_stages" to "authenticated";

grant references on table "public"."organization_pipeline_stages" to "authenticated";

grant select on table "public"."organization_pipeline_stages" to "authenticated";

grant trigger on table "public"."organization_pipeline_stages" to "authenticated";

grant truncate on table "public"."organization_pipeline_stages" to "authenticated";

grant update on table "public"."organization_pipeline_stages" to "authenticated";

grant delete on table "public"."organization_pipeline_stages" to "service_role";

grant insert on table "public"."organization_pipeline_stages" to "service_role";

grant references on table "public"."organization_pipeline_stages" to "service_role";

grant select on table "public"."organization_pipeline_stages" to "service_role";

grant trigger on table "public"."organization_pipeline_stages" to "service_role";

grant truncate on table "public"."organization_pipeline_stages" to "service_role";

grant update on table "public"."organization_pipeline_stages" to "service_role";

grant delete on table "public"."organization_pipelines" to "anon";

grant insert on table "public"."organization_pipelines" to "anon";

grant references on table "public"."organization_pipelines" to "anon";

grant select on table "public"."organization_pipelines" to "anon";

grant trigger on table "public"."organization_pipelines" to "anon";

grant truncate on table "public"."organization_pipelines" to "anon";

grant update on table "public"."organization_pipelines" to "anon";

grant delete on table "public"."organization_pipelines" to "authenticated";

grant insert on table "public"."organization_pipelines" to "authenticated";

grant references on table "public"."organization_pipelines" to "authenticated";

grant select on table "public"."organization_pipelines" to "authenticated";

grant trigger on table "public"."organization_pipelines" to "authenticated";

grant truncate on table "public"."organization_pipelines" to "authenticated";

grant update on table "public"."organization_pipelines" to "authenticated";

grant delete on table "public"."organization_pipelines" to "service_role";

grant insert on table "public"."organization_pipelines" to "service_role";

grant references on table "public"."organization_pipelines" to "service_role";

grant select on table "public"."organization_pipelines" to "service_role";

grant trigger on table "public"."organization_pipelines" to "service_role";

grant truncate on table "public"."organization_pipelines" to "service_role";

grant update on table "public"."organization_pipelines" to "service_role";

grant delete on table "public"."organization_products_services" to "anon";

grant insert on table "public"."organization_products_services" to "anon";

grant references on table "public"."organization_products_services" to "anon";

grant select on table "public"."organization_products_services" to "anon";

grant trigger on table "public"."organization_products_services" to "anon";

grant truncate on table "public"."organization_products_services" to "anon";

grant update on table "public"."organization_products_services" to "anon";

grant delete on table "public"."organization_products_services" to "authenticated";

grant insert on table "public"."organization_products_services" to "authenticated";

grant references on table "public"."organization_products_services" to "authenticated";

grant select on table "public"."organization_products_services" to "authenticated";

grant trigger on table "public"."organization_products_services" to "authenticated";

grant truncate on table "public"."organization_products_services" to "authenticated";

grant update on table "public"."organization_products_services" to "authenticated";

grant delete on table "public"."organization_products_services" to "service_role";

grant insert on table "public"."organization_products_services" to "service_role";

grant references on table "public"."organization_products_services" to "service_role";

grant select on table "public"."organization_products_services" to "service_role";

grant trigger on table "public"."organization_products_services" to "service_role";

grant truncate on table "public"."organization_products_services" to "service_role";

grant update on table "public"."organization_products_services" to "service_role";

grant delete on table "public"."organization_profiles" to "anon";

grant insert on table "public"."organization_profiles" to "anon";

grant references on table "public"."organization_profiles" to "anon";

grant select on table "public"."organization_profiles" to "anon";

grant trigger on table "public"."organization_profiles" to "anon";

grant truncate on table "public"."organization_profiles" to "anon";

grant update on table "public"."organization_profiles" to "anon";

grant delete on table "public"."organization_profiles" to "authenticated";

grant insert on table "public"."organization_profiles" to "authenticated";

grant references on table "public"."organization_profiles" to "authenticated";

grant select on table "public"."organization_profiles" to "authenticated";

grant trigger on table "public"."organization_profiles" to "authenticated";

grant truncate on table "public"."organization_profiles" to "authenticated";

grant update on table "public"."organization_profiles" to "authenticated";

grant delete on table "public"."organization_profiles" to "service_role";

grant insert on table "public"."organization_profiles" to "service_role";

grant references on table "public"."organization_profiles" to "service_role";

grant select on table "public"."organization_profiles" to "service_role";

grant trigger on table "public"."organization_profiles" to "service_role";

grant truncate on table "public"."organization_profiles" to "service_role";

grant update on table "public"."organization_profiles" to "service_role";

grant delete on table "public"."organization_tags" to "anon";

grant insert on table "public"."organization_tags" to "anon";

grant references on table "public"."organization_tags" to "anon";

grant select on table "public"."organization_tags" to "anon";

grant trigger on table "public"."organization_tags" to "anon";

grant truncate on table "public"."organization_tags" to "anon";

grant update on table "public"."organization_tags" to "anon";

grant delete on table "public"."organization_tags" to "authenticated";

grant insert on table "public"."organization_tags" to "authenticated";

grant references on table "public"."organization_tags" to "authenticated";

grant select on table "public"."organization_tags" to "authenticated";

grant trigger on table "public"."organization_tags" to "authenticated";

grant truncate on table "public"."organization_tags" to "authenticated";

grant update on table "public"."organization_tags" to "authenticated";

grant delete on table "public"."organization_tags" to "service_role";

grant insert on table "public"."organization_tags" to "service_role";

grant references on table "public"."organization_tags" to "service_role";

grant select on table "public"."organization_tags" to "service_role";

grant trigger on table "public"."organization_tags" to "service_role";

grant truncate on table "public"."organization_tags" to "service_role";

grant update on table "public"."organization_tags" to "service_role";

grant delete on table "public"."organizations" to "anon";

grant insert on table "public"."organizations" to "anon";

grant select on table "public"."organizations" to "anon";

grant update on table "public"."organizations" to "anon";

grant delete on table "public"."organizations" to "authenticated";

grant insert on table "public"."organizations" to "authenticated";

grant select on table "public"."organizations" to "authenticated";

grant update on table "public"."organizations" to "authenticated";

grant delete on table "public"."organizations" to "service_role";

grant insert on table "public"."organizations" to "service_role";

grant select on table "public"."organizations" to "service_role";

grant update on table "public"."organizations" to "service_role";

grant delete on table "public"."outbound_webhook_attempts" to "anon";

grant insert on table "public"."outbound_webhook_attempts" to "anon";

grant references on table "public"."outbound_webhook_attempts" to "anon";

grant select on table "public"."outbound_webhook_attempts" to "anon";

grant trigger on table "public"."outbound_webhook_attempts" to "anon";

grant truncate on table "public"."outbound_webhook_attempts" to "anon";

grant update on table "public"."outbound_webhook_attempts" to "anon";

grant delete on table "public"."outbound_webhook_attempts" to "authenticated";

grant insert on table "public"."outbound_webhook_attempts" to "authenticated";

grant references on table "public"."outbound_webhook_attempts" to "authenticated";

grant select on table "public"."outbound_webhook_attempts" to "authenticated";

grant trigger on table "public"."outbound_webhook_attempts" to "authenticated";

grant truncate on table "public"."outbound_webhook_attempts" to "authenticated";

grant update on table "public"."outbound_webhook_attempts" to "authenticated";

grant delete on table "public"."outbound_webhook_attempts" to "service_role";

grant insert on table "public"."outbound_webhook_attempts" to "service_role";

grant references on table "public"."outbound_webhook_attempts" to "service_role";

grant select on table "public"."outbound_webhook_attempts" to "service_role";

grant trigger on table "public"."outbound_webhook_attempts" to "service_role";

grant truncate on table "public"."outbound_webhook_attempts" to "service_role";

grant update on table "public"."outbound_webhook_attempts" to "service_role";

grant delete on table "public"."outbound_webhook_deliveries" to "anon";

grant insert on table "public"."outbound_webhook_deliveries" to "anon";

grant references on table "public"."outbound_webhook_deliveries" to "anon";

grant select on table "public"."outbound_webhook_deliveries" to "anon";

grant trigger on table "public"."outbound_webhook_deliveries" to "anon";

grant truncate on table "public"."outbound_webhook_deliveries" to "anon";

grant update on table "public"."outbound_webhook_deliveries" to "anon";

grant delete on table "public"."outbound_webhook_deliveries" to "authenticated";

grant insert on table "public"."outbound_webhook_deliveries" to "authenticated";

grant references on table "public"."outbound_webhook_deliveries" to "authenticated";

grant select on table "public"."outbound_webhook_deliveries" to "authenticated";

grant trigger on table "public"."outbound_webhook_deliveries" to "authenticated";

grant truncate on table "public"."outbound_webhook_deliveries" to "authenticated";

grant update on table "public"."outbound_webhook_deliveries" to "authenticated";

grant delete on table "public"."outbound_webhook_deliveries" to "service_role";

grant insert on table "public"."outbound_webhook_deliveries" to "service_role";

grant references on table "public"."outbound_webhook_deliveries" to "service_role";

grant select on table "public"."outbound_webhook_deliveries" to "service_role";

grant trigger on table "public"."outbound_webhook_deliveries" to "service_role";

grant truncate on table "public"."outbound_webhook_deliveries" to "service_role";

grant update on table "public"."outbound_webhook_deliveries" to "service_role";

grant delete on table "public"."outbound_webhooks" to "anon";

grant insert on table "public"."outbound_webhooks" to "anon";

grant references on table "public"."outbound_webhooks" to "anon";

grant select on table "public"."outbound_webhooks" to "anon";

grant trigger on table "public"."outbound_webhooks" to "anon";

grant truncate on table "public"."outbound_webhooks" to "anon";

grant update on table "public"."outbound_webhooks" to "anon";

grant delete on table "public"."outbound_webhooks" to "authenticated";

grant insert on table "public"."outbound_webhooks" to "authenticated";

grant references on table "public"."outbound_webhooks" to "authenticated";

grant select on table "public"."outbound_webhooks" to "authenticated";

grant trigger on table "public"."outbound_webhooks" to "authenticated";

grant truncate on table "public"."outbound_webhooks" to "authenticated";

grant update on table "public"."outbound_webhooks" to "authenticated";

grant delete on table "public"."outbound_webhooks" to "service_role";

grant insert on table "public"."outbound_webhooks" to "service_role";

grant references on table "public"."outbound_webhooks" to "service_role";

grant select on table "public"."outbound_webhooks" to "service_role";

grant trigger on table "public"."outbound_webhooks" to "service_role";

grant truncate on table "public"."outbound_webhooks" to "service_role";

grant update on table "public"."outbound_webhooks" to "service_role";

grant delete on table "public"."payment_methods" to "anon";

grant insert on table "public"."payment_methods" to "anon";

grant references on table "public"."payment_methods" to "anon";

grant select on table "public"."payment_methods" to "anon";

grant trigger on table "public"."payment_methods" to "anon";

grant truncate on table "public"."payment_methods" to "anon";

grant update on table "public"."payment_methods" to "anon";

grant delete on table "public"."payment_methods" to "authenticated";

grant insert on table "public"."payment_methods" to "authenticated";

grant references on table "public"."payment_methods" to "authenticated";

grant select on table "public"."payment_methods" to "authenticated";

grant trigger on table "public"."payment_methods" to "authenticated";

grant truncate on table "public"."payment_methods" to "authenticated";

grant update on table "public"."payment_methods" to "authenticated";

grant delete on table "public"."payment_methods" to "service_role";

grant insert on table "public"."payment_methods" to "service_role";

grant references on table "public"."payment_methods" to "service_role";

grant select on table "public"."payment_methods" to "service_role";

grant trigger on table "public"."payment_methods" to "service_role";

grant truncate on table "public"."payment_methods" to "service_role";

grant update on table "public"."payment_methods" to "service_role";

grant delete on table "public"."pipeline_items" to "anon";

grant insert on table "public"."pipeline_items" to "anon";

grant select on table "public"."pipeline_items" to "anon";

grant update on table "public"."pipeline_items" to "anon";

grant delete on table "public"."pipeline_items" to "authenticated";

grant insert on table "public"."pipeline_items" to "authenticated";

grant select on table "public"."pipeline_items" to "authenticated";

grant update on table "public"."pipeline_items" to "authenticated";

grant delete on table "public"."pipeline_items" to "service_role";

grant insert on table "public"."pipeline_items" to "service_role";

grant select on table "public"."pipeline_items" to "service_role";

grant update on table "public"."pipeline_items" to "service_role";

grant delete on table "public"."pipeline_stages" to "anon";

grant insert on table "public"."pipeline_stages" to "anon";

grant select on table "public"."pipeline_stages" to "anon";

grant update on table "public"."pipeline_stages" to "anon";

grant delete on table "public"."pipeline_stages" to "authenticated";

grant insert on table "public"."pipeline_stages" to "authenticated";

grant select on table "public"."pipeline_stages" to "authenticated";

grant update on table "public"."pipeline_stages" to "authenticated";

grant delete on table "public"."pipeline_stages" to "service_role";

grant insert on table "public"."pipeline_stages" to "service_role";

grant select on table "public"."pipeline_stages" to "service_role";

grant update on table "public"."pipeline_stages" to "service_role";

grant delete on table "public"."provider_events" to "anon";

grant insert on table "public"."provider_events" to "anon";

grant select on table "public"."provider_events" to "anon";

grant update on table "public"."provider_events" to "anon";

grant delete on table "public"."provider_events" to "authenticated";

grant insert on table "public"."provider_events" to "authenticated";

grant select on table "public"."provider_events" to "authenticated";

grant update on table "public"."provider_events" to "authenticated";

grant delete on table "public"."provider_events" to "service_role";

grant insert on table "public"."provider_events" to "service_role";

grant select on table "public"."provider_events" to "service_role";

grant update on table "public"."provider_events" to "service_role";

grant delete on table "public"."qa_bugs" to "anon";

grant insert on table "public"."qa_bugs" to "anon";

grant references on table "public"."qa_bugs" to "anon";

grant select on table "public"."qa_bugs" to "anon";

grant trigger on table "public"."qa_bugs" to "anon";

grant truncate on table "public"."qa_bugs" to "anon";

grant update on table "public"."qa_bugs" to "anon";

grant delete on table "public"."qa_bugs" to "authenticated";

grant insert on table "public"."qa_bugs" to "authenticated";

grant references on table "public"."qa_bugs" to "authenticated";

grant select on table "public"."qa_bugs" to "authenticated";

grant trigger on table "public"."qa_bugs" to "authenticated";

grant truncate on table "public"."qa_bugs" to "authenticated";

grant update on table "public"."qa_bugs" to "authenticated";

grant delete on table "public"."qa_bugs" to "service_role";

grant insert on table "public"."qa_bugs" to "service_role";

grant references on table "public"."qa_bugs" to "service_role";

grant select on table "public"."qa_bugs" to "service_role";

grant trigger on table "public"."qa_bugs" to "service_role";

grant truncate on table "public"."qa_bugs" to "service_role";

grant update on table "public"."qa_bugs" to "service_role";

grant delete on table "public"."qa_test_cases" to "anon";

grant insert on table "public"."qa_test_cases" to "anon";

grant references on table "public"."qa_test_cases" to "anon";

grant select on table "public"."qa_test_cases" to "anon";

grant trigger on table "public"."qa_test_cases" to "anon";

grant truncate on table "public"."qa_test_cases" to "anon";

grant update on table "public"."qa_test_cases" to "anon";

grant delete on table "public"."qa_test_cases" to "authenticated";

grant insert on table "public"."qa_test_cases" to "authenticated";

grant references on table "public"."qa_test_cases" to "authenticated";

grant select on table "public"."qa_test_cases" to "authenticated";

grant trigger on table "public"."qa_test_cases" to "authenticated";

grant truncate on table "public"."qa_test_cases" to "authenticated";

grant update on table "public"."qa_test_cases" to "authenticated";

grant delete on table "public"."qa_test_cases" to "service_role";

grant insert on table "public"."qa_test_cases" to "service_role";

grant references on table "public"."qa_test_cases" to "service_role";

grant select on table "public"."qa_test_cases" to "service_role";

grant trigger on table "public"."qa_test_cases" to "service_role";

grant truncate on table "public"."qa_test_cases" to "service_role";

grant update on table "public"."qa_test_cases" to "service_role";

grant delete on table "public"."qa_test_plans" to "anon";

grant insert on table "public"."qa_test_plans" to "anon";

grant references on table "public"."qa_test_plans" to "anon";

grant select on table "public"."qa_test_plans" to "anon";

grant trigger on table "public"."qa_test_plans" to "anon";

grant truncate on table "public"."qa_test_plans" to "anon";

grant update on table "public"."qa_test_plans" to "anon";

grant delete on table "public"."qa_test_plans" to "authenticated";

grant insert on table "public"."qa_test_plans" to "authenticated";

grant references on table "public"."qa_test_plans" to "authenticated";

grant select on table "public"."qa_test_plans" to "authenticated";

grant trigger on table "public"."qa_test_plans" to "authenticated";

grant truncate on table "public"."qa_test_plans" to "authenticated";

grant update on table "public"."qa_test_plans" to "authenticated";

grant delete on table "public"."qa_test_plans" to "service_role";

grant insert on table "public"."qa_test_plans" to "service_role";

grant references on table "public"."qa_test_plans" to "service_role";

grant select on table "public"."qa_test_plans" to "service_role";

grant trigger on table "public"."qa_test_plans" to "service_role";

grant truncate on table "public"."qa_test_plans" to "service_role";

grant update on table "public"."qa_test_plans" to "service_role";

grant delete on table "public"."qa_test_results" to "anon";

grant insert on table "public"."qa_test_results" to "anon";

grant references on table "public"."qa_test_results" to "anon";

grant select on table "public"."qa_test_results" to "anon";

grant trigger on table "public"."qa_test_results" to "anon";

grant truncate on table "public"."qa_test_results" to "anon";

grant update on table "public"."qa_test_results" to "anon";

grant delete on table "public"."qa_test_results" to "authenticated";

grant insert on table "public"."qa_test_results" to "authenticated";

grant references on table "public"."qa_test_results" to "authenticated";

grant select on table "public"."qa_test_results" to "authenticated";

grant trigger on table "public"."qa_test_results" to "authenticated";

grant truncate on table "public"."qa_test_results" to "authenticated";

grant update on table "public"."qa_test_results" to "authenticated";

grant delete on table "public"."qa_test_results" to "service_role";

grant insert on table "public"."qa_test_results" to "service_role";

grant references on table "public"."qa_test_results" to "service_role";

grant select on table "public"."qa_test_results" to "service_role";

grant trigger on table "public"."qa_test_results" to "service_role";

grant truncate on table "public"."qa_test_results" to "service_role";

grant update on table "public"."qa_test_results" to "service_role";

grant delete on table "public"."qa_test_runs" to "anon";

grant insert on table "public"."qa_test_runs" to "anon";

grant references on table "public"."qa_test_runs" to "anon";

grant select on table "public"."qa_test_runs" to "anon";

grant trigger on table "public"."qa_test_runs" to "anon";

grant truncate on table "public"."qa_test_runs" to "anon";

grant update on table "public"."qa_test_runs" to "anon";

grant delete on table "public"."qa_test_runs" to "authenticated";

grant insert on table "public"."qa_test_runs" to "authenticated";

grant references on table "public"."qa_test_runs" to "authenticated";

grant select on table "public"."qa_test_runs" to "authenticated";

grant trigger on table "public"."qa_test_runs" to "authenticated";

grant truncate on table "public"."qa_test_runs" to "authenticated";

grant update on table "public"."qa_test_runs" to "authenticated";

grant delete on table "public"."qa_test_runs" to "service_role";

grant insert on table "public"."qa_test_runs" to "service_role";

grant references on table "public"."qa_test_runs" to "service_role";

grant select on table "public"."qa_test_runs" to "service_role";

grant trigger on table "public"."qa_test_runs" to "service_role";

grant truncate on table "public"."qa_test_runs" to "service_role";

grant update on table "public"."qa_test_runs" to "service_role";

grant delete on table "public"."quick_replies" to "anon";

grant insert on table "public"."quick_replies" to "anon";

grant select on table "public"."quick_replies" to "anon";

grant update on table "public"."quick_replies" to "anon";

grant delete on table "public"."quick_replies" to "authenticated";

grant insert on table "public"."quick_replies" to "authenticated";

grant select on table "public"."quick_replies" to "authenticated";

grant update on table "public"."quick_replies" to "authenticated";

grant delete on table "public"."quick_replies" to "service_role";

grant insert on table "public"."quick_replies" to "service_role";

grant select on table "public"."quick_replies" to "service_role";

grant update on table "public"."quick_replies" to "service_role";

grant delete on table "public"."reminders" to "anon";

grant insert on table "public"."reminders" to "anon";

grant references on table "public"."reminders" to "anon";

grant select on table "public"."reminders" to "anon";

grant trigger on table "public"."reminders" to "anon";

grant truncate on table "public"."reminders" to "anon";

grant update on table "public"."reminders" to "anon";

grant delete on table "public"."reminders" to "authenticated";

grant insert on table "public"."reminders" to "authenticated";

grant references on table "public"."reminders" to "authenticated";

grant select on table "public"."reminders" to "authenticated";

grant trigger on table "public"."reminders" to "authenticated";

grant truncate on table "public"."reminders" to "authenticated";

grant update on table "public"."reminders" to "authenticated";

grant delete on table "public"."reminders" to "service_role";

grant insert on table "public"."reminders" to "service_role";

grant references on table "public"."reminders" to "service_role";

grant select on table "public"."reminders" to "service_role";

grant trigger on table "public"."reminders" to "service_role";

grant truncate on table "public"."reminders" to "service_role";

grant update on table "public"."reminders" to "service_role";

grant delete on table "public"."saved_searches" to "anon";

grant insert on table "public"."saved_searches" to "anon";

grant references on table "public"."saved_searches" to "anon";

grant select on table "public"."saved_searches" to "anon";

grant trigger on table "public"."saved_searches" to "anon";

grant truncate on table "public"."saved_searches" to "anon";

grant update on table "public"."saved_searches" to "anon";

grant delete on table "public"."saved_searches" to "authenticated";

grant insert on table "public"."saved_searches" to "authenticated";

grant references on table "public"."saved_searches" to "authenticated";

grant select on table "public"."saved_searches" to "authenticated";

grant trigger on table "public"."saved_searches" to "authenticated";

grant truncate on table "public"."saved_searches" to "authenticated";

grant update on table "public"."saved_searches" to "authenticated";

grant delete on table "public"."saved_searches" to "service_role";

grant insert on table "public"."saved_searches" to "service_role";

grant references on table "public"."saved_searches" to "service_role";

grant select on table "public"."saved_searches" to "service_role";

grant trigger on table "public"."saved_searches" to "service_role";

grant truncate on table "public"."saved_searches" to "service_role";

grant update on table "public"."saved_searches" to "service_role";

grant delete on table "public"."search_queries" to "anon";

grant insert on table "public"."search_queries" to "anon";

grant references on table "public"."search_queries" to "anon";

grant select on table "public"."search_queries" to "anon";

grant trigger on table "public"."search_queries" to "anon";

grant truncate on table "public"."search_queries" to "anon";

grant update on table "public"."search_queries" to "anon";

grant delete on table "public"."search_queries" to "authenticated";

grant insert on table "public"."search_queries" to "authenticated";

grant references on table "public"."search_queries" to "authenticated";

grant select on table "public"."search_queries" to "authenticated";

grant trigger on table "public"."search_queries" to "authenticated";

grant truncate on table "public"."search_queries" to "authenticated";

grant update on table "public"."search_queries" to "authenticated";

grant delete on table "public"."search_queries" to "service_role";

grant insert on table "public"."search_queries" to "service_role";

grant references on table "public"."search_queries" to "service_role";

grant select on table "public"."search_queries" to "service_role";

grant trigger on table "public"."search_queries" to "service_role";

grant truncate on table "public"."search_queries" to "service_role";

grant update on table "public"."search_queries" to "service_role";

grant delete on table "public"."search_settings" to "anon";

grant insert on table "public"."search_settings" to "anon";

grant references on table "public"."search_settings" to "anon";

grant select on table "public"."search_settings" to "anon";

grant trigger on table "public"."search_settings" to "anon";

grant truncate on table "public"."search_settings" to "anon";

grant update on table "public"."search_settings" to "anon";

grant delete on table "public"."search_settings" to "authenticated";

grant insert on table "public"."search_settings" to "authenticated";

grant references on table "public"."search_settings" to "authenticated";

grant select on table "public"."search_settings" to "authenticated";

grant trigger on table "public"."search_settings" to "authenticated";

grant truncate on table "public"."search_settings" to "authenticated";

grant update on table "public"."search_settings" to "authenticated";

grant delete on table "public"."search_settings" to "service_role";

grant insert on table "public"."search_settings" to "service_role";

grant references on table "public"."search_settings" to "service_role";

grant select on table "public"."search_settings" to "service_role";

grant trigger on table "public"."search_settings" to "service_role";

grant truncate on table "public"."search_settings" to "service_role";

grant update on table "public"."search_settings" to "service_role";

grant delete on table "public"."security_events" to "anon";

grant insert on table "public"."security_events" to "anon";

grant references on table "public"."security_events" to "anon";

grant select on table "public"."security_events" to "anon";

grant trigger on table "public"."security_events" to "anon";

grant truncate on table "public"."security_events" to "anon";

grant update on table "public"."security_events" to "anon";

grant delete on table "public"."security_events" to "authenticated";

grant insert on table "public"."security_events" to "authenticated";

grant references on table "public"."security_events" to "authenticated";

grant select on table "public"."security_events" to "authenticated";

grant trigger on table "public"."security_events" to "authenticated";

grant truncate on table "public"."security_events" to "authenticated";

grant update on table "public"."security_events" to "authenticated";

grant delete on table "public"."security_events" to "service_role";

grant insert on table "public"."security_events" to "service_role";

grant references on table "public"."security_events" to "service_role";

grant select on table "public"."security_events" to "service_role";

grant trigger on table "public"."security_events" to "service_role";

grant truncate on table "public"."security_events" to "service_role";

grant update on table "public"."security_events" to "service_role";

grant delete on table "public"."security_rules" to "anon";

grant insert on table "public"."security_rules" to "anon";

grant references on table "public"."security_rules" to "anon";

grant select on table "public"."security_rules" to "anon";

grant trigger on table "public"."security_rules" to "anon";

grant truncate on table "public"."security_rules" to "anon";

grant update on table "public"."security_rules" to "anon";

grant delete on table "public"."security_rules" to "authenticated";

grant insert on table "public"."security_rules" to "authenticated";

grant references on table "public"."security_rules" to "authenticated";

grant select on table "public"."security_rules" to "authenticated";

grant trigger on table "public"."security_rules" to "authenticated";

grant truncate on table "public"."security_rules" to "authenticated";

grant update on table "public"."security_rules" to "authenticated";

grant delete on table "public"."security_rules" to "service_role";

grant insert on table "public"."security_rules" to "service_role";

grant references on table "public"."security_rules" to "service_role";

grant select on table "public"."security_rules" to "service_role";

grant trigger on table "public"."security_rules" to "service_role";

grant truncate on table "public"."security_rules" to "service_role";

grant update on table "public"."security_rules" to "service_role";

grant delete on table "public"."setup_answers" to "anon";

grant insert on table "public"."setup_answers" to "anon";

grant references on table "public"."setup_answers" to "anon";

grant select on table "public"."setup_answers" to "anon";

grant trigger on table "public"."setup_answers" to "anon";

grant truncate on table "public"."setup_answers" to "anon";

grant update on table "public"."setup_answers" to "anon";

grant delete on table "public"."setup_answers" to "authenticated";

grant insert on table "public"."setup_answers" to "authenticated";

grant references on table "public"."setup_answers" to "authenticated";

grant select on table "public"."setup_answers" to "authenticated";

grant trigger on table "public"."setup_answers" to "authenticated";

grant truncate on table "public"."setup_answers" to "authenticated";

grant update on table "public"."setup_answers" to "authenticated";

grant delete on table "public"."setup_answers" to "service_role";

grant insert on table "public"."setup_answers" to "service_role";

grant references on table "public"."setup_answers" to "service_role";

grant select on table "public"."setup_answers" to "service_role";

grant trigger on table "public"."setup_answers" to "service_role";

grant truncate on table "public"."setup_answers" to "service_role";

grant update on table "public"."setup_answers" to "service_role";

grant delete on table "public"."setup_assistant_sessions" to "anon";

grant insert on table "public"."setup_assistant_sessions" to "anon";

grant references on table "public"."setup_assistant_sessions" to "anon";

grant select on table "public"."setup_assistant_sessions" to "anon";

grant trigger on table "public"."setup_assistant_sessions" to "anon";

grant truncate on table "public"."setup_assistant_sessions" to "anon";

grant update on table "public"."setup_assistant_sessions" to "anon";

grant delete on table "public"."setup_assistant_sessions" to "authenticated";

grant insert on table "public"."setup_assistant_sessions" to "authenticated";

grant references on table "public"."setup_assistant_sessions" to "authenticated";

grant select on table "public"."setup_assistant_sessions" to "authenticated";

grant trigger on table "public"."setup_assistant_sessions" to "authenticated";

grant truncate on table "public"."setup_assistant_sessions" to "authenticated";

grant update on table "public"."setup_assistant_sessions" to "authenticated";

grant delete on table "public"."setup_assistant_sessions" to "service_role";

grant insert on table "public"."setup_assistant_sessions" to "service_role";

grant references on table "public"."setup_assistant_sessions" to "service_role";

grant select on table "public"."setup_assistant_sessions" to "service_role";

grant trigger on table "public"."setup_assistant_sessions" to "service_role";

grant truncate on table "public"."setup_assistant_sessions" to "service_role";

grant update on table "public"."setup_assistant_sessions" to "service_role";

grant delete on table "public"."setup_questions" to "anon";

grant insert on table "public"."setup_questions" to "anon";

grant references on table "public"."setup_questions" to "anon";

grant select on table "public"."setup_questions" to "anon";

grant trigger on table "public"."setup_questions" to "anon";

grant truncate on table "public"."setup_questions" to "anon";

grant update on table "public"."setup_questions" to "anon";

grant delete on table "public"."setup_questions" to "authenticated";

grant insert on table "public"."setup_questions" to "authenticated";

grant references on table "public"."setup_questions" to "authenticated";

grant select on table "public"."setup_questions" to "authenticated";

grant trigger on table "public"."setup_questions" to "authenticated";

grant truncate on table "public"."setup_questions" to "authenticated";

grant update on table "public"."setup_questions" to "authenticated";

grant delete on table "public"."setup_questions" to "service_role";

grant insert on table "public"."setup_questions" to "service_role";

grant references on table "public"."setup_questions" to "service_role";

grant select on table "public"."setup_questions" to "service_role";

grant trigger on table "public"."setup_questions" to "service_role";

grant truncate on table "public"."setup_questions" to "service_role";

grant update on table "public"."setup_questions" to "service_role";

grant delete on table "public"."setup_validation_checks" to "anon";

grant insert on table "public"."setup_validation_checks" to "anon";

grant references on table "public"."setup_validation_checks" to "anon";

grant select on table "public"."setup_validation_checks" to "anon";

grant trigger on table "public"."setup_validation_checks" to "anon";

grant truncate on table "public"."setup_validation_checks" to "anon";

grant update on table "public"."setup_validation_checks" to "anon";

grant delete on table "public"."setup_validation_checks" to "authenticated";

grant insert on table "public"."setup_validation_checks" to "authenticated";

grant references on table "public"."setup_validation_checks" to "authenticated";

grant select on table "public"."setup_validation_checks" to "authenticated";

grant trigger on table "public"."setup_validation_checks" to "authenticated";

grant truncate on table "public"."setup_validation_checks" to "authenticated";

grant update on table "public"."setup_validation_checks" to "authenticated";

grant delete on table "public"."setup_validation_checks" to "service_role";

grant insert on table "public"."setup_validation_checks" to "service_role";

grant references on table "public"."setup_validation_checks" to "service_role";

grant select on table "public"."setup_validation_checks" to "service_role";

grant trigger on table "public"."setup_validation_checks" to "service_role";

grant truncate on table "public"."setup_validation_checks" to "service_role";

grant update on table "public"."setup_validation_checks" to "service_role";

grant delete on table "public"."setup_validation_results" to "anon";

grant insert on table "public"."setup_validation_results" to "anon";

grant references on table "public"."setup_validation_results" to "anon";

grant select on table "public"."setup_validation_results" to "anon";

grant trigger on table "public"."setup_validation_results" to "anon";

grant truncate on table "public"."setup_validation_results" to "anon";

grant update on table "public"."setup_validation_results" to "anon";

grant delete on table "public"."setup_validation_results" to "authenticated";

grant insert on table "public"."setup_validation_results" to "authenticated";

grant references on table "public"."setup_validation_results" to "authenticated";

grant select on table "public"."setup_validation_results" to "authenticated";

grant trigger on table "public"."setup_validation_results" to "authenticated";

grant truncate on table "public"."setup_validation_results" to "authenticated";

grant update on table "public"."setup_validation_results" to "authenticated";

grant delete on table "public"."setup_validation_results" to "service_role";

grant insert on table "public"."setup_validation_results" to "service_role";

grant references on table "public"."setup_validation_results" to "service_role";

grant select on table "public"."setup_validation_results" to "service_role";

grant trigger on table "public"."setup_validation_results" to "service_role";

grant truncate on table "public"."setup_validation_results" to "service_role";

grant update on table "public"."setup_validation_results" to "service_role";

grant delete on table "public"."social_accounts" to "anon";

grant insert on table "public"."social_accounts" to "anon";

grant select on table "public"."social_accounts" to "anon";

grant update on table "public"."social_accounts" to "anon";

grant delete on table "public"."social_accounts" to "authenticated";

grant insert on table "public"."social_accounts" to "authenticated";

grant select on table "public"."social_accounts" to "authenticated";

grant update on table "public"."social_accounts" to "authenticated";

grant delete on table "public"."social_accounts" to "service_role";

grant insert on table "public"."social_accounts" to "service_role";

grant select on table "public"."social_accounts" to "service_role";

grant update on table "public"."social_accounts" to "service_role";

grant delete on table "public"."subscription_plans" to "anon";

grant insert on table "public"."subscription_plans" to "anon";

grant references on table "public"."subscription_plans" to "anon";

grant select on table "public"."subscription_plans" to "anon";

grant trigger on table "public"."subscription_plans" to "anon";

grant truncate on table "public"."subscription_plans" to "anon";

grant update on table "public"."subscription_plans" to "anon";

grant delete on table "public"."subscription_plans" to "authenticated";

grant insert on table "public"."subscription_plans" to "authenticated";

grant references on table "public"."subscription_plans" to "authenticated";

grant select on table "public"."subscription_plans" to "authenticated";

grant trigger on table "public"."subscription_plans" to "authenticated";

grant truncate on table "public"."subscription_plans" to "authenticated";

grant update on table "public"."subscription_plans" to "authenticated";

grant delete on table "public"."subscription_plans" to "service_role";

grant insert on table "public"."subscription_plans" to "service_role";

grant references on table "public"."subscription_plans" to "service_role";

grant select on table "public"."subscription_plans" to "service_role";

grant trigger on table "public"."subscription_plans" to "service_role";

grant truncate on table "public"."subscription_plans" to "service_role";

grant update on table "public"."subscription_plans" to "service_role";

grant delete on table "public"."support_queue_agents" to "anon";

grant insert on table "public"."support_queue_agents" to "anon";

grant references on table "public"."support_queue_agents" to "anon";

grant select on table "public"."support_queue_agents" to "anon";

grant trigger on table "public"."support_queue_agents" to "anon";

grant truncate on table "public"."support_queue_agents" to "anon";

grant update on table "public"."support_queue_agents" to "anon";

grant delete on table "public"."support_queue_agents" to "authenticated";

grant insert on table "public"."support_queue_agents" to "authenticated";

grant references on table "public"."support_queue_agents" to "authenticated";

grant select on table "public"."support_queue_agents" to "authenticated";

grant trigger on table "public"."support_queue_agents" to "authenticated";

grant truncate on table "public"."support_queue_agents" to "authenticated";

grant update on table "public"."support_queue_agents" to "authenticated";

grant delete on table "public"."support_queue_agents" to "service_role";

grant insert on table "public"."support_queue_agents" to "service_role";

grant references on table "public"."support_queue_agents" to "service_role";

grant select on table "public"."support_queue_agents" to "service_role";

grant trigger on table "public"."support_queue_agents" to "service_role";

grant truncate on table "public"."support_queue_agents" to "service_role";

grant update on table "public"."support_queue_agents" to "service_role";

grant delete on table "public"."support_queues" to "anon";

grant insert on table "public"."support_queues" to "anon";

grant references on table "public"."support_queues" to "anon";

grant select on table "public"."support_queues" to "anon";

grant trigger on table "public"."support_queues" to "anon";

grant truncate on table "public"."support_queues" to "anon";

grant update on table "public"."support_queues" to "anon";

grant delete on table "public"."support_queues" to "authenticated";

grant insert on table "public"."support_queues" to "authenticated";

grant references on table "public"."support_queues" to "authenticated";

grant select on table "public"."support_queues" to "authenticated";

grant trigger on table "public"."support_queues" to "authenticated";

grant truncate on table "public"."support_queues" to "authenticated";

grant update on table "public"."support_queues" to "authenticated";

grant delete on table "public"."support_queues" to "service_role";

grant insert on table "public"."support_queues" to "service_role";

grant references on table "public"."support_queues" to "service_role";

grant select on table "public"."support_queues" to "service_role";

grant trigger on table "public"."support_queues" to "service_role";

grant truncate on table "public"."support_queues" to "service_role";

grant update on table "public"."support_queues" to "service_role";

grant delete on table "public"."support_scripts" to "anon";

grant insert on table "public"."support_scripts" to "anon";

grant references on table "public"."support_scripts" to "anon";

grant select on table "public"."support_scripts" to "anon";

grant trigger on table "public"."support_scripts" to "anon";

grant truncate on table "public"."support_scripts" to "anon";

grant update on table "public"."support_scripts" to "anon";

grant delete on table "public"."support_scripts" to "authenticated";

grant insert on table "public"."support_scripts" to "authenticated";

grant references on table "public"."support_scripts" to "authenticated";

grant select on table "public"."support_scripts" to "authenticated";

grant trigger on table "public"."support_scripts" to "authenticated";

grant truncate on table "public"."support_scripts" to "authenticated";

grant update on table "public"."support_scripts" to "authenticated";

grant delete on table "public"."support_scripts" to "service_role";

grant insert on table "public"."support_scripts" to "service_role";

grant references on table "public"."support_scripts" to "service_role";

grant select on table "public"."support_scripts" to "service_role";

grant trigger on table "public"."support_scripts" to "service_role";

grant truncate on table "public"."support_scripts" to "service_role";

grant update on table "public"."support_scripts" to "service_role";

grant delete on table "public"."support_tickets" to "anon";

grant insert on table "public"."support_tickets" to "anon";

grant select on table "public"."support_tickets" to "anon";

grant update on table "public"."support_tickets" to "anon";

grant delete on table "public"."support_tickets" to "authenticated";

grant insert on table "public"."support_tickets" to "authenticated";

grant select on table "public"."support_tickets" to "authenticated";

grant update on table "public"."support_tickets" to "authenticated";

grant delete on table "public"."support_tickets" to "service_role";

grant insert on table "public"."support_tickets" to "service_role";

grant select on table "public"."support_tickets" to "service_role";

grant update on table "public"."support_tickets" to "service_role";

grant delete on table "public"."supported_locales" to "anon";

grant insert on table "public"."supported_locales" to "anon";

grant references on table "public"."supported_locales" to "anon";

grant select on table "public"."supported_locales" to "anon";

grant trigger on table "public"."supported_locales" to "anon";

grant truncate on table "public"."supported_locales" to "anon";

grant update on table "public"."supported_locales" to "anon";

grant delete on table "public"."supported_locales" to "authenticated";

grant insert on table "public"."supported_locales" to "authenticated";

grant references on table "public"."supported_locales" to "authenticated";

grant select on table "public"."supported_locales" to "authenticated";

grant trigger on table "public"."supported_locales" to "authenticated";

grant truncate on table "public"."supported_locales" to "authenticated";

grant update on table "public"."supported_locales" to "authenticated";

grant delete on table "public"."supported_locales" to "service_role";

grant insert on table "public"."supported_locales" to "service_role";

grant references on table "public"."supported_locales" to "service_role";

grant select on table "public"."supported_locales" to "service_role";

grant trigger on table "public"."supported_locales" to "service_role";

grant truncate on table "public"."supported_locales" to "service_role";

grant update on table "public"."supported_locales" to "service_role";

grant delete on table "public"."system_alerts" to "anon";

grant insert on table "public"."system_alerts" to "anon";

grant references on table "public"."system_alerts" to "anon";

grant select on table "public"."system_alerts" to "anon";

grant trigger on table "public"."system_alerts" to "anon";

grant truncate on table "public"."system_alerts" to "anon";

grant update on table "public"."system_alerts" to "anon";

grant delete on table "public"."system_alerts" to "authenticated";

grant insert on table "public"."system_alerts" to "authenticated";

grant references on table "public"."system_alerts" to "authenticated";

grant select on table "public"."system_alerts" to "authenticated";

grant trigger on table "public"."system_alerts" to "authenticated";

grant truncate on table "public"."system_alerts" to "authenticated";

grant update on table "public"."system_alerts" to "authenticated";

grant delete on table "public"."system_alerts" to "service_role";

grant insert on table "public"."system_alerts" to "service_role";

grant references on table "public"."system_alerts" to "service_role";

grant select on table "public"."system_alerts" to "service_role";

grant trigger on table "public"."system_alerts" to "service_role";

grant truncate on table "public"."system_alerts" to "service_role";

grant update on table "public"."system_alerts" to "service_role";

grant delete on table "public"."system_health_checks" to "anon";

grant insert on table "public"."system_health_checks" to "anon";

grant references on table "public"."system_health_checks" to "anon";

grant select on table "public"."system_health_checks" to "anon";

grant trigger on table "public"."system_health_checks" to "anon";

grant truncate on table "public"."system_health_checks" to "anon";

grant update on table "public"."system_health_checks" to "anon";

grant delete on table "public"."system_health_checks" to "authenticated";

grant insert on table "public"."system_health_checks" to "authenticated";

grant references on table "public"."system_health_checks" to "authenticated";

grant select on table "public"."system_health_checks" to "authenticated";

grant trigger on table "public"."system_health_checks" to "authenticated";

grant truncate on table "public"."system_health_checks" to "authenticated";

grant update on table "public"."system_health_checks" to "authenticated";

grant delete on table "public"."system_health_checks" to "service_role";

grant insert on table "public"."system_health_checks" to "service_role";

grant references on table "public"."system_health_checks" to "service_role";

grant select on table "public"."system_health_checks" to "service_role";

grant trigger on table "public"."system_health_checks" to "service_role";

grant truncate on table "public"."system_health_checks" to "service_role";

grant update on table "public"."system_health_checks" to "service_role";

grant delete on table "public"."system_messages" to "anon";

grant insert on table "public"."system_messages" to "anon";

grant references on table "public"."system_messages" to "anon";

grant select on table "public"."system_messages" to "anon";

grant trigger on table "public"."system_messages" to "anon";

grant truncate on table "public"."system_messages" to "anon";

grant update on table "public"."system_messages" to "anon";

grant delete on table "public"."system_messages" to "authenticated";

grant insert on table "public"."system_messages" to "authenticated";

grant references on table "public"."system_messages" to "authenticated";

grant select on table "public"."system_messages" to "authenticated";

grant trigger on table "public"."system_messages" to "authenticated";

grant truncate on table "public"."system_messages" to "authenticated";

grant update on table "public"."system_messages" to "authenticated";

grant delete on table "public"."system_messages" to "service_role";

grant insert on table "public"."system_messages" to "service_role";

grant references on table "public"."system_messages" to "service_role";

grant select on table "public"."system_messages" to "service_role";

grant trigger on table "public"."system_messages" to "service_role";

grant truncate on table "public"."system_messages" to "service_role";

grant update on table "public"."system_messages" to "service_role";

grant delete on table "public"."tenant_domains" to "anon";

grant insert on table "public"."tenant_domains" to "anon";

grant references on table "public"."tenant_domains" to "anon";

grant select on table "public"."tenant_domains" to "anon";

grant trigger on table "public"."tenant_domains" to "anon";

grant truncate on table "public"."tenant_domains" to "anon";

grant update on table "public"."tenant_domains" to "anon";

grant delete on table "public"."tenant_domains" to "authenticated";

grant insert on table "public"."tenant_domains" to "authenticated";

grant references on table "public"."tenant_domains" to "authenticated";

grant select on table "public"."tenant_domains" to "authenticated";

grant trigger on table "public"."tenant_domains" to "authenticated";

grant truncate on table "public"."tenant_domains" to "authenticated";

grant update on table "public"."tenant_domains" to "authenticated";

grant delete on table "public"."tenant_domains" to "service_role";

grant insert on table "public"."tenant_domains" to "service_role";

grant references on table "public"."tenant_domains" to "service_role";

grant select on table "public"."tenant_domains" to "service_role";

grant trigger on table "public"."tenant_domains" to "service_role";

grant truncate on table "public"."tenant_domains" to "service_role";

grant update on table "public"."tenant_domains" to "service_role";

grant delete on table "public"."tenant_navigation_overrides" to "anon";

grant insert on table "public"."tenant_navigation_overrides" to "anon";

grant references on table "public"."tenant_navigation_overrides" to "anon";

grant select on table "public"."tenant_navigation_overrides" to "anon";

grant trigger on table "public"."tenant_navigation_overrides" to "anon";

grant truncate on table "public"."tenant_navigation_overrides" to "anon";

grant update on table "public"."tenant_navigation_overrides" to "anon";

grant delete on table "public"."tenant_navigation_overrides" to "authenticated";

grant insert on table "public"."tenant_navigation_overrides" to "authenticated";

grant references on table "public"."tenant_navigation_overrides" to "authenticated";

grant select on table "public"."tenant_navigation_overrides" to "authenticated";

grant trigger on table "public"."tenant_navigation_overrides" to "authenticated";

grant truncate on table "public"."tenant_navigation_overrides" to "authenticated";

grant update on table "public"."tenant_navigation_overrides" to "authenticated";

grant delete on table "public"."tenant_navigation_overrides" to "service_role";

grant insert on table "public"."tenant_navigation_overrides" to "service_role";

grant references on table "public"."tenant_navigation_overrides" to "service_role";

grant select on table "public"."tenant_navigation_overrides" to "service_role";

grant trigger on table "public"."tenant_navigation_overrides" to "service_role";

grant truncate on table "public"."tenant_navigation_overrides" to "service_role";

grant update on table "public"."tenant_navigation_overrides" to "service_role";

grant delete on table "public"."tenant_onboarding_progress" to "anon";

grant insert on table "public"."tenant_onboarding_progress" to "anon";

grant references on table "public"."tenant_onboarding_progress" to "anon";

grant select on table "public"."tenant_onboarding_progress" to "anon";

grant trigger on table "public"."tenant_onboarding_progress" to "anon";

grant truncate on table "public"."tenant_onboarding_progress" to "anon";

grant update on table "public"."tenant_onboarding_progress" to "anon";

grant delete on table "public"."tenant_onboarding_progress" to "authenticated";

grant insert on table "public"."tenant_onboarding_progress" to "authenticated";

grant references on table "public"."tenant_onboarding_progress" to "authenticated";

grant select on table "public"."tenant_onboarding_progress" to "authenticated";

grant trigger on table "public"."tenant_onboarding_progress" to "authenticated";

grant truncate on table "public"."tenant_onboarding_progress" to "authenticated";

grant update on table "public"."tenant_onboarding_progress" to "authenticated";

grant delete on table "public"."tenant_onboarding_progress" to "service_role";

grant insert on table "public"."tenant_onboarding_progress" to "service_role";

grant references on table "public"."tenant_onboarding_progress" to "service_role";

grant select on table "public"."tenant_onboarding_progress" to "service_role";

grant trigger on table "public"."tenant_onboarding_progress" to "service_role";

grant truncate on table "public"."tenant_onboarding_progress" to "service_role";

grant update on table "public"."tenant_onboarding_progress" to "service_role";

grant delete on table "public"."tenant_onboarding_step_status" to "anon";

grant insert on table "public"."tenant_onboarding_step_status" to "anon";

grant references on table "public"."tenant_onboarding_step_status" to "anon";

grant select on table "public"."tenant_onboarding_step_status" to "anon";

grant trigger on table "public"."tenant_onboarding_step_status" to "anon";

grant truncate on table "public"."tenant_onboarding_step_status" to "anon";

grant update on table "public"."tenant_onboarding_step_status" to "anon";

grant delete on table "public"."tenant_onboarding_step_status" to "authenticated";

grant insert on table "public"."tenant_onboarding_step_status" to "authenticated";

grant references on table "public"."tenant_onboarding_step_status" to "authenticated";

grant select on table "public"."tenant_onboarding_step_status" to "authenticated";

grant trigger on table "public"."tenant_onboarding_step_status" to "authenticated";

grant truncate on table "public"."tenant_onboarding_step_status" to "authenticated";

grant update on table "public"."tenant_onboarding_step_status" to "authenticated";

grant delete on table "public"."tenant_onboarding_step_status" to "service_role";

grant insert on table "public"."tenant_onboarding_step_status" to "service_role";

grant references on table "public"."tenant_onboarding_step_status" to "service_role";

grant select on table "public"."tenant_onboarding_step_status" to "service_role";

grant trigger on table "public"."tenant_onboarding_step_status" to "service_role";

grant truncate on table "public"."tenant_onboarding_step_status" to "service_role";

grant update on table "public"."tenant_onboarding_step_status" to "service_role";

grant delete on table "public"."tenant_settings" to "anon";

grant insert on table "public"."tenant_settings" to "anon";

grant references on table "public"."tenant_settings" to "anon";

grant select on table "public"."tenant_settings" to "anon";

grant trigger on table "public"."tenant_settings" to "anon";

grant truncate on table "public"."tenant_settings" to "anon";

grant update on table "public"."tenant_settings" to "anon";

grant delete on table "public"."tenant_settings" to "authenticated";

grant insert on table "public"."tenant_settings" to "authenticated";

grant references on table "public"."tenant_settings" to "authenticated";

grant select on table "public"."tenant_settings" to "authenticated";

grant trigger on table "public"."tenant_settings" to "authenticated";

grant truncate on table "public"."tenant_settings" to "authenticated";

grant update on table "public"."tenant_settings" to "authenticated";

grant delete on table "public"."tenant_settings" to "service_role";

grant insert on table "public"."tenant_settings" to "service_role";

grant references on table "public"."tenant_settings" to "service_role";

grant select on table "public"."tenant_settings" to "service_role";

grant trigger on table "public"."tenant_settings" to "service_role";

grant truncate on table "public"."tenant_settings" to "service_role";

grant update on table "public"."tenant_settings" to "service_role";

grant delete on table "public"."tenant_subscriptions" to "anon";

grant insert on table "public"."tenant_subscriptions" to "anon";

grant references on table "public"."tenant_subscriptions" to "anon";

grant select on table "public"."tenant_subscriptions" to "anon";

grant trigger on table "public"."tenant_subscriptions" to "anon";

grant truncate on table "public"."tenant_subscriptions" to "anon";

grant update on table "public"."tenant_subscriptions" to "anon";

grant delete on table "public"."tenant_subscriptions" to "authenticated";

grant insert on table "public"."tenant_subscriptions" to "authenticated";

grant references on table "public"."tenant_subscriptions" to "authenticated";

grant select on table "public"."tenant_subscriptions" to "authenticated";

grant trigger on table "public"."tenant_subscriptions" to "authenticated";

grant truncate on table "public"."tenant_subscriptions" to "authenticated";

grant update on table "public"."tenant_subscriptions" to "authenticated";

grant delete on table "public"."tenant_subscriptions" to "service_role";

grant insert on table "public"."tenant_subscriptions" to "service_role";

grant references on table "public"."tenant_subscriptions" to "service_role";

grant select on table "public"."tenant_subscriptions" to "service_role";

grant trigger on table "public"."tenant_subscriptions" to "service_role";

grant truncate on table "public"."tenant_subscriptions" to "service_role";

grant update on table "public"."tenant_subscriptions" to "service_role";

grant delete on table "public"."tenant_ui_preferences" to "anon";

grant insert on table "public"."tenant_ui_preferences" to "anon";

grant references on table "public"."tenant_ui_preferences" to "anon";

grant select on table "public"."tenant_ui_preferences" to "anon";

grant trigger on table "public"."tenant_ui_preferences" to "anon";

grant truncate on table "public"."tenant_ui_preferences" to "anon";

grant update on table "public"."tenant_ui_preferences" to "anon";

grant delete on table "public"."tenant_ui_preferences" to "authenticated";

grant insert on table "public"."tenant_ui_preferences" to "authenticated";

grant references on table "public"."tenant_ui_preferences" to "authenticated";

grant select on table "public"."tenant_ui_preferences" to "authenticated";

grant trigger on table "public"."tenant_ui_preferences" to "authenticated";

grant truncate on table "public"."tenant_ui_preferences" to "authenticated";

grant update on table "public"."tenant_ui_preferences" to "authenticated";

grant delete on table "public"."tenant_ui_preferences" to "service_role";

grant insert on table "public"."tenant_ui_preferences" to "service_role";

grant references on table "public"."tenant_ui_preferences" to "service_role";

grant select on table "public"."tenant_ui_preferences" to "service_role";

grant trigger on table "public"."tenant_ui_preferences" to "service_role";

grant truncate on table "public"."tenant_ui_preferences" to "service_role";

grant update on table "public"."tenant_ui_preferences" to "service_role";

grant delete on table "public"."tenant_usage_metrics" to "anon";

grant insert on table "public"."tenant_usage_metrics" to "anon";

grant references on table "public"."tenant_usage_metrics" to "anon";

grant select on table "public"."tenant_usage_metrics" to "anon";

grant trigger on table "public"."tenant_usage_metrics" to "anon";

grant truncate on table "public"."tenant_usage_metrics" to "anon";

grant update on table "public"."tenant_usage_metrics" to "anon";

grant delete on table "public"."tenant_usage_metrics" to "authenticated";

grant insert on table "public"."tenant_usage_metrics" to "authenticated";

grant references on table "public"."tenant_usage_metrics" to "authenticated";

grant select on table "public"."tenant_usage_metrics" to "authenticated";

grant trigger on table "public"."tenant_usage_metrics" to "authenticated";

grant truncate on table "public"."tenant_usage_metrics" to "authenticated";

grant update on table "public"."tenant_usage_metrics" to "authenticated";

grant delete on table "public"."tenant_usage_metrics" to "service_role";

grant insert on table "public"."tenant_usage_metrics" to "service_role";

grant references on table "public"."tenant_usage_metrics" to "service_role";

grant select on table "public"."tenant_usage_metrics" to "service_role";

grant trigger on table "public"."tenant_usage_metrics" to "service_role";

grant truncate on table "public"."tenant_usage_metrics" to "service_role";

grant update on table "public"."tenant_usage_metrics" to "service_role";

grant delete on table "public"."tenant_users" to "anon";

grant insert on table "public"."tenant_users" to "anon";

grant select on table "public"."tenant_users" to "anon";

grant update on table "public"."tenant_users" to "anon";

grant delete on table "public"."tenant_users" to "authenticated";

grant insert on table "public"."tenant_users" to "authenticated";

grant select on table "public"."tenant_users" to "authenticated";

grant update on table "public"."tenant_users" to "authenticated";

grant delete on table "public"."tenant_users" to "service_role";

grant insert on table "public"."tenant_users" to "service_role";

grant select on table "public"."tenant_users" to "service_role";

grant update on table "public"."tenant_users" to "service_role";

grant delete on table "public"."tenants" to "anon";

grant insert on table "public"."tenants" to "anon";

grant select on table "public"."tenants" to "anon";

grant update on table "public"."tenants" to "anon";

grant delete on table "public"."tenants" to "authenticated";

grant insert on table "public"."tenants" to "authenticated";

grant select on table "public"."tenants" to "authenticated";

grant update on table "public"."tenants" to "authenticated";

grant delete on table "public"."tenants" to "service_role";

grant insert on table "public"."tenants" to "service_role";

grant select on table "public"."tenants" to "service_role";

grant update on table "public"."tenants" to "service_role";

grant delete on table "public"."training_lessons" to "anon";

grant insert on table "public"."training_lessons" to "anon";

grant references on table "public"."training_lessons" to "anon";

grant select on table "public"."training_lessons" to "anon";

grant trigger on table "public"."training_lessons" to "anon";

grant truncate on table "public"."training_lessons" to "anon";

grant update on table "public"."training_lessons" to "anon";

grant delete on table "public"."training_lessons" to "authenticated";

grant insert on table "public"."training_lessons" to "authenticated";

grant references on table "public"."training_lessons" to "authenticated";

grant select on table "public"."training_lessons" to "authenticated";

grant trigger on table "public"."training_lessons" to "authenticated";

grant truncate on table "public"."training_lessons" to "authenticated";

grant update on table "public"."training_lessons" to "authenticated";

grant delete on table "public"."training_lessons" to "service_role";

grant insert on table "public"."training_lessons" to "service_role";

grant references on table "public"."training_lessons" to "service_role";

grant select on table "public"."training_lessons" to "service_role";

grant trigger on table "public"."training_lessons" to "service_role";

grant truncate on table "public"."training_lessons" to "service_role";

grant update on table "public"."training_lessons" to "service_role";

grant delete on table "public"."training_programs" to "anon";

grant insert on table "public"."training_programs" to "anon";

grant references on table "public"."training_programs" to "anon";

grant select on table "public"."training_programs" to "anon";

grant trigger on table "public"."training_programs" to "anon";

grant truncate on table "public"."training_programs" to "anon";

grant update on table "public"."training_programs" to "anon";

grant delete on table "public"."training_programs" to "authenticated";

grant insert on table "public"."training_programs" to "authenticated";

grant references on table "public"."training_programs" to "authenticated";

grant select on table "public"."training_programs" to "authenticated";

grant trigger on table "public"."training_programs" to "authenticated";

grant truncate on table "public"."training_programs" to "authenticated";

grant update on table "public"."training_programs" to "authenticated";

grant delete on table "public"."training_programs" to "service_role";

grant insert on table "public"."training_programs" to "service_role";

grant references on table "public"."training_programs" to "service_role";

grant select on table "public"."training_programs" to "service_role";

grant trigger on table "public"."training_programs" to "service_role";

grant truncate on table "public"."training_programs" to "service_role";

grant update on table "public"."training_programs" to "service_role";

grant delete on table "public"."training_progress" to "anon";

grant insert on table "public"."training_progress" to "anon";

grant references on table "public"."training_progress" to "anon";

grant select on table "public"."training_progress" to "anon";

grant trigger on table "public"."training_progress" to "anon";

grant truncate on table "public"."training_progress" to "anon";

grant update on table "public"."training_progress" to "anon";

grant delete on table "public"."training_progress" to "authenticated";

grant insert on table "public"."training_progress" to "authenticated";

grant references on table "public"."training_progress" to "authenticated";

grant select on table "public"."training_progress" to "authenticated";

grant trigger on table "public"."training_progress" to "authenticated";

grant truncate on table "public"."training_progress" to "authenticated";

grant update on table "public"."training_progress" to "authenticated";

grant delete on table "public"."training_progress" to "service_role";

grant insert on table "public"."training_progress" to "service_role";

grant references on table "public"."training_progress" to "service_role";

grant select on table "public"."training_progress" to "service_role";

grant trigger on table "public"."training_progress" to "service_role";

grant truncate on table "public"."training_progress" to "service_role";

grant update on table "public"."training_progress" to "service_role";

grant delete on table "public"."transcription_jobs" to "anon";

grant insert on table "public"."transcription_jobs" to "anon";

grant references on table "public"."transcription_jobs" to "anon";

grant select on table "public"."transcription_jobs" to "anon";

grant trigger on table "public"."transcription_jobs" to "anon";

grant truncate on table "public"."transcription_jobs" to "anon";

grant update on table "public"."transcription_jobs" to "anon";

grant delete on table "public"."transcription_jobs" to "authenticated";

grant insert on table "public"."transcription_jobs" to "authenticated";

grant references on table "public"."transcription_jobs" to "authenticated";

grant select on table "public"."transcription_jobs" to "authenticated";

grant trigger on table "public"."transcription_jobs" to "authenticated";

grant truncate on table "public"."transcription_jobs" to "authenticated";

grant update on table "public"."transcription_jobs" to "authenticated";

grant delete on table "public"."transcription_jobs" to "service_role";

grant insert on table "public"."transcription_jobs" to "service_role";

grant references on table "public"."transcription_jobs" to "service_role";

grant select on table "public"."transcription_jobs" to "service_role";

grant trigger on table "public"."transcription_jobs" to "service_role";

grant truncate on table "public"."transcription_jobs" to "service_role";

grant update on table "public"."transcription_jobs" to "service_role";

grant delete on table "public"."translation_keys" to "anon";

grant insert on table "public"."translation_keys" to "anon";

grant references on table "public"."translation_keys" to "anon";

grant select on table "public"."translation_keys" to "anon";

grant trigger on table "public"."translation_keys" to "anon";

grant truncate on table "public"."translation_keys" to "anon";

grant update on table "public"."translation_keys" to "anon";

grant delete on table "public"."translation_keys" to "authenticated";

grant insert on table "public"."translation_keys" to "authenticated";

grant references on table "public"."translation_keys" to "authenticated";

grant select on table "public"."translation_keys" to "authenticated";

grant trigger on table "public"."translation_keys" to "authenticated";

grant truncate on table "public"."translation_keys" to "authenticated";

grant update on table "public"."translation_keys" to "authenticated";

grant delete on table "public"."translation_keys" to "service_role";

grant insert on table "public"."translation_keys" to "service_role";

grant references on table "public"."translation_keys" to "service_role";

grant select on table "public"."translation_keys" to "service_role";

grant trigger on table "public"."translation_keys" to "service_role";

grant truncate on table "public"."translation_keys" to "service_role";

grant update on table "public"."translation_keys" to "service_role";

grant delete on table "public"."translations" to "anon";

grant insert on table "public"."translations" to "anon";

grant references on table "public"."translations" to "anon";

grant select on table "public"."translations" to "anon";

grant trigger on table "public"."translations" to "anon";

grant truncate on table "public"."translations" to "anon";

grant update on table "public"."translations" to "anon";

grant delete on table "public"."translations" to "authenticated";

grant insert on table "public"."translations" to "authenticated";

grant references on table "public"."translations" to "authenticated";

grant select on table "public"."translations" to "authenticated";

grant trigger on table "public"."translations" to "authenticated";

grant truncate on table "public"."translations" to "authenticated";

grant update on table "public"."translations" to "authenticated";

grant delete on table "public"."translations" to "service_role";

grant insert on table "public"."translations" to "service_role";

grant references on table "public"."translations" to "service_role";

grant select on table "public"."translations" to "service_role";

grant trigger on table "public"."translations" to "service_role";

grant truncate on table "public"."translations" to "service_role";

grant update on table "public"."translations" to "service_role";

grant delete on table "public"."ui_themes" to "anon";

grant insert on table "public"."ui_themes" to "anon";

grant references on table "public"."ui_themes" to "anon";

grant select on table "public"."ui_themes" to "anon";

grant trigger on table "public"."ui_themes" to "anon";

grant truncate on table "public"."ui_themes" to "anon";

grant update on table "public"."ui_themes" to "anon";

grant delete on table "public"."ui_themes" to "authenticated";

grant insert on table "public"."ui_themes" to "authenticated";

grant references on table "public"."ui_themes" to "authenticated";

grant select on table "public"."ui_themes" to "authenticated";

grant trigger on table "public"."ui_themes" to "authenticated";

grant truncate on table "public"."ui_themes" to "authenticated";

grant update on table "public"."ui_themes" to "authenticated";

grant delete on table "public"."ui_themes" to "service_role";

grant insert on table "public"."ui_themes" to "service_role";

grant references on table "public"."ui_themes" to "service_role";

grant select on table "public"."ui_themes" to "service_role";

grant trigger on table "public"."ui_themes" to "service_role";

grant truncate on table "public"."ui_themes" to "service_role";

grant update on table "public"."ui_themes" to "service_role";

grant delete on table "public"."user_calendar_preferences" to "anon";

grant insert on table "public"."user_calendar_preferences" to "anon";

grant references on table "public"."user_calendar_preferences" to "anon";

grant select on table "public"."user_calendar_preferences" to "anon";

grant trigger on table "public"."user_calendar_preferences" to "anon";

grant truncate on table "public"."user_calendar_preferences" to "anon";

grant update on table "public"."user_calendar_preferences" to "anon";

grant delete on table "public"."user_calendar_preferences" to "authenticated";

grant insert on table "public"."user_calendar_preferences" to "authenticated";

grant references on table "public"."user_calendar_preferences" to "authenticated";

grant select on table "public"."user_calendar_preferences" to "authenticated";

grant trigger on table "public"."user_calendar_preferences" to "authenticated";

grant truncate on table "public"."user_calendar_preferences" to "authenticated";

grant update on table "public"."user_calendar_preferences" to "authenticated";

grant delete on table "public"."user_calendar_preferences" to "service_role";

grant insert on table "public"."user_calendar_preferences" to "service_role";

grant references on table "public"."user_calendar_preferences" to "service_role";

grant select on table "public"."user_calendar_preferences" to "service_role";

grant trigger on table "public"."user_calendar_preferences" to "service_role";

grant truncate on table "public"."user_calendar_preferences" to "service_role";

grant update on table "public"."user_calendar_preferences" to "service_role";

grant delete on table "public"."user_notification_preferences" to "anon";

grant insert on table "public"."user_notification_preferences" to "anon";

grant references on table "public"."user_notification_preferences" to "anon";

grant select on table "public"."user_notification_preferences" to "anon";

grant trigger on table "public"."user_notification_preferences" to "anon";

grant truncate on table "public"."user_notification_preferences" to "anon";

grant update on table "public"."user_notification_preferences" to "anon";

grant delete on table "public"."user_notification_preferences" to "authenticated";

grant insert on table "public"."user_notification_preferences" to "authenticated";

grant references on table "public"."user_notification_preferences" to "authenticated";

grant select on table "public"."user_notification_preferences" to "authenticated";

grant trigger on table "public"."user_notification_preferences" to "authenticated";

grant truncate on table "public"."user_notification_preferences" to "authenticated";

grant update on table "public"."user_notification_preferences" to "authenticated";

grant delete on table "public"."user_notification_preferences" to "service_role";

grant insert on table "public"."user_notification_preferences" to "service_role";

grant references on table "public"."user_notification_preferences" to "service_role";

grant select on table "public"."user_notification_preferences" to "service_role";

grant trigger on table "public"."user_notification_preferences" to "service_role";

grant truncate on table "public"."user_notification_preferences" to "service_role";

grant update on table "public"."user_notification_preferences" to "service_role";

grant delete on table "public"."user_sessions" to "anon";

grant insert on table "public"."user_sessions" to "anon";

grant references on table "public"."user_sessions" to "anon";

grant select on table "public"."user_sessions" to "anon";

grant trigger on table "public"."user_sessions" to "anon";

grant truncate on table "public"."user_sessions" to "anon";

grant update on table "public"."user_sessions" to "anon";

grant delete on table "public"."user_sessions" to "authenticated";

grant insert on table "public"."user_sessions" to "authenticated";

grant references on table "public"."user_sessions" to "authenticated";

grant select on table "public"."user_sessions" to "authenticated";

grant trigger on table "public"."user_sessions" to "authenticated";

grant truncate on table "public"."user_sessions" to "authenticated";

grant update on table "public"."user_sessions" to "authenticated";

grant delete on table "public"."user_sessions" to "service_role";

grant insert on table "public"."user_sessions" to "service_role";

grant references on table "public"."user_sessions" to "service_role";

grant select on table "public"."user_sessions" to "service_role";

grant trigger on table "public"."user_sessions" to "service_role";

grant truncate on table "public"."user_sessions" to "service_role";

grant update on table "public"."user_sessions" to "service_role";

grant delete on table "public"."whatsapp_audio_transcriptions" to "anon";

grant insert on table "public"."whatsapp_audio_transcriptions" to "anon";

grant references on table "public"."whatsapp_audio_transcriptions" to "anon";

grant select on table "public"."whatsapp_audio_transcriptions" to "anon";

grant trigger on table "public"."whatsapp_audio_transcriptions" to "anon";

grant truncate on table "public"."whatsapp_audio_transcriptions" to "anon";

grant update on table "public"."whatsapp_audio_transcriptions" to "anon";

grant delete on table "public"."whatsapp_audio_transcriptions" to "authenticated";

grant insert on table "public"."whatsapp_audio_transcriptions" to "authenticated";

grant references on table "public"."whatsapp_audio_transcriptions" to "authenticated";

grant select on table "public"."whatsapp_audio_transcriptions" to "authenticated";

grant trigger on table "public"."whatsapp_audio_transcriptions" to "authenticated";

grant truncate on table "public"."whatsapp_audio_transcriptions" to "authenticated";

grant update on table "public"."whatsapp_audio_transcriptions" to "authenticated";

grant delete on table "public"."whatsapp_audio_transcriptions" to "service_role";

grant insert on table "public"."whatsapp_audio_transcriptions" to "service_role";

grant references on table "public"."whatsapp_audio_transcriptions" to "service_role";

grant select on table "public"."whatsapp_audio_transcriptions" to "service_role";

grant trigger on table "public"."whatsapp_audio_transcriptions" to "service_role";

grant truncate on table "public"."whatsapp_audio_transcriptions" to "service_role";

grant update on table "public"."whatsapp_audio_transcriptions" to "service_role";

grant delete on table "public"."whatsapp_connections" to "anon";

grant insert on table "public"."whatsapp_connections" to "anon";

grant select on table "public"."whatsapp_connections" to "anon";

grant update on table "public"."whatsapp_connections" to "anon";

grant delete on table "public"."whatsapp_connections" to "authenticated";

grant insert on table "public"."whatsapp_connections" to "authenticated";

grant select on table "public"."whatsapp_connections" to "authenticated";

grant update on table "public"."whatsapp_connections" to "authenticated";

grant delete on table "public"."whatsapp_connections" to "service_role";

grant insert on table "public"."whatsapp_connections" to "service_role";

grant select on table "public"."whatsapp_connections" to "service_role";

grant update on table "public"."whatsapp_connections" to "service_role";

grant delete on table "public"."whatsapp_conversations" to "anon";

grant insert on table "public"."whatsapp_conversations" to "anon";

grant select on table "public"."whatsapp_conversations" to "anon";

grant update on table "public"."whatsapp_conversations" to "anon";

grant delete on table "public"."whatsapp_conversations" to "authenticated";

grant insert on table "public"."whatsapp_conversations" to "authenticated";

grant select on table "public"."whatsapp_conversations" to "authenticated";

grant update on table "public"."whatsapp_conversations" to "authenticated";

grant delete on table "public"."whatsapp_conversations" to "service_role";

grant insert on table "public"."whatsapp_conversations" to "service_role";

grant select on table "public"."whatsapp_conversations" to "service_role";

grant update on table "public"."whatsapp_conversations" to "service_role";

grant delete on table "public"."whatsapp_groups" to "anon";

grant insert on table "public"."whatsapp_groups" to "anon";

grant select on table "public"."whatsapp_groups" to "anon";

grant update on table "public"."whatsapp_groups" to "anon";

grant delete on table "public"."whatsapp_groups" to "authenticated";

grant insert on table "public"."whatsapp_groups" to "authenticated";

grant select on table "public"."whatsapp_groups" to "authenticated";

grant update on table "public"."whatsapp_groups" to "authenticated";

grant delete on table "public"."whatsapp_groups" to "service_role";

grant insert on table "public"."whatsapp_groups" to "service_role";

grant select on table "public"."whatsapp_groups" to "service_role";

grant update on table "public"."whatsapp_groups" to "service_role";

grant delete on table "public"."whatsapp_media_files" to "anon";

grant insert on table "public"."whatsapp_media_files" to "anon";

grant references on table "public"."whatsapp_media_files" to "anon";

grant select on table "public"."whatsapp_media_files" to "anon";

grant trigger on table "public"."whatsapp_media_files" to "anon";

grant truncate on table "public"."whatsapp_media_files" to "anon";

grant update on table "public"."whatsapp_media_files" to "anon";

grant delete on table "public"."whatsapp_media_files" to "authenticated";

grant insert on table "public"."whatsapp_media_files" to "authenticated";

grant references on table "public"."whatsapp_media_files" to "authenticated";

grant select on table "public"."whatsapp_media_files" to "authenticated";

grant trigger on table "public"."whatsapp_media_files" to "authenticated";

grant truncate on table "public"."whatsapp_media_files" to "authenticated";

grant update on table "public"."whatsapp_media_files" to "authenticated";

grant delete on table "public"."whatsapp_media_text_extractions" to "anon";

grant insert on table "public"."whatsapp_media_text_extractions" to "anon";

grant references on table "public"."whatsapp_media_text_extractions" to "anon";

grant select on table "public"."whatsapp_media_text_extractions" to "anon";

grant trigger on table "public"."whatsapp_media_text_extractions" to "anon";

grant truncate on table "public"."whatsapp_media_text_extractions" to "anon";

grant update on table "public"."whatsapp_media_text_extractions" to "anon";

grant delete on table "public"."whatsapp_media_text_extractions" to "authenticated";

grant insert on table "public"."whatsapp_media_text_extractions" to "authenticated";

grant references on table "public"."whatsapp_media_text_extractions" to "authenticated";

grant select on table "public"."whatsapp_media_text_extractions" to "authenticated";

grant trigger on table "public"."whatsapp_media_text_extractions" to "authenticated";

grant truncate on table "public"."whatsapp_media_text_extractions" to "authenticated";

grant update on table "public"."whatsapp_media_text_extractions" to "authenticated";

grant delete on table "public"."whatsapp_media_text_extractions" to "service_role";

grant insert on table "public"."whatsapp_media_text_extractions" to "service_role";

grant references on table "public"."whatsapp_media_text_extractions" to "service_role";

grant select on table "public"."whatsapp_media_text_extractions" to "service_role";

grant trigger on table "public"."whatsapp_media_text_extractions" to "service_role";

grant truncate on table "public"."whatsapp_media_text_extractions" to "service_role";

grant update on table "public"."whatsapp_media_text_extractions" to "service_role";

grant delete on table "public"."whatsapp_messages" to "anon";

grant insert on table "public"."whatsapp_messages" to "anon";

grant select on table "public"."whatsapp_messages" to "anon";

grant update on table "public"."whatsapp_messages" to "anon";

grant delete on table "public"."whatsapp_messages" to "authenticated";

grant insert on table "public"."whatsapp_messages" to "authenticated";

grant select on table "public"."whatsapp_messages" to "authenticated";

grant update on table "public"."whatsapp_messages" to "authenticated";

grant delete on table "public"."whatsapp_messages" to "service_role";

grant insert on table "public"."whatsapp_messages" to "service_role";

grant select on table "public"."whatsapp_messages" to "service_role";

grant update on table "public"."whatsapp_messages" to "service_role";

grant delete on table "public"."whatsapp_shared_contacts" to "anon";

grant insert on table "public"."whatsapp_shared_contacts" to "anon";

grant references on table "public"."whatsapp_shared_contacts" to "anon";

grant select on table "public"."whatsapp_shared_contacts" to "anon";

grant trigger on table "public"."whatsapp_shared_contacts" to "anon";

grant truncate on table "public"."whatsapp_shared_contacts" to "anon";

grant update on table "public"."whatsapp_shared_contacts" to "anon";

grant delete on table "public"."whatsapp_shared_contacts" to "authenticated";

grant insert on table "public"."whatsapp_shared_contacts" to "authenticated";

grant references on table "public"."whatsapp_shared_contacts" to "authenticated";

grant select on table "public"."whatsapp_shared_contacts" to "authenticated";

grant trigger on table "public"."whatsapp_shared_contacts" to "authenticated";

grant truncate on table "public"."whatsapp_shared_contacts" to "authenticated";

grant update on table "public"."whatsapp_shared_contacts" to "authenticated";

grant delete on table "public"."whatsapp_shared_locations" to "anon";

grant insert on table "public"."whatsapp_shared_locations" to "anon";

grant references on table "public"."whatsapp_shared_locations" to "anon";

grant select on table "public"."whatsapp_shared_locations" to "anon";

grant trigger on table "public"."whatsapp_shared_locations" to "anon";

grant truncate on table "public"."whatsapp_shared_locations" to "anon";

grant update on table "public"."whatsapp_shared_locations" to "anon";

grant delete on table "public"."whatsapp_shared_locations" to "authenticated";

grant insert on table "public"."whatsapp_shared_locations" to "authenticated";

grant references on table "public"."whatsapp_shared_locations" to "authenticated";

grant select on table "public"."whatsapp_shared_locations" to "authenticated";

grant trigger on table "public"."whatsapp_shared_locations" to "authenticated";

grant truncate on table "public"."whatsapp_shared_locations" to "authenticated";

grant update on table "public"."whatsapp_shared_locations" to "authenticated";

grant delete on table "public"."white_label_brands" to "anon";

grant insert on table "public"."white_label_brands" to "anon";

grant references on table "public"."white_label_brands" to "anon";

grant select on table "public"."white_label_brands" to "anon";

grant trigger on table "public"."white_label_brands" to "anon";

grant truncate on table "public"."white_label_brands" to "anon";

grant update on table "public"."white_label_brands" to "anon";

grant delete on table "public"."white_label_brands" to "authenticated";

grant insert on table "public"."white_label_brands" to "authenticated";

grant references on table "public"."white_label_brands" to "authenticated";

grant select on table "public"."white_label_brands" to "authenticated";

grant trigger on table "public"."white_label_brands" to "authenticated";

grant truncate on table "public"."white_label_brands" to "authenticated";

grant update on table "public"."white_label_brands" to "authenticated";

grant delete on table "public"."white_label_brands" to "service_role";

grant insert on table "public"."white_label_brands" to "service_role";

grant references on table "public"."white_label_brands" to "service_role";

grant select on table "public"."white_label_brands" to "service_role";

grant trigger on table "public"."white_label_brands" to "service_role";

grant truncate on table "public"."white_label_brands" to "service_role";

grant update on table "public"."white_label_brands" to "service_role";


  create policy "service_all_access_attempts"
  on "public"."access_attempts"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_agent_automation_cooldown"
  on "public"."agent_automation_cooldown"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_agent_automation_jobs"
  on "public"."agent_automation_jobs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_agent_presence"
  on "public"."agent_presence"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_ai_conversation_summaries"
  on "public"."ai_conversation_summaries"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_ai_extracted_customer_data"
  on "public"."ai_extracted_customer_data"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_ai_lead_scores"
  on "public"."ai_lead_scores"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_ai_objections"
  on "public"."ai_objections"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_ai_prompt_templates"
  on "public"."ai_prompt_templates"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_ai_reply_suggestions"
  on "public"."ai_reply_suggestions"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_ai_runs"
  on "public"."ai_runs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_api_tokens"
  on "public"."api_tokens"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_app_permissions"
  on "public"."app_permissions"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_app_settings"
  on "public"."app_settings"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_app_user_permissions"
  on "public"."app_user_permissions"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_application_logs"
  on "public"."application_logs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_audit_trail"
  on "public"."audit_trail"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_automation_action_logs"
  on "public"."automation_action_logs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_automation_actions"
  on "public"."automation_actions"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_automation_cooldowns"
  on "public"."automation_cooldowns"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_automation_flows"
  on "public"."automation_flows"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_automation_runs"
  on "public"."automation_runs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_automation_triggers"
  on "public"."automation_triggers"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_backup_configs"
  on "public"."backup_configs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_backup_runs"
  on "public"."backup_runs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_blocked_contacts"
  on "public"."blocked_contacts"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_business_holidays"
  on "public"."business_holidays"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_business_hours"
  on "public"."business_hours"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_calendar_event_participants"
  on "public"."calendar_event_participants"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_calendar_event_templates"
  on "public"."calendar_event_templates"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_calendar_events"
  on "public"."calendar_events"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_calendars"
  on "public"."calendars"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_catalog_categories"
  on "public"."catalog_categories"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_role_all"
  on "public"."catalog_categories"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "service_all_catalog_items"
  on "public"."catalog_items"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_role_all"
  on "public"."catalog_items"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "service_all_commercial_agent_profiles"
  on "public"."commercial_agent_profiles"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_commercial_conversation_analysis"
  on "public"."commercial_conversation_analysis"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_commercial_follow_ups"
  on "public"."commercial_follow_ups"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_commercial_offer_items"
  on "public"."commercial_offer_items"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_commercial_offers"
  on "public"."commercial_offers"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_commercial_opportunities"
  on "public"."commercial_opportunities"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_commercial_proposal_events"
  on "public"."commercial_proposal_events"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_commercial_proposal_items"
  on "public"."commercial_proposal_items"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_commercial_proposals"
  on "public"."commercial_proposals"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_commercial_response_suggestions"
  on "public"."commercial_response_suggestions"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_consent_keywords"
  on "public"."consent_keywords"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_consent_message_templates"
  on "public"."consent_message_templates"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_contact_identities"
  on "public"."contact_identities"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_conversation_assignment_events"
  on "public"."conversation_assignment_events"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_conversation_assignments"
  on "public"."conversation_assignments"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_conversation_flow_sessions"
  on "public"."conversation_flow_sessions"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_conversation_flow_steps"
  on "public"."conversation_flow_steps"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_conversation_flows"
  on "public"."conversation_flows"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_conversation_notes"
  on "public"."conversation_notes"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_crm_activities"
  on "public"."crm_activities"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_crm_campaign_recipients"
  on "public"."crm_campaign_recipients"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_crm_campaigns"
  on "public"."crm_campaigns"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_crm_consent_events"
  on "public"."crm_consent_events"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_crm_contact_list_items"
  on "public"."crm_contact_list_items"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_crm_contact_lists"
  on "public"."crm_contact_lists"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_crm_contact_tags"
  on "public"."crm_contact_tags"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_crm_deals"
  on "public"."crm_deals"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_crm_pipeline_stages"
  on "public"."crm_pipeline_stages"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_crm_tags"
  on "public"."crm_tags"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_crm_task_templates"
  on "public"."crm_task_templates"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_crm_tasks"
  on "public"."crm_tasks"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_deploy_checklist_items"
  on "public"."deploy_checklist_items"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_deploy_checklists"
  on "public"."deploy_checklists"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_deployments"
  on "public"."deployments"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_document_acceptances"
  on "public"."document_acceptances"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_document_events"
  on "public"."document_events"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_document_files"
  on "public"."document_files"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_document_public_links"
  on "public"."document_public_links"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_document_templates"
  on "public"."document_templates"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_documents"
  on "public"."documents"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_external_integrations"
  on "public"."external_integrations"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_file_access_logs"
  on "public"."file_access_logs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_file_folders"
  on "public"."file_folders"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_file_shares"
  on "public"."file_shares"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_file_tag_links"
  on "public"."file_tag_links"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_file_tags"
  on "public"."file_tags"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_file_versions"
  on "public"."file_versions"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_files"
  on "public"."files"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_finance_accounts"
  on "public"."finance_accounts"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_finance_events"
  on "public"."finance_events"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_finance_installments"
  on "public"."finance_installments"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_finance_invoice_items"
  on "public"."finance_invoice_items"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_finance_invoices"
  on "public"."finance_invoices"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_global_search_index"
  on "public"."global_search_index"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_import_column_mappings"
  on "public"."import_column_mappings"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_import_deduplication_rules"
  on "public"."import_deduplication_rules"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_import_jobs"
  on "public"."import_jobs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_import_logs"
  on "public"."import_logs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_import_rows"
  on "public"."import_rows"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_inbound_webhook_endpoints"
  on "public"."inbound_webhook_endpoints"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_inbound_webhook_events"
  on "public"."inbound_webhook_events"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_integration_agents"
  on "public"."integration_agents"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_role_all"
  on "public"."integration_agents"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "service_all_integration_event_mappings"
  on "public"."integration_event_mappings"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_integration_sources"
  on "public"."integration_sources"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_role_all"
  on "public"."integration_sources"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "service_all_integration_sync_logs"
  on "public"."integration_sync_logs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_role_all"
  on "public"."integration_sync_logs"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "service_all_integration_sync_runs"
  on "public"."integration_sync_runs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_role_all"
  on "public"."integration_sync_runs"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "service_all_internal_messaging_gateways"
  on "public"."internal_messaging_gateways"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_job_queue_status"
  on "public"."job_queue_status"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_knowledge_article_versions"
  on "public"."knowledge_article_versions"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_knowledge_articles"
  on "public"."knowledge_articles"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_knowledge_categories"
  on "public"."knowledge_categories"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_knowledge_faqs"
  on "public"."knowledge_faqs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_knowledge_feedback"
  on "public"."knowledge_feedback"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_maintenance_runs"
  on "public"."maintenance_runs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_maintenance_tasks"
  on "public"."maintenance_tasks"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_media_access_logs"
  on "public"."media_access_logs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_media_processing_jobs"
  on "public"."media_processing_jobs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_message_outbox"
  on "public"."message_outbox"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_messaging_policies"
  on "public"."messaging_policies"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_navigation_items"
  on "public"."navigation_items"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_notification_channels"
  on "public"."notification_channels"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_notification_deliveries"
  on "public"."notification_deliveries"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_notification_rules"
  on "public"."notification_rules"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_notification_templates"
  on "public"."notification_templates"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_notifications"
  on "public"."notifications"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_onboarding_flows"
  on "public"."onboarding_flows"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_onboarding_steps"
  on "public"."onboarding_steps"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_operational_checklist_items"
  on "public"."operational_checklist_items"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_operational_checklist_runs"
  on "public"."operational_checklist_runs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_operational_checklists"
  on "public"."operational_checklists"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_organization_pipeline_stages"
  on "public"."organization_pipeline_stages"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_organization_pipelines"
  on "public"."organization_pipelines"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_organization_products_services"
  on "public"."organization_products_services"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_organization_profiles"
  on "public"."organization_profiles"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_organization_tags"
  on "public"."organization_tags"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_outbound_webhook_attempts"
  on "public"."outbound_webhook_attempts"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_outbound_webhook_deliveries"
  on "public"."outbound_webhook_deliveries"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_outbound_webhooks"
  on "public"."outbound_webhooks"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_payment_methods"
  on "public"."payment_methods"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_qa_bugs"
  on "public"."qa_bugs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_qa_test_cases"
  on "public"."qa_test_cases"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_qa_test_plans"
  on "public"."qa_test_plans"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_qa_test_results"
  on "public"."qa_test_results"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_qa_test_runs"
  on "public"."qa_test_runs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_reminders"
  on "public"."reminders"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_saved_searches"
  on "public"."saved_searches"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_search_queries"
  on "public"."search_queries"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_search_settings"
  on "public"."search_settings"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_security_events"
  on "public"."security_events"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_security_rules"
  on "public"."security_rules"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_setup_answers"
  on "public"."setup_answers"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_setup_assistant_sessions"
  on "public"."setup_assistant_sessions"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_setup_questions"
  on "public"."setup_questions"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_setup_validation_checks"
  on "public"."setup_validation_checks"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_setup_validation_results"
  on "public"."setup_validation_results"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_subscription_plans"
  on "public"."subscription_plans"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_support_queue_agents"
  on "public"."support_queue_agents"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_support_queues"
  on "public"."support_queues"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_support_scripts"
  on "public"."support_scripts"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_supported_locales"
  on "public"."supported_locales"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_system_alerts"
  on "public"."system_alerts"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_system_health_checks"
  on "public"."system_health_checks"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_system_messages"
  on "public"."system_messages"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_tenant_domains"
  on "public"."tenant_domains"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_tenant_navigation_overrides"
  on "public"."tenant_navigation_overrides"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_tenant_onboarding_progress"
  on "public"."tenant_onboarding_progress"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_tenant_onboarding_step_status"
  on "public"."tenant_onboarding_step_status"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_tenant_settings"
  on "public"."tenant_settings"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_tenant_subscriptions"
  on "public"."tenant_subscriptions"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_tenant_ui_preferences"
  on "public"."tenant_ui_preferences"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_tenant_usage_metrics"
  on "public"."tenant_usage_metrics"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_training_lessons"
  on "public"."training_lessons"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_training_programs"
  on "public"."training_programs"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_training_progress"
  on "public"."training_progress"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_translation_keys"
  on "public"."translation_keys"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_translations"
  on "public"."translations"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_ui_themes"
  on "public"."ui_themes"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_user_calendar_preferences"
  on "public"."user_calendar_preferences"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_user_notification_preferences"
  on "public"."user_notification_preferences"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_user_sessions"
  on "public"."user_sessions"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_whatsapp_audio_transcriptions"
  on "public"."whatsapp_audio_transcriptions"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_whatsapp_media_text_extractions"
  on "public"."whatsapp_media_text_extractions"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "service_all_white_label_brands"
  on "public"."white_label_brands"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));


CREATE TRIGGER trg_agent_catalog_products_updated_at BEFORE UPDATE ON public.agent_catalog_products FOR EACH ROW EXECUTE FUNCTION public.agent_touch_updated_at();

CREATE TRIGGER trg_agent_connector_types_updated_at BEFORE UPDATE ON public.agent_connector_types FOR EACH ROW EXECUTE FUNCTION public.agent_touch_updated_at();

CREATE TRIGGER trg_agent_dialog_templates_updated_at BEFORE UPDATE ON public.agent_dialog_templates FOR EACH ROW EXECUTE FUNCTION public.agent_touch_updated_at();

CREATE TRIGGER trg_agent_installations_updated_at BEFORE UPDATE ON public.agent_installations FOR EACH ROW EXECUTE FUNCTION public.agent_touch_updated_at();

CREATE TRIGGER trg_catalog_categories_updated_at BEFORE UPDATE ON public.catalog_categories FOR EACH ROW EXECUTE FUNCTION public.catalog_touch_updated_at();

CREATE TRIGGER trg_catalog_items_updated_at BEFORE UPDATE ON public.catalog_items FOR EACH ROW EXECUTE FUNCTION public.catalog_touch_updated_at();

CREATE TRIGGER commercial_agent_profiles_touch_updated_at BEFORE UPDATE ON public.commercial_agent_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_commercial_agent_updated_at();

CREATE TRIGGER commercial_conversation_analysis_touch_updated_at BEFORE UPDATE ON public.commercial_conversation_analysis FOR EACH ROW EXECUTE FUNCTION public.touch_commercial_agent_updated_at();

CREATE TRIGGER commercial_follow_ups_touch_updated_at BEFORE UPDATE ON public.commercial_follow_ups FOR EACH ROW EXECUTE FUNCTION public.touch_commercial_agent_updated_at();

CREATE TRIGGER commercial_opportunities_touch_updated_at BEFORE UPDATE ON public.commercial_opportunities FOR EACH ROW EXECUTE FUNCTION public.touch_commercial_agent_updated_at();

CREATE TRIGGER commercial_response_suggestions_touch_updated_at BEFORE UPDATE ON public.commercial_response_suggestions FOR EACH ROW EXECUTE FUNCTION public.touch_commercial_agent_updated_at();

CREATE TRIGGER trg_integration_agents_updated_at BEFORE UPDATE ON public.integration_agents FOR EACH ROW EXECUTE FUNCTION public.catalog_touch_updated_at();

CREATE TRIGGER trg_integration_sources_updated_at BEFORE UPDATE ON public.integration_sources FOR EACH ROW EXECUTE FUNCTION public.catalog_touch_updated_at();

CREATE TRIGGER internal_messaging_gateways_touch_updated_at BEFORE UPDATE ON public.internal_messaging_gateways FOR EACH ROW EXECUTE FUNCTION public.touch_internal_messaging_gateways_updated_at();

CREATE TRIGGER trg_message_media_updated_at BEFORE UPDATE ON public.message_media FOR EACH ROW EXECUTE FUNCTION public.shamar_set_updated_at();

CREATE TRIGGER trg_message_transcriptions_updated_at BEFORE UPDATE ON public.message_transcriptions FOR EACH ROW EXECUTE FUNCTION public.shamar_set_updated_at();

CREATE TRIGGER trg_transcription_jobs_updated_at BEFORE UPDATE ON public.transcription_jobs FOR EACH ROW EXECUTE FUNCTION public.shamar_set_updated_at();

drop extension if exists "pg_net";

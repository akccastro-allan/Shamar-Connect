create index if not exists whatsapp_conversations_tenant_org_updated_idx
  on public.whatsapp_conversations(tenant_id, organization_id, updated_at desc);

create index if not exists whatsapp_messages_tenant_org_created_idx
  on public.whatsapp_messages(tenant_id, organization_id, created_at desc);

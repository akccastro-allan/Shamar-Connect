import assert from "node:assert/strict";
import test from "node:test";
import { buildInternalConversationOrigin } from "./internal-whatsapp.ts";
import { validateInternalChannelForGatewayAction, validateInternalManualReply, type InternalWhatsappChannel } from "./internal-whatsapp.ts";
import type { InternalGatewayRow } from "./internal-gateways.ts";

const gateway: InternalGatewayRow = {
  id: "11111111-1111-4111-8111-111111111111",
  tenant_id: "tenant-platform",
  name: "Gateway 01",
  slug: "gateway-01",
  provider: "openwa",
  base_url: "https://gateway.example.com/api",
  environment: "production",
  status: "active",
  version: null,
  max_sessions: 9,
  last_health_check_at: null,
  last_error: null,
  metadata: {},
};

function channel(overrides: Partial<InternalWhatsappChannel> = {}): InternalWhatsappChannel {
  return {
    id: "channel-viciados",
    tenant_id: "tenant-platform",
    organization_id: "org-viciados",
    provider: "openwa",
    channel_type: "whatsapp_web",
    session_id: "viciados-01",
    gateway_id: gateway.id,
    status: "connected",
    active: true,
    is_active: true,
    metadata: { commandCenterInternal: true, businessKey: "viciados", purpose: "sales" },
    ...overrides,
  };
}

test("QR e status exigem canal interno autorizado com gateway ativo", () => {
  assert.equal(validateInternalChannelForGatewayAction({ channel: channel(), gateway, tenantId: "tenant-platform" }).ok, true);
  assert.equal(validateInternalChannelForGatewayAction({ channel: channel(), gateway: { ...gateway, status: "inactive" }, tenantId: "tenant-platform" }).ok, false);
  assert.equal(validateInternalChannelForGatewayAction({ channel: channel({ tenant_id: "tenant-client" }), gateway, tenantId: "tenant-platform" }).ok, false);
});

test("envio manual usa o channel da conversa e bloqueia sessão desconectada", () => {
  const conversation = { id: "conv-1", tenant_id: "tenant-platform", organization_id: "org-viciados", channel_id: "channel-viciados", external_chat_id: "5521999999999@c.us", is_group: false };
  assert.equal(validateInternalManualReply({ conversation, channel: channel(), gateway, tenantId: "tenant-platform" }).ok, true);
  assert.equal(validateInternalManualReply({ conversation, channel: channel({ status: "draft" }), gateway, tenantId: "tenant-platform" }).ok, false);
  assert.equal(validateInternalManualReply({ conversation: { ...conversation, channel_id: "channel-moriah" }, channel: channel(), gateway, tenantId: "tenant-platform" }).ok, false);
});

test("grupos internos continuam bloqueados para envio nesta fase", () => {
  const conversation = { id: "conv-1", tenant_id: "tenant-platform", organization_id: "org-viciados", channel_id: "channel-viciados", external_chat_id: "123@g.us", is_group: true };
  assert.equal(validateInternalManualReply({ conversation, channel: channel(), gateway, tenantId: "tenant-platform" }).ok, false);
});

test("duas empresas mantêm origem separada por channel_id, session_id e gateway", () => {
  const viciados = buildInternalConversationOrigin({ businessLabel: "Viciados em Trilhas", channelId: "channel-viciados", sessionId: "viciados-01", gatewayId: gateway.id, purpose: "sales" });
  const moriah = buildInternalConversationOrigin({ businessLabel: "Moriah Systems", channelId: "channel-moriah", sessionId: "moriah-01", gatewayId: gateway.id, purpose: "operations" });

  assert.equal(viciados.empresa, "Viciados em Trilhas");
  assert.equal(moriah.empresa, "Moriah Systems");
  assert.notEqual(viciados.canal, moriah.canal);
  assert.notEqual(viciados.session_id, moriah.session_id);
});

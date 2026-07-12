import assert from "node:assert/strict";
import test from "node:test";
import {
  getChannelGatewayId,
  normalizeGatewayHealth,
  validateGatewayCanConnect,
  validateGatewaySessionLimit,
  validateGatewaySessionUniqueness,
  validateGatewayTenant,
  type InternalGatewayRow,
} from "./internal-gateways.ts";

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

test("gateway interno válido pertence ao tenant e pode conectar quando ativo", () => {
  assert.deepEqual(validateGatewayTenant(gateway, "tenant-platform"), { ok: true });
  assert.deepEqual(validateGatewayCanConnect(gateway, "tenant-platform"), { ok: true });
});

test("gateway de outro tenant e gateway inativo bloqueiam conexão", () => {
  assert.equal(validateGatewayTenant(gateway, "tenant-client").ok, false);
  assert.equal(validateGatewayCanConnect({ ...gateway, status: "inactive" }, "tenant-platform").ok, false);
});

test("session duplicada bloqueia no mesmo gateway e permite em outro gateway", () => {
  const channels = [{ id: "c1", tenant_id: "tenant-platform", organization_id: "org-v", gateway_id: gateway.id, session_id: "viciados-01" }];
  assert.equal(validateGatewaySessionUniqueness({ channels, gatewayId: gateway.id, sessionId: "viciados-01" }).ok, false);
  assert.equal(validateGatewaySessionUniqueness({ channels, gatewayId: "22222222-2222-4222-8222-222222222222", sessionId: "viciados-01" }).ok, true);
});

test("limite de nove usa organization, gateway e company slug", () => {
  const channels = Array.from({ length: 9 }, (_, index) => ({
    id: `c${index + 1}`,
    tenant_id: "tenant-platform",
    organization_id: "org-kids",
    gateway_id: gateway.id,
    session_id: `shamar-kids-0${index + 1}`,
  }));

  assert.equal(validateGatewaySessionLimit({ channels, organizationId: "org-kids", gatewayId: gateway.id, companySlug: "shamar-kids" }).ok, false);
  assert.equal(validateGatewaySessionLimit({ channels, organizationId: "org-other", gatewayId: gateway.id, companySlug: "shamar-kids" }).ok, true);
});

test("gateway_id dedicado tem prioridade sobre metadata durante transição", () => {
  assert.equal(getChannelGatewayId({ gateway_id: "dedicated", metadata: { gatewayId: "metadata" } }), "dedicated");
  assert.equal(getChannelGatewayId({ gateway_id: null, metadata: { gatewayId: "metadata" } }), "metadata");
});

test("health diferencia ready, degraded e offline", () => {
  assert.equal(normalizeGatewayHealth({ ok: true, body: { ready: true, version: "1.0" }, latencyMs: 10 }).state, "ready");
  assert.equal(normalizeGatewayHealth({ ok: true, body: { status: "booting" }, latencyMs: 10 }).state, "degraded");
  assert.equal(normalizeGatewayHealth({ ok: false, status: 500, latencyMs: 10 }).state, "offline");
});

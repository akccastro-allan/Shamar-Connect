import assert from "node:assert/strict";
import test from "node:test";
import {
  countGatewaySessions,
  createInternalGateway,
  findInternalGatewayById,
  listInternalGateways,
  recordGatewayHealth,
  updateInternalGateway,
} from "./internal-gateways-repository.ts";

type Row = Record<string, unknown>;

function createFakeDb(initial: Record<string, Row[]>) {
  const tables = structuredClone(initial);

  class Builder {
    private filters: Array<(row: Row) => boolean> = [];
    private insertRow: Row | null = null;
    private updateRow: Row | null = null;
    private table: string;

    constructor(table: string) { this.table = table; }

    select() { return this; }
    order() { return this; }
    eq(key: string, value: unknown) { this.filters.push((row) => row[key] === value); return this; }
    neq(key: string, value: unknown) { this.filters.push((row) => row[key] !== value); return this; }
    not(key: string, operator: string) { if (operator === "is") this.filters.push((row) => row[key] !== null && row[key] !== undefined); return this; }
    insert(row: Row) { this.insertRow = row; return this; }
    update(row: Row) { this.updateRow = row; return this; }

    private rows() { return (tables[this.table] || []).filter((row) => this.filters.every((filter) => filter(row))); }

    get data() {
      if (this.updateRow) {
        for (const row of this.rows()) Object.assign(row, this.updateRow);
      }
      return this.rows();
    }

    get error() { if (this.updateRow) for (const row of this.rows()) Object.assign(row, this.updateRow); return null; }

    maybeSingle() { return { data: this.rows()[0] || null, error: null }; }

    single() {
      if (this.insertRow) {
        const table = tables[this.table] || (tables[this.table] = []);
        if (this.table === "internal_messaging_gateways" && table.some((row) => row.tenant_id === this.insertRow?.tenant_id && row.slug === this.insertRow?.slug)) {
          return { data: null, error: { code: "23505", message: "duplicate key" } };
        }
        const row = { id: this.insertRow.id || `id-${table.length + 1}`, ...this.insertRow };
        table.push(row);
        return { data: row, error: null };
      }
      return { data: this.rows()[0] || null, error: null };
    }
  }

  return {
    from(table: string) { return new Builder(table); },
    tables,
  };
}

test("repository lista gateways escopados por tenant e calcula activeSessions", async () => {
  const fake = createFakeDb({
    internal_messaging_gateways: [
      { id: "g1", tenant_id: "platform", name: "Gateway 1", slug: "gateway-1", provider: "openwa", base_url: "https://g1.example.com", environment: "production", status: "active", version: null, max_sessions: 9, last_health_check_at: null, last_error: null, metadata: {} },
      { id: "g2", tenant_id: "client", name: "Gateway 2", slug: "gateway-2", provider: "openwa", base_url: "https://g2.example.com", environment: "production", status: "active", version: null, max_sessions: 9, last_health_check_at: null, last_error: null, metadata: {} },
    ],
    channels: [
      { tenant_id: "platform", gateway_id: "g1", channel_type: "whatsapp_web", provider_type: "web_gateway", status: "draft", active: true, is_active: true },
      { tenant_id: "platform", gateway_id: "g1", channel_type: "whatsapp_web", provider_type: "web_gateway", status: "disabled", active: false, is_active: false },
      { tenant_id: "client", gateway_id: "g2", channel_type: "whatsapp_web", provider_type: "web_gateway", status: "draft", active: true, is_active: true },
    ],
  });

  assert.equal((await listInternalGateways(fake as never, "platform")).length, 1);
  assert.equal((await countGatewaySessions(fake as never, "platform")).get("g1"), 1);
});

test("repository persiste gateway e trata slug duplicado como conflito", async () => {
  const fake = createFakeDb({ internal_messaging_gateways: [], channels: [] });
  const input = { tenantId: "platform", name: "Gateway", slug: "gateway-1", provider: "openwa", baseUrl: "https://g1.example.com", environment: "production", status: "inactive", maxSessions: 9 };

  const created = await createInternalGateway(fake as never, input);
  assert.equal(created.ok, true);
  const duplicated = await createInternalGateway(fake as never, input);
  assert.deepEqual(duplicated, { ok: false, conflict: true });
});

test("repository atualiza campos permitidos e não encontra tenant diferente", async () => {
  const fake = createFakeDb({
    internal_messaging_gateways: [{ id: "g1", tenant_id: "platform", name: "Gateway", slug: "gateway-1", provider: "openwa", base_url: "https://g1.example.com", environment: "production", status: "inactive", version: null, max_sessions: 9, last_health_check_at: null, last_error: null, metadata: {} }],
    channels: [],
  });

  await updateInternalGateway(fake as never, "platform", "g1", { name: "Gateway Novo", maxSessions: 5 });
  assert.equal((await findInternalGatewayById(fake as never, "platform", "g1"))?.name, "Gateway Novo");
  assert.equal((await findInternalGatewayById(fake as never, "client", "g1")), null);
});

test("repository registra resultado do health check no tenant correto", async () => {
  const fake = createFakeDb({
    internal_messaging_gateways: [
      { id: "g1", tenant_id: "platform", name: "Gateway", slug: "gateway-1", provider: "openwa", base_url: "https://g1.example.com", environment: "production", status: "inactive", version: null, max_sessions: 9, last_health_check_at: null, last_error: null, metadata: {} },
      { id: "g1", tenant_id: "client", name: "Gateway Client", slug: "gateway-1", provider: "openwa", base_url: "https://g1.example.com", environment: "production", status: "inactive", version: null, max_sessions: 9, last_health_check_at: null, last_error: null, metadata: {} },
    ],
    channels: [],
  });

  await recordGatewayHealth(fake as never, "platform", "g1", { status: "active", version: "1.2.3", lastHealthCheckAt: "2026-07-12T00:00:00.000Z", lastError: null });

  const platformGateway = await findInternalGatewayById(fake as never, "platform", "g1");
  const clientGateway = await findInternalGatewayById(fake as never, "client", "g1");
  assert.equal(platformGateway?.status, "active");
  assert.equal(platformGateway?.version, "1.2.3");
  assert.equal(clientGateway?.status, "inactive");
});

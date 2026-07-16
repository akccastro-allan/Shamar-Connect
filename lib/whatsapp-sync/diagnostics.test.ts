import assert from "node:assert/strict";
import test from "node:test";
import {
  canExecuteSyncDiagnostics,
  isWhatsappSyncDiagnosticsOperatorCandidate,
  runLipsWhatsappSyncDiagnostics,
  sanitizeSyncRun,
} from "./diagnostics.ts";
import type { OpenWaSyncProvider } from "./providers/openwa-sync-provider.ts";

type Row = Record<string, any>;
type Tables = Record<string, Row[]>;

function createDb(seed?: Partial<Tables>) {
  const tables: Tables = {
    channels: [{ id: "channel-lips", tenant_id: "tenant-lips", organization_id: "org-lips", session_id: "lips-main", provider: "whatsapp_web", status: "active", active: true, is_active: true }],
    organizations: [{ id: "org-lips", slug: "auto-pecas-auto-center-lips", name: "Lips", status: "active" }],
    whatsapp_channel_sync_state: [{ id: "state-lips", tenant_id: "tenant-lips", organization_id: "org-lips", channel_id: "channel-lips", sync_status: "idle", last_message_checkpoint: "2026-07-15T10:00:00.000Z", stats: {} }],
    whatsapp_sync_runs: [],
    whatsapp_conversations: [{ id: "conv-existing", channel_id: "channel-lips", external_chat_id: "551100000000@c.us", queue_status: "in_progress", priority: "urgent", requires_human: true, handoff_reason: "manual", department_id: "dept-1", assigned_user_id: "user-1", last_assigned_user_id: "user-1", queue_entered_at: "2026-07-15T09:00:00.000Z", assigned_at: "2026-07-15T09:01:00.000Z", sla_due_at: "2026-07-15T09:10:00.000Z", sla_status: "breached", resolved_at: null, closed_at: null }],
    whatsapp_messages: [],
    crm_contacts: [],
    contact_identities: [],
    ...(seed || {}),
  };
  let ids = 0;

  class Query {
    table: string;
    filters: Array<(row: Row) => boolean> = [];
    action: "select" | "insert" | "update" = "select";
    payload: any;
    limitValue: number | null = null;
    orderBy: { column: string; ascending: boolean }[] = [];

    constructor(table: string) { this.table = table; }
    select() { return this; }
    eq(column: string, value: any) { this.filters.push((row) => row[column] === value); return this; }
    in(column: string, values: any[]) { this.filters.push((row) => values.includes(row[column])); return this; }
    not(column: string, operator: string) { if (operator === "is") this.filters.push((row) => row[column] !== null && row[column] !== undefined); return this; }
    lte(column: string, value: any) { this.filters.push((row) => String(row[column] || "") <= String(value)); return this; }
    lt(column: string, value: any) { this.filters.push((row) => String(row[column] || "") < String(value)); return this; }
    gte(column: string, value: any) { this.filters.push((row) => String(row[column] || "") >= String(value)); return this; }
    order(column: string, options?: { ascending?: boolean }) { this.orderBy.push({ column, ascending: options?.ascending !== false }); return this; }
    limit(value: number) { this.limitValue = value; return this; }
    insert(payload: any) { this.action = "insert"; this.payload = payload; return this; }
    update(payload: any) { this.action = "update"; this.payload = payload; return this; }

    rows() {
      let rows = [...(tables[this.table] || [])].filter((row) => this.filters.every((filter) => filter(row)));
      for (const order of [...this.orderBy].reverse()) {
        rows = rows.sort((a, b) => String(a[order.column] || "").localeCompare(String(b[order.column] || "")) * (order.ascending ? 1 : -1));
      }
      if (this.limitValue !== null) rows = rows.slice(0, this.limitValue);
      return rows;
    }

    execute() {
      if (this.action === "insert") {
        const payloads = Array.isArray(this.payload) ? this.payload : [this.payload];
        const inserted = payloads.map((payload) => ({ id: payload.id || `${this.table}-${++ids}`, ...payload }));
        tables[this.table] ||= [];
        tables[this.table].push(...inserted);
        return { data: inserted, error: null };
      }
      if (this.action === "update") {
        const matched = this.rows();
        for (const row of matched) {
          for (const [key, value] of Object.entries(this.payload)) {
            if (value !== undefined) row[key] = value;
          }
        }
        return { data: matched, error: null };
      }
      return { data: this.rows(), error: null };
    }

    maybeSingle() { const result = this.execute(); return { data: result.data[0] || null, error: null }; }
    single() { const result = this.execute(); return { data: result.data[0] || null, error: null }; }
    then(resolve: (value: any) => void, reject?: (reason: any) => void) { try { resolve(this.execute()); } catch (error) { reject?.(error); } }
  }

  return { db: { from: (table: string) => new Query(table) } as any, tables };
}

function providerFactory(calls: string[] = []): (sessionId: string) => OpenWaSyncProvider {
  return (sessionId: string) => {
    calls.push(sessionId);
    return {
      sessionId,
      async getConnectionStatus() { return "ready"; },
      async listChats() {
        return [
          { id: "551100000000@c.us", name: "Cliente", isGroup: false, lastMessageAt: "2026-07-15T11:00:00.000Z" },
          { id: "120363@g.us", name: "Grupo", isGroup: true, lastMessageAt: "2026-07-15T11:00:00.000Z" },
        ];
      },
      async listChatMessages(chatId: string) {
        if (chatId.endsWith("@g.us")) return [];
        return [{ id: `msg-${chatId}`, chatId, direction: "inbound", from: chatId, body: "teste", timestamp: Date.parse("2026-07-15T11:00:00.000Z") / 1000 }];
      },
    };
  };
}

test("diagnostics access requires platform owner/admin with null organization and command center", () => {
  const metadata = { features: { command_center: true } };
  assert.equal(isWhatsappSyncDiagnosticsOperatorCandidate({ isPlatformTenant: true, role: "owner", organizationId: null, metadata }), true);
  assert.equal(isWhatsappSyncDiagnosticsOperatorCandidate({ isPlatformTenant: true, role: "admin", organizationId: null, metadata }), true);
  assert.equal(isWhatsappSyncDiagnosticsOperatorCandidate({ isPlatformTenant: false, role: "owner", organizationId: null, metadata }), false);
  assert.equal(isWhatsappSyncDiagnosticsOperatorCandidate({ isPlatformTenant: true, role: "owner", organizationId: "org-lips", metadata }), false);
  assert.equal(isWhatsappSyncDiagnosticsOperatorCandidate({ isPlatformTenant: true, role: "attendant", organizationId: null, metadata }), false);
  assert.equal(isWhatsappSyncDiagnosticsOperatorCandidate({ isPlatformTenant: true, role: "owner", organizationId: null, metadata: { features: {} } }), false);
});

test("production blocks execution without explicit internal flag and preview allows it", () => {
  assert.equal(canExecuteSyncDiagnostics({ vercelEnv: "preview", metadata: null }), true);
  assert.equal(canExecuteSyncDiagnostics({ vercelEnv: "production", metadata: null }), false);
  assert.equal(canExecuteSyncDiagnostics({ vercelEnv: "production", metadata: { features: { whatsapp_sync_diagnostics_execute: true } } }), true);
});

test("diagnostic uses only lips-main, processes one run and preserves queue", async () => {
  const { db, tables } = createDb();
  const calls: string[] = [];
  const result = await runLipsWhatsappSyncDiagnostics(db, providerFactory(calls), { action: "diagnostic", actorUserId: "platform-user" });

  assert.deepEqual(Array.from(new Set(calls)), ["lips-main"]);
  assert.equal(result.processedRuns, 1);
  assert.equal(result.queuePreserved, true);
  assert.equal(result.sentMessages, false);
  assert.equal(result.returnedSecret, false);
  assert.equal(tables.whatsapp_sync_runs[0].mode, "manual_diagnostic");
  assert.equal(tables.whatsapp_sync_runs[0].chat_limit, 1);
});

test("bootstrap is limited to one controlled batch", async () => {
  const { db, tables } = createDb();
  const result = await runLipsWhatsappSyncDiagnostics(db, providerFactory(), { action: "bootstrap", actorUserId: "platform-user" });

  assert.equal(result.processedRuns, 1);
  assert.equal(tables.whatsapp_sync_runs[0].mode, "bootstrap");
  assert.equal(tables.whatsapp_sync_runs[0].chat_limit, 100);
  assert.equal(tables.whatsapp_sync_runs[0].message_limit, 100);
  assert.equal(result.runs[0].chatsSkipped, 1);
});

test("incremental honors checkpoint and avoids old messages", async () => {
  const { db } = createDb({
    whatsapp_channel_sync_state: [{ id: "state-lips", tenant_id: "tenant-lips", organization_id: "org-lips", channel_id: "channel-lips", sync_status: "idle", last_message_checkpoint: "2026-07-15T12:00:00.000Z", stats: {} }],
  });
  const provider = () => ({
    sessionId: "lips-main",
    async getConnectionStatus() { return "ready" as const; },
    async listChats() { return [{ id: "551100000000@c.us", name: "Cliente", isGroup: false, lastMessageAt: "2026-07-15T12:30:00.000Z" }]; },
    async listChatMessages(chatId: string) {
      return [
        { id: "old", chatId, direction: "inbound" as const, from: chatId, body: "old", timestamp: Date.parse("2026-07-15T11:59:00.000Z") / 1000 },
        { id: "new", chatId, direction: "inbound" as const, from: chatId, body: "new", timestamp: Date.parse("2026-07-15T12:01:00.000Z") / 1000 },
      ];
    },
  });

  const result = await runLipsWhatsappSyncDiagnostics(db, provider, { action: "incremental", actorUserId: "platform-user" });
  assert.equal(result.runs[0].messagesScanned, 1);
  assert.equal(result.runs[0].messagesSaved, 1);
});

test("sanitized run never returns stack traces or provider URLs", () => {
  const run = sanitizeSyncRun({ id: "1234567890abcdef", status: "failed", mode: "bootstrap", error_message: "boom https://secret.example.com/token stack line" });
  assert.equal(run?.id, "123456...cdef");
  assert.equal(run?.error?.includes("https://secret.example.com"), false);
});

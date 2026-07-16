import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  enqueueDueWhatsappReconciliations,
  enqueueWhatsappSyncForConnectedSession,
  processQueuedWhatsappSyncRuns,
  recoverAbandonedLocks,
} from "./service.ts";
import type { OpenWaSyncProvider } from "./providers/openwa-sync-provider.ts";

const tenantId = "11111111-1111-4111-8111-111111111111";
const organizationId = "8f074193-bf58-4537-9842-720619a9f259";
const channelId = "22222222-2222-4222-8222-222222222222";
const migration0035 = readFileSync("supabase/migrations/20260716081940_0035_whatsapp_auto_sync.sql", "utf8");

type Tables = Record<string, Record<string, any>[]>;

function createMemoryDb(seed?: Partial<Tables>) {
  const tables: Tables = {
    channels: [],
    whatsapp_channel_sync_state: [],
    whatsapp_sync_runs: [],
    whatsapp_conversations: [],
    whatsapp_messages: [],
    crm_contacts: [],
    contact_identities: [],
    ...(seed || {}),
  };
  let ids = 0;
  const nextId = () => `id-${++ids}`;

  class Query {
    table: string;
    action: "select" | "insert" | "update" = "select";
    filters: ((row: Record<string, any>) => boolean)[] = [];
    payload: any;
    limitValue: number | null = null;
    orderBy: { column: string; ascending: boolean }[] = [];
    singleMode: "maybe" | "single" | null = null;

    constructor(table: string) {
      this.table = table;
    }

    select() { return this; }
    maybeSingle() { this.singleMode = "maybe"; return this; }
    single() { this.singleMode = "single"; return this; }
    limit(value: number) { this.limitValue = value; return this; }
    order(column: string, options?: { ascending?: boolean }) {
      this.orderBy.push({ column, ascending: options?.ascending !== false });
      return this;
    }
    eq(column: string, value: any) { this.filters.push((row) => row[column] === value); return this; }
    in(column: string, values: any[]) { this.filters.push((row) => values.includes(row[column])); return this; }
    lt(column: string, value: any) { this.filters.push((row) => String(row[column] || "") < String(value)); return this; }
    lte(column: string, value: any) { this.filters.push((row) => String(row[column] || "") <= String(value)); return this; }
    gte(column: string, value: any) { this.filters.push((row) => String(row[column] || "") >= String(value)); return this; }
    not(column: string, operator: string, value: any) {
      if (operator === "is" && value === null) this.filters.push((row) => row[column] !== null && row[column] !== undefined);
      return this;
    }
    insert(payload: any) { this.action = "insert"; this.payload = payload; return this; }
    update(payload: any) { this.action = "update"; this.payload = payload; return this; }

    execute() {
      const rows = tables[this.table] || (tables[this.table] = []);
      if (this.action === "insert") {
        const payloads = Array.isArray(this.payload) ? this.payload : [this.payload];
        const inserted = payloads.map((payload) => ({ id: payload.id || nextId(), ...payload }));
        rows.push(...inserted);
        return this.result(inserted);
      }

      let matched = rows.filter((row) => this.filters.every((filter) => filter(row)));
      if (this.action === "update") {
        matched = matched.map((row) => {
          const patch = Object.fromEntries(Object.entries(this.payload).filter(([, value]) => value !== undefined));
          Object.assign(row, patch);
          return row;
        });
      }

      for (const order of [...this.orderBy].reverse()) {
        matched = [...matched].sort((a, b) => {
          const av = String(a[order.column] || "");
          const bv = String(b[order.column] || "");
          return order.ascending ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
      if (this.limitValue !== null) matched = matched.slice(0, this.limitValue);
      return this.result(matched);
    }

    result(rows: Record<string, any>[]) {
      if (this.singleMode === "single") return { data: rows[0] || null, error: rows[0] ? null : new Error("single row not found") };
      if (this.singleMode === "maybe") return { data: rows[0] || null, error: null };
      return { data: rows, error: null };
    }

    then(resolve: (value: any) => void, reject?: (reason: any) => void) {
      try { resolve(this.execute()); } catch (error) { reject?.(error); }
    }
  }

  const db = { from: (table: string) => new Query(table) } as any;
  return { db, tables };
}

function seedBase(extra?: Partial<Tables>) {
  return createMemoryDb({
    channels: [{ id: channelId, tenant_id: tenantId, organization_id: organizationId, session_id: "lips-main", provider: "whatsapp_web", is_active: true, active: true }],
    whatsapp_channel_sync_state: [{ id: "state-1", tenant_id: tenantId, organization_id: organizationId, channel_id: channelId, session_id: "lips-main", sync_status: "idle", last_success_at: "2026-07-15T00:00:00.000Z", next_reconciliation_at: "2026-07-15T00:00:00.000Z" }],
    ...(extra || {}),
  });
}

function providerFactory(options?: { status?: "ready" | "disconnected"; chatCount?: number; onListChats?: () => void }): () => OpenWaSyncProvider {
  return () => ({
    sessionId: "lips-main",
    async getConnectionStatus() { return options?.status || "ready"; },
    async listChats() {
      options?.onListChats?.();
      const count = options?.chatCount ?? 1;
      return Array.from({ length: count }, (_, index) => ({ id: `55119999999${index}@c.us`, name: `Cliente ${index}`, isGroup: false, unreadCount: 1, lastMessageAt: "2026-07-15T12:00:00.000Z" }));
    },
    async listChatMessages(chatId: string) {
      return [{ id: `msg-${chatId}`, chatId, direction: "inbound", from: chatId, body: "preciso de uma peça", timestamp: 1_783_000_000 }];
    },
  });
}

function outboundProviderFactory(): () => OpenWaSyncProvider {
  return () => ({
    sessionId: "lips-main",
    async getConnectionStatus() { return "ready"; },
    async listChats() { return [{ id: "5511888888888@c.us", name: "Cliente outbound", isGroup: false, lastMessageAt: "2026-07-15T12:00:00.000Z" }]; },
    async listChatMessages(chatId: string) { return [{ id: `msg-${chatId}`, chatId, direction: "outbound", to: chatId, body: "resposta manual", timestamp: 1_783_000_000 }]; },
  });
}

test("worker calls OpenWA provider and persists chat, contact, conversation, message and checkpoints", async () => {
  let listChatsCalls = 0;
  const { db, tables } = seedBase({
    whatsapp_sync_runs: [{ id: "run-1", tenant_id: tenantId, organization_id: organizationId, channel_id: channelId, sync_state_id: "state-1", mode: "bootstrap", status: "queued", selected_chat_ids: [], chat_limit: 100, message_limit: 100, scheduled_at: "2026-07-15T00:00:00.000Z", metadata: {} }],
  });

  const result = await processQueuedWhatsappSyncRuns(db, 1, providerFactory({ onListChats: () => { listChatsCalls += 1; } }));

  assert.equal(result.processedRuns, 1);
  assert.equal(listChatsCalls, 1);
  assert.equal(tables.whatsapp_sync_runs[0].status, "completed");
  assert.equal(tables.whatsapp_conversations.length, 1);
  assert.equal(tables.whatsapp_messages.length, 1);
  assert.equal(tables.crm_contacts.length, 1);
  assert.equal(tables.contact_identities.length, 1);
  assert.equal(tables.whatsapp_channel_sync_state[0].sync_status, "ready");
  assert.ok(tables.whatsapp_channel_sync_state[0].last_message_checkpoint);
});

test("0035 keeps sync tables server-only", () => {
  assert.match(migration0035, /revoke all on table public\.whatsapp_channel_sync_state from public, anon, authenticated/);
  assert.match(migration0035, /revoke all on table public\.whatsapp_sync_runs from public, anon, authenticated/);
  assert.match(migration0035, /grant all on table public\.whatsapp_channel_sync_state to service_role/);
  assert.match(migration0035, /grant all on table public\.whatsapp_sync_runs to service_role/);
});

test("worker skips offline channel without listing chats", async () => {
  let listChatsCalls = 0;
  const { db, tables } = seedBase({
    whatsapp_sync_runs: [{ id: "run-1", tenant_id: tenantId, organization_id: organizationId, channel_id: channelId, sync_state_id: "state-1", mode: "reconciliation", status: "queued", selected_chat_ids: [], chat_limit: 100, message_limit: 100, scheduled_at: "2026-07-15T00:00:00.000Z", metadata: {} }],
  });

  await processQueuedWhatsappSyncRuns(db, 1, providerFactory({ status: "disconnected", onListChats: () => { listChatsCalls += 1; } }));

  assert.equal(listChatsCalls, 0);
  assert.equal(tables.whatsapp_sync_runs[0].status, "skipped");
  assert.equal(tables.whatsapp_channel_sync_state[0].sync_status, "degraded");
});

test("partial run stores continuation job", async () => {
  const { db, tables } = seedBase({
    whatsapp_sync_runs: [{ id: "run-1", tenant_id: tenantId, organization_id: organizationId, channel_id: channelId, sync_state_id: "state-1", mode: "bootstrap", status: "queued", selected_chat_ids: [], chat_limit: 100, message_limit: 100, scheduled_at: "2026-07-15T00:00:00.000Z", metadata: {} }],
  });

  await processQueuedWhatsappSyncRuns(db, 1, providerFactory({ chatCount: 101 }));

  assert.equal(tables.whatsapp_sync_runs[0].status, "partial");
  assert.equal(tables.whatsapp_sync_runs[1].status, "queued");
  assert.equal(tables.whatsapp_sync_runs[1].metadata.cursorOffset, 100);
});

test("abandoned lock is recovered and valid lock is preserved", async () => {
  const old = new Date(Date.now() - 11 * 60_000).toISOString();
  const fresh = new Date().toISOString();
  const { db, tables } = seedBase({
    whatsapp_sync_runs: [
      { id: "old-run", channel_id: channelId, status: "running", locked_at: old, diagnostics: {} },
      { id: "fresh-run", channel_id: "other-channel", status: "running", locked_at: fresh, diagnostics: {} },
    ],
  });

  await recoverAbandonedLocks(db);

  assert.equal(tables.whatsapp_sync_runs.find((run) => run.id === "old-run")?.status, "queued");
  assert.equal(tables.whatsapp_sync_runs.find((run) => run.id === "fresh-run")?.status, "running");
});

test("repeated connected event does not duplicate bootstrap", async () => {
  const { db, tables } = seedBase({ whatsapp_sync_runs: [] });

  const first = await enqueueWhatsappSyncForConnectedSession(db, { sessionId: "lips-main", triggerSource: "test" });
  const second = await enqueueWhatsappSyncForConnectedSession(db, { sessionId: "lips-main", triggerSource: "test" });

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(tables.whatsapp_sync_runs.length, 1);
});

test("reconciliation enqueue is idempotent while active run exists", async () => {
  const { db, tables } = seedBase({ whatsapp_sync_runs: [] });

  const first = await enqueueDueWhatsappReconciliations(db, providerFactory());
  const second = await enqueueDueWhatsappReconciliations(db, providerFactory());

  assert.equal(first.queued, 1);
  assert.equal(second.queued, 0);
  assert.equal(tables.whatsapp_sync_runs.length, 1);
  assert.equal(tables.whatsapp_sync_runs[0].mode, "reconciliation");
});

test("sync preserves existing queue fields and deduplicates webhook message", async () => {
  const forbidden = {
    queue_status: "in_progress",
    priority: "urgent",
    requires_human: true,
    handoff_reason: "already_routed",
    department_id: "dept-1",
    assigned_user_id: "user-1",
    last_assigned_user_id: "user-1",
    queue_entered_at: "2026-07-14T10:00:00.000Z",
    assigned_at: "2026-07-14T10:01:00.000Z",
    first_human_response_at: "2026-07-14T10:02:00.000Z",
    sla_due_at: "2026-07-14T10:10:00.000Z",
    sla_status: "breached",
    resolved_at: "2026-07-14T11:00:00.000Z",
    closed_at: null,
  };
  const chatId = "551199999990@c.us";
  const messageId = `msg-${chatId}`;
  const { db, tables } = seedBase({
    whatsapp_conversations: [{ id: "conv-1", tenant_id: tenantId, organization_id: organizationId, channel_id: channelId, external_chat_id: chatId, provider: "whatsapp_web", ...forbidden }],
    whatsapp_messages: [{ id: "message-1", tenant_id: tenantId, organization_id: organizationId, channel_id: channelId, conversation_id: "conv-1", external_message_id: messageId, direction: "inbound", body: "webhook" }],
    whatsapp_sync_runs: [{ id: "run-1", tenant_id: tenantId, organization_id: organizationId, channel_id: channelId, sync_state_id: "state-1", mode: "bootstrap", status: "queued", selected_chat_ids: [chatId], chat_limit: 1, message_limit: 100, scheduled_at: "2026-07-15T00:00:00.000Z", metadata: {} }],
  });

  await processQueuedWhatsappSyncRuns(db, 1, providerFactory());

  const conversation = tables.whatsapp_conversations[0];
  for (const [field, value] of Object.entries(forbidden)) {
    assert.equal(conversation[field], value, `field changed: ${field}`);
  }
  assert.equal(tables.whatsapp_messages.length, 1);
  assert.equal(tables.whatsapp_messages[0].body, "preciso de uma peça");
});

test("sync deduplicates outbound message already persisted by manual send", async () => {
  const chatId = "5511888888888@c.us";
  const messageId = `msg-${chatId}`;
  const { db, tables } = seedBase({
    whatsapp_conversations: [{ id: "conv-1", tenant_id: tenantId, organization_id: organizationId, channel_id: channelId, external_chat_id: chatId, provider: "whatsapp_web", queue_status: "in_progress" }],
    whatsapp_messages: [{ id: "message-1", tenant_id: tenantId, organization_id: organizationId, channel_id: channelId, conversation_id: "conv-1", external_message_id: messageId, direction: "outbound", body: "resposta manual" }],
    whatsapp_sync_runs: [{ id: "run-1", tenant_id: tenantId, organization_id: organizationId, channel_id: channelId, sync_state_id: "state-1", mode: "incremental", status: "queued", selected_chat_ids: [chatId], chat_limit: 1, message_limit: 100, scheduled_at: "2026-07-15T00:00:00.000Z", metadata: {} }],
  });

  await processQueuedWhatsappSyncRuns(db, 1, outboundProviderFactory());

  assert.equal(tables.whatsapp_messages.length, 1);
  assert.equal(tables.whatsapp_messages[0].direction, "outbound");
  assert.equal(tables.whatsapp_conversations[0].queue_status, "in_progress");
});

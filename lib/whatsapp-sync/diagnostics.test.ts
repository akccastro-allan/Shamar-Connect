import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  canExecuteSyncDiagnostics,
  getLipsWhatsappReadOnlyStatus,
  getLipsWhatsappSyncDiagnostics,
  isReadOnlySyncDiagnosticsAction,
  isWriteSyncDiagnosticsAction,
  probeLipsWhatsappChatsReadOnly,
  isWhatsappSyncDiagnosticsOperatorCandidate,
  runLipsWhatsappSyncDiagnostics,
  sanitizeSyncRun,
  validateLipsWhatsappChatPaginationReadOnly,
} from "./diagnostics.ts";
import type { OpenWaSyncProvider } from "./providers/openwa-sync-provider.ts";

type Row = Record<string, any>;
type Tables = Record<string, Row[]>;

function createDb(seed?: Partial<Tables>) {
  const writes: Array<{ table: string; action: string; payload: unknown }> = [];
  const tables: Tables = {
    channels: [
      {
        id: "channel-lips",
        tenant_id: "tenant-lips",
        organization_id: "org-lips",
        session_id: "lips-main",
        provider: "openwa",
        status: "active",
        active: true,
        is_active: true,
        gateway_id: "gateway-lips",
      },
    ],
    internal_messaging_gateways: [
      {
        id: "gateway-lips",
        provider: "openwa",
        environment: "production",
        status: "active",
        base_url: "https://gateway.example.com",
      },
    ],
    organizations: [
      {
        id: "org-lips",
        slug: "auto-pecas-auto-center-lips",
        name: "Lips",
        status: "active",
      },
    ],
    whatsapp_channel_sync_state: [
      {
        id: "state-lips",
        tenant_id: "tenant-lips",
        organization_id: "org-lips",
        channel_id: "channel-lips",
        sync_status: "idle",
        last_message_checkpoint: "2026-07-15T10:00:00.000Z",
        stats: {},
      },
    ],
    whatsapp_sync_runs: [],
    whatsapp_conversations: [
      {
        id: "conv-existing",
        channel_id: "channel-lips",
        external_chat_id: "551100000000@c.us",
        queue_status: "in_progress",
        priority: "urgent",
        requires_human: true,
        handoff_reason: "manual",
        department_id: "dept-1",
        assigned_user_id: "user-1",
        last_assigned_user_id: "user-1",
        queue_entered_at: "2026-07-15T09:00:00.000Z",
        assigned_at: "2026-07-15T09:01:00.000Z",
        sla_due_at: "2026-07-15T09:10:00.000Z",
        sla_status: "breached",
        resolved_at: null,
        closed_at: null,
      },
    ],
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

    constructor(table: string) {
      this.table = table;
    }
    select() {
      return this;
    }
    eq(column: string, value: any) {
      this.filters.push((row) => row[column] === value);
      return this;
    }
    is(column: string, value: any) {
      this.filters.push((row) => row[column] === value);
      return this;
    }
    in(column: string, values: any[]) {
      this.filters.push((row) => values.includes(row[column]));
      return this;
    }
    not(column: string, operator: string) {
      if (operator === "is")
        this.filters.push(
          (row) => row[column] !== null && row[column] !== undefined,
        );
      return this;
    }
    lte(column: string, value: any) {
      this.filters.push((row) => String(row[column] || "") <= String(value));
      return this;
    }
    lt(column: string, value: any) {
      this.filters.push((row) => String(row[column] || "") < String(value));
      return this;
    }
    gte(column: string, value: any) {
      this.filters.push((row) => String(row[column] || "") >= String(value));
      return this;
    }
    order(column: string, options?: { ascending?: boolean }) {
      this.orderBy.push({ column, ascending: options?.ascending !== false });
      return this;
    }
    limit(value: number) {
      this.limitValue = value;
      return this;
    }
    insert(payload: any) {
      this.action = "insert";
      this.payload = payload;
      return this;
    }
    update(payload: any) {
      this.action = "update";
      this.payload = payload;
      return this;
    }

    rows() {
      let rows = [...(tables[this.table] || [])].filter((row) =>
        this.filters.every((filter) => filter(row)),
      );
      for (const order of [...this.orderBy].reverse()) {
        rows = rows.sort(
          (a, b) =>
            String(a[order.column] || "").localeCompare(
              String(b[order.column] || ""),
            ) * (order.ascending ? 1 : -1),
        );
      }
      if (this.limitValue !== null) rows = rows.slice(0, this.limitValue);
      return rows;
    }

    execute() {
      if (this.action === "insert") {
        writes.push({
          table: this.table,
          action: "insert",
          payload: this.payload,
        });
        const payloads = Array.isArray(this.payload)
          ? this.payload
          : [this.payload];
        const inserted = payloads.map((payload) => ({
          id: payload.id || `${this.table}-${++ids}`,
          ...payload,
        }));
        tables[this.table] ||= [];
        tables[this.table].push(...inserted);
        return { data: inserted, error: null };
      }
      if (this.action === "update") {
        writes.push({
          table: this.table,
          action: "update",
          payload: this.payload,
        });
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

    maybeSingle() {
      const result = this.execute();
      return { data: result.data[0] || null, error: null };
    }
    single() {
      const result = this.execute();
      return { data: result.data[0] || null, error: null };
    }
    then(resolve: (value: any) => void, reject?: (reason: any) => void) {
      try {
        resolve(this.execute());
      } catch (error) {
        reject?.(error);
      }
    }
  }

  return {
    db: { from: (table: string) => new Query(table) } as any,
    tables,
    writes,
  };
}

function providerFactory(
  calls: string[] = [],
  optionsCalls: Array<Record<string, unknown> | undefined> = [],
  listOptionsCalls: Array<Record<string, unknown> | undefined> = [],
): (
  sessionId: string,
  options?: Record<string, unknown>,
) => OpenWaSyncProvider {
  return (sessionId: string, options?: Record<string, unknown>) => {
    calls.push(sessionId);
    optionsCalls.push(options);
    return {
      sessionId,
      async getConnectionStatus() {
        return "ready";
      },
      async listChats(options?: Record<string, unknown>) {
        listOptionsCalls.push(options);
        return [
          {
            id: "551100000000@c.us",
            name: "Cliente",
            isGroup: false,
            lastMessageAt: "2026-07-15T11:00:00.000Z",
          },
          {
            id: "120363@g.us",
            name: "Grupo",
            isGroup: true,
            lastMessageAt: "2026-07-15T11:00:00.000Z",
          },
        ];
      },
      async listChatMessages(chatId: string) {
        if (chatId.endsWith("@g.us")) return [];
        return [
          {
            id: `msg-${chatId}`,
            chatId,
            direction: "inbound",
            from: chatId,
            body: "teste",
            timestamp: Date.parse("2026-07-15T11:00:00.000Z") / 1000,
          },
        ];
      },
    };
  };
}

function paginatedProviderFactory(
  pages: Record<number, Array<{ id: string; name?: string }>>,
  listOptionsCalls: Array<Record<string, unknown> | undefined> = [],
) {
  return () => ({
    sessionId: "lips-main",
    async getConnectionStatus() {
      return "ready" as const;
    },
    async listChats(options?: Record<string, unknown>) {
      listOptionsCalls.push(options);
      return (pages[Number(options?.offset || 0)] || []).map((chat) => ({
        id: chat.id,
        name: chat.name || "Cliente",
        isGroup: false,
      }));
    },
    async listChatMessages() {
      return [];
    },
  });
}

async function withGatewayEnv<T>(
  token: string | undefined,
  fetchImpl: typeof fetch,
  callback: () => Promise<T>,
) {
  const previousToken = process.env.WHATSAPP_WEB_GATEWAY_TOKEN;
  const previousFetch = globalThis.fetch;
  if (token === undefined) delete process.env.WHATSAPP_WEB_GATEWAY_TOKEN;
  else process.env.WHATSAPP_WEB_GATEWAY_TOKEN = token;
  globalThis.fetch = fetchImpl;
  try {
    return await callback();
  } finally {
    if (previousToken === undefined)
      delete process.env.WHATSAPP_WEB_GATEWAY_TOKEN;
    else process.env.WHATSAPP_WEB_GATEWAY_TOKEN = previousToken;
    globalThis.fetch = previousFetch;
  }
}

function gatewayFetch(
  payloads: Record<string, { status: number; body: unknown }>,
) {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(
      (init?.headers as Record<string, string> | undefined)?.["x-api-key"],
      "server-token",
    );
    assert.equal(
      (init?.headers as Record<string, string> | undefined)?.authorization,
      "Bearer server-token",
    );
    const url = String(input);
    const match = Object.entries(payloads).find(([suffix]) =>
      url.endsWith(suffix),
    );
    const response = match?.[1] || {
      status: 404,
      body: { error: "not_found" },
    };
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

test("diagnostics access requires platform owner/admin with null organization and command center", () => {
  const metadata = { features: { command_center: true } };
  assert.equal(
    isWhatsappSyncDiagnosticsOperatorCandidate({
      isPlatformTenant: true,
      role: "owner",
      organizationId: null,
      metadata,
    }),
    true,
  );
  assert.equal(
    isWhatsappSyncDiagnosticsOperatorCandidate({
      isPlatformTenant: true,
      role: "admin",
      organizationId: null,
      metadata,
    }),
    true,
  );
  assert.equal(
    isWhatsappSyncDiagnosticsOperatorCandidate({
      isPlatformTenant: false,
      role: "owner",
      organizationId: null,
      metadata,
    }),
    false,
  );
  assert.equal(
    isWhatsappSyncDiagnosticsOperatorCandidate({
      isPlatformTenant: true,
      role: "owner",
      organizationId: "org-lips",
      metadata,
    }),
    false,
  );
  assert.equal(
    isWhatsappSyncDiagnosticsOperatorCandidate({
      isPlatformTenant: true,
      role: "attendant",
      organizationId: null,
      metadata,
    }),
    false,
  );
  assert.equal(
    isWhatsappSyncDiagnosticsOperatorCandidate({
      isPlatformTenant: true,
      role: "owner",
      organizationId: null,
      metadata: { features: {} },
    }),
    false,
  );
});

test("production blocks execution without explicit internal flag and preview allows it", () => {
  assert.equal(
    canExecuteSyncDiagnostics({ vercelEnv: "preview", metadata: null }),
    true,
  );
  assert.equal(
    canExecuteSyncDiagnostics({ vercelEnv: "production", metadata: null }),
    false,
  );
  assert.equal(
    canExecuteSyncDiagnostics({
      vercelEnv: "production",
      metadata: { features: { whatsapp_sync_diagnostics_execute: true } },
    }),
    true,
  );
});

test("status is read-only even when execute flag is false and write actions stay classified as writes", () => {
  assert.equal(
    canExecuteSyncDiagnostics({
      vercelEnv: "production",
      metadata: { features: { command_center: true } },
    }),
    false,
  );
  assert.equal(isReadOnlySyncDiagnosticsAction("status"), true);
  assert.equal(isReadOnlySyncDiagnosticsAction("probe_chats"), true);
  assert.equal(
    isReadOnlySyncDiagnosticsAction("validate_chat_pagination"),
    true,
  );
  assert.equal(isWriteSyncDiagnosticsAction("bootstrap"), true);
  assert.equal(isWriteSyncDiagnosticsAction("validate_chat_pagination"), false);
  assert.equal(isWriteSyncDiagnosticsAction("incremental"), true);
  assert.equal(isWriteSyncDiagnosticsAction("reconciliation"), true);
  assert.equal(isWriteSyncDiagnosticsAction("process_next"), true);
});

test("read-only chat probe lists a small page without writing sync or queue state", async () => {
  const { db, tables, writes } = createDb({
    whatsapp_channel_sync_state: [],
    whatsapp_sync_runs: [],
  });
  const before = JSON.stringify(tables);
  const calls: string[] = [];
  const optionsCalls: Array<Record<string, unknown> | undefined> = [];
  const listOptionsCalls: Array<Record<string, unknown> | undefined> = [];

  const result = await probeLipsWhatsappChatsReadOnly(
    db,
    providerFactory(calls, optionsCalls, listOptionsCalls),
    { limit: 5, offset: 3 },
  );

  assert.equal(result.ok, true);
  assert.equal(result.code, "ok");
  assert.equal(result.requestedLimit, 5);
  assert.equal(result.requestedOffset, 3);
  assert.equal(result.returned, 2);
  assert.equal(result.paginationAvailable, true);
  assert.deepEqual(calls, ["lips-main"]);
  assert.equal(optionsCalls[0]?.baseUrl, "https://gateway.example.com");
  assert.deepEqual(listOptionsCalls[0], { limit: 5, offset: 3 });
  assert.equal(writes.length, 0);
  assert.equal(tables.whatsapp_channel_sync_state.length, 0);
  assert.equal(tables.whatsapp_sync_runs.length, 0);
  assert.equal(JSON.stringify(tables), before);
  assert.equal(JSON.stringify(result).includes("gateway.example.com"), false);
});

test("read-only chat probe defaults to 5 rejects more than 10 and detects ignored pagination", async () => {
  const defaultListOptions: Array<Record<string, unknown> | undefined> = [];
  const defaultResult = await probeLipsWhatsappChatsReadOnly(
    createDb().db,
    providerFactory([], [], defaultListOptions),
  );
  assert.equal(defaultResult.requestedLimit, 5);
  assert.equal(defaultResult.requestedOffset, 0);
  assert.deepEqual(defaultListOptions[0], { limit: 5, offset: 0 });

  const calls: string[] = [];
  const rejected = await probeLipsWhatsappChatsReadOnly(
    createDb().db,
    providerFactory(calls),
    { limit: 11 },
  );
  assert.equal(rejected.ok, false);
  assert.equal(rejected.code, "probe_limit_out_of_bounds");
  assert.equal(rejected.maxLimit, 10);
  assert.deepEqual(calls, []);

  const negativeOffsetCalls: string[] = [];
  const negativeOffset = await probeLipsWhatsappChatsReadOnly(
    createDb().db,
    providerFactory(negativeOffsetCalls),
    { limit: 5, offset: -1 },
  );
  assert.equal(negativeOffset.ok, false);
  assert.equal(negativeOffset.code, "probe_offset_out_of_bounds");
  assert.deepEqual(negativeOffsetCalls, []);

  const ignoredFactory = () => ({
    sessionId: "lips-main",
    async getConnectionStatus() {
      return "ready" as const;
    },
    async listChats() {
      return Array.from({ length: 6 }, (_, index) => ({
        id: `55110000000${index}@c.us`,
        name: `Cliente ${index}`,
        isGroup: false,
      }));
    },
    async listChatMessages() {
      return [];
    },
  });
  const ignored = await probeLipsWhatsappChatsReadOnly(
    createDb().db,
    ignoredFactory,
    { limit: 5 },
  );
  assert.equal(ignored.paginationIgnored, true);
  assert.equal(ignored.paginationAvailable, false);
});

test("read-only pagination validation fetches two fixed pages without execute flag or writes", async () => {
  const { db, tables, writes } = createDb({
    whatsapp_channel_sync_state: [],
    whatsapp_sync_runs: [],
  });
  const before = JSON.stringify(tables);
  const listOptionsCalls: Array<Record<string, unknown> | undefined> = [];
  const result = await validateLipsWhatsappChatPaginationReadOnly(
    db,
    paginatedProviderFactory(
      {
        0: Array.from({ length: 5 }, (_, index) => ({
          id: `55110000000${index}@c.us`,
          name: `Cliente ${index}`,
        })),
        5: Array.from({ length: 5 }, (_, index) => ({
          id: `55110000001${index}@c.us`,
          name: `Outro ${index}`,
        })),
      },
      listOptionsCalls,
    ),
  );

  assert.equal(
    canExecuteSyncDiagnostics({
      vercelEnv: "production",
      metadata: { features: { command_center: true } },
    }),
    false,
  );
  assert.deepEqual(listOptionsCalls, [
    { limit: 5, offset: 0 },
    { limit: 5, offset: 5 },
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.code, "pagination_validated");
  assert.equal(result.pages.page1.limit, 5);
  assert.equal(result.pages.page1.offset, 0);
  assert.equal(result.pages.page2.limit, 5);
  assert.equal(result.pages.page2.offset, 5);
  assert.equal(result.comparison.overlap_count, 0);
  assert.equal(result.comparison.distinct_pages, true);
  assert.equal(result.comparison.limit_respected, true);
  assert.equal(result.comparison.offset_proved, true);
  assert.equal(result.comparison.ordering_stable, true);
  assert.equal(writes.length, 0);
  assert.equal(tables.whatsapp_channel_sync_state.length, 0);
  assert.equal(tables.whatsapp_sync_runs.length, 0);
  assert.equal(JSON.stringify(tables), before);
  assert.equal(result.sentMessages, false);
  assert.equal(result.returnedSecret, false);
});

test("pagination validation returns non-reversible fingerprints and hides chat data", async () => {
  const sensitiveId = "5521999998888@c.us";
  const result = await validateLipsWhatsappChatPaginationReadOnly(
    createDb().db,
    paginatedProviderFactory({
      0: [{ id: sensitiveId, name: "Pessoa Sensivel" }],
      5: [{ id: "5521777776666@c.us", name: "Outra Pessoa" }],
    }),
  );

  const payload = JSON.stringify(result);
  assert.equal(result.comparison.fingerprints_page_1.length, 1);
  assert.notEqual(result.comparison.fingerprints_page_1[0], sensitiveId);
  assert.equal(payload.includes(sensitiveId), false);
  assert.equal(payload.includes("Pessoa Sensivel"), false);
  assert.equal(payload.includes("5521999998888"), false);
  assert.equal(payload.includes("gateway.example.com"), false);
});

test("pagination validation detects overlap and approves distinct complete pages", async () => {
  const overlapped = await validateLipsWhatsappChatPaginationReadOnly(
    createDb().db,
    paginatedProviderFactory({
      0: Array.from({ length: 5 }, (_, index) => ({
        id: `same-${index}@c.us`,
      })),
      5: Array.from({ length: 5 }, (_, index) => ({
        id: `same-${index}@c.us`,
      })),
    }),
  );
  assert.equal(overlapped.ok, false);
  assert.equal(overlapped.code, "pagination_overlap_detected");
  assert.equal(overlapped.comparison.overlap_count, 5);

  const distinct = await validateLipsWhatsappChatPaginationReadOnly(
    createDb().db,
    paginatedProviderFactory({
      0: Array.from({ length: 5 }, (_, index) => ({
        id: `page-a-${index}@c.us`,
      })),
      5: Array.from({ length: 5 }, (_, index) => ({
        id: `page-b-${index}@c.us`,
      })),
    }),
  );
  assert.equal(distinct.ok, true);
  assert.equal(distinct.code, "pagination_validated");
  assert.equal(distinct.comparison.unique_page_1, 5);
  assert.equal(distinct.comparison.unique_page_2, 5);
});

test("pagination validation treats fewer than ten chats as inconclusive without automatic failure", async () => {
  const result = await validateLipsWhatsappChatPaginationReadOnly(
    createDb().db,
    paginatedProviderFactory({
      0: Array.from({ length: 3 }, (_, index) => ({
        id: `few-a-${index}@c.us`,
      })),
      5: [],
    }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.code, "pagination_not_enough_volume");
  assert.equal(result.comparison.enough_volume, false);
  assert.equal(result.comparison.offset_proved, false);
});

test("pagination validation sanitizes unauthorized timeout token url and personal data", async () => {
  const unauthorizedProvider = () => ({
    sessionId: "lips-main",
    async getConnectionStatus() {
      return "ready" as const;
    },
    async listChats() {
      throw Object.assign(
        new Error(
          "401 https://gateway.example.com Bearer secret-token-abcdefghijklmnopqrstuvwxyz 5521999998888",
        ),
        { code: "openwa_unauthorized" },
      );
    },
    async listChatMessages() {
      return [];
    },
  });
  const unauthorized = await validateLipsWhatsappChatPaginationReadOnly(
    createDb().db,
    unauthorizedProvider,
  );
  assert.equal(unauthorized.ok, false);
  assert.equal(unauthorized.pages.page1.error, "gateway_unauthorized");
  let payload = JSON.stringify(unauthorized);
  assert.equal(payload.includes("secret-token"), false);
  assert.equal(payload.includes("gateway.example.com"), false);
  assert.equal(payload.includes("5521999998888"), false);

  const timeoutProvider = () => ({
    sessionId: "lips-main",
    async getConnectionStatus() {
      return "ready" as const;
    },
    async listChats() {
      throw new Error(
        "OpenWA timeout after 20000ms for https://gateway.example.com token secret-token-abcdefghijklmnopqrstuvwxyz",
      );
    },
    async listChatMessages() {
      return [];
    },
  });
  const timeout = await validateLipsWhatsappChatPaginationReadOnly(
    createDb().db,
    timeoutProvider,
  );
  assert.equal(timeout.ok, false);
  assert.equal(timeout.pages.page1.error, "provider_list_chats_timeout");
  payload = JSON.stringify(timeout);
  assert.equal(payload.includes("secret-token"), false);
  assert.equal(payload.includes("gateway.example.com"), false);
});

test("read-only status probes gateway from database URL with env token and returns sanitized DTO", async () => {
  const { db, tables, writes } = createDb({
    internal_messaging_gateways: [
      {
        id: "gateway-lips",
        name: "Gateway 01",
        slug: "gateway-01",
        provider: "openwa",
        environment: "production",
        status: "active",
        base_url: "https://gateway.example.com",
        token: "stored-token",
      },
    ],
    whatsapp_channel_sync_state: [],
    whatsapp_sync_runs: [],
  });
  const beforeConversation = JSON.stringify(tables.whatsapp_conversations);
  const result = await withGatewayEnv(
    "server-token",
    gatewayFetch({
      "/health": { status: 200, body: { ok: true } },
      "/readiness": { status: 200, body: { ready: true } },
      "/api/version": { status: 200, body: { version: "1.2.3" } },
      "/api/sessions": {
        status: 200,
        body: [
          {
            id: "session-1",
            name: "lips-main",
            status: "ready",
            phone: "5521999998888",
            secret: "should-not-leak",
          },
        ],
      },
    }),
    () => getLipsWhatsappReadOnlyStatus(db),
  );

  assert.equal(result.gatewayStatus.code, "ok");
  assert.equal(result.gatewayStatus.health.httpStatus, 200);
  assert.equal(result.gatewayStatus.readiness.httpStatus, 200);
  assert.equal(result.gatewayStatus.version, "1.2.3");
  assert.equal(result.gatewayStatus.sessions.total, 1);
  assert.equal(result.gatewayStatus.sessions.lipsMainFound, true);
  assert.equal(result.gatewayStatus.sessions.lipsMainStatus, "ready");
  assert.equal(result.gatewayStatus.sessions.phoneMasked, "5521***8888");
  assert.equal(result.inventory.syncState, 0);
  assert.equal(result.inventory.syncRuns, 0);
  assert.equal(result.inventory.queueStatusNull, 0);
  assert.equal(result.limits.chatLimit, 100);
  assert.equal(result.limits.messageLimit, 100);
  assert.equal(result.limits.maxAgeDays, 30);
  assert.equal(result.limits.groupsIgnored, true);
  assert.equal(writes.length, 0);
  assert.equal(
    JSON.stringify(tables.whatsapp_conversations),
    beforeConversation,
  );
  const payload = JSON.stringify(result);
  assert.equal(payload.includes("gateway.example.com"), false);
  assert.equal(payload.includes("server-token"), false);
  assert.equal(payload.includes("stored-token"), false);
  assert.equal(payload.includes("5521999998888"), false);
  assert.equal(payload.includes("should-not-leak"), false);
});

test("read-only status handles missing token gateway 401 and missing session safely", async () => {
  const missingToken = await withGatewayEnv(undefined, gatewayFetch({}), () =>
    getLipsWhatsappReadOnlyStatus(createDb().db),
  );
  assert.equal(missingToken.gatewayStatus.code, "gateway_token_missing");
  assert.equal(missingToken.gatewayStatus.error, "gateway_token_missing");

  const unauthorized = await withGatewayEnv(
    "server-token",
    gatewayFetch({
      "/health": { status: 200, body: { ok: true } },
      "/readiness": { status: 200, body: { ready: true } },
      "/api/version": { status: 404, body: { error: "missing" } },
      "/api/sessions": {
        status: 401,
        body: {
          error: "Unauthorized",
          message: "bad Bearer very-secret-token-value-that-must-not-leak",
        },
      },
    }),
    () => getLipsWhatsappReadOnlyStatus(createDb().db),
  );
  assert.equal(unauthorized.gatewayStatus.code, "gateway_unauthorized");
  assert.equal(
    unauthorized.gatewayStatus.error?.includes("very-secret-token"),
    false,
  );

  const absent = await withGatewayEnv(
    "server-token",
    gatewayFetch({
      "/health": { status: 200, body: { ok: true } },
      "/readiness": { status: 200, body: { ready: true } },
      "/api/version": { status: 404, body: { error: "missing" } },
      "/api/sessions": {
        status: 200,
        body: [{ id: "other", name: "other-main", status: "ready" }],
      },
    }),
    () => getLipsWhatsappReadOnlyStatus(createDb().db),
  );
  assert.equal(absent.gatewayStatus.code, "session_not_found");
  assert.equal(absent.gatewayStatus.sessions.lipsMainFound, false);
});

test("diagnostic uses only lips-main, processes one run and preserves queue", async () => {
  const { db, tables } = createDb();
  const calls: string[] = [];
  const optionsCalls: Array<Record<string, unknown> | undefined> = [];
  const result = await runLipsWhatsappSyncDiagnostics(
    db,
    providerFactory(calls, optionsCalls),
    { action: "diagnostic", actorUserId: "platform-user" },
  );

  assert.deepEqual(Array.from(new Set(calls)), ["lips-main"]);
  assert.equal(optionsCalls[0]?.baseUrl, "https://gateway.example.com");
  assert.equal(result.processedRuns, 1);
  assert.equal(result.queuePreserved, true);
  assert.equal(result.sentMessages, false);
  assert.equal(result.returnedSecret, false);
  assert.equal(tables.whatsapp_sync_runs[0].mode, "manual_diagnostic");
  assert.equal(tables.whatsapp_sync_runs[0].chat_limit, 1);
});

test("diagnostics resolves active openwa gateway base_url without exposing URL or token", async () => {
  const { db } = createDb({
    internal_messaging_gateways: [
      {
        id: "gateway-lips",
        provider: "openwa",
        environment: "production",
        status: "active",
        base_url: "https://gateway.example.com",
        token: "super-secret-token",
      },
    ],
  });
  const calls: string[] = [];
  const optionsCalls: Array<Record<string, unknown> | undefined> = [];
  const snapshot = await getLipsWhatsappSyncDiagnostics(
    db,
    providerFactory(calls, optionsCalls),
    { includeProviderStatus: true },
  );

  assert.deepEqual(Array.from(new Set(calls)), ["lips-main"]);
  assert.equal(optionsCalls[0]?.baseUrl, "https://gateway.example.com");
  const payload = JSON.stringify(snapshot);
  assert.equal(payload.includes("gateway.example.com"), false);
  assert.equal(payload.includes("super-secret-token"), false);
});

test("legacy whatsapp_web channel without gateway uses provider fallback path", async () => {
  const { db } = createDb({
    channels: [
      {
        id: "channel-lips",
        tenant_id: "tenant-lips",
        organization_id: "org-lips",
        session_id: "lips-main",
        provider: "whatsapp_web",
        status: "active",
        active: true,
        is_active: true,
        gateway_id: null,
      },
    ],
  });
  const calls: string[] = [];
  const optionsCalls: Array<Record<string, unknown> | undefined> = [];
  const result = await runLipsWhatsappSyncDiagnostics(
    db,
    providerFactory(calls, optionsCalls),
    { action: "diagnostic", actorUserId: "platform-user" },
  );

  assert.equal(result.processedRuns, 1);
  assert.deepEqual(Array.from(new Set(calls)), ["lips-main"]);
  assert.equal(optionsCalls[0]?.baseUrl, undefined);
});

test("default provider keeps env fallback when no gateway option is supplied", () => {
  const defaultProvider = readFileSync(
    "lib/whatsapp-sync/providers/openwa-sync-provider-default.ts",
    "utf8",
  );
  const gatewayClient = readFileSync(
    "lib/providers/whatsapp-web-gateway-client.ts",
    "utf8",
  );

  assert.match(defaultProvider, /if \(options\?\.baseUrl\)/);
  assert.match(
    defaultProvider,
    /createOpenWaSyncProvider\(sessionId, resolveSessionClient\)/,
  );
  assert.match(
    gatewayClient,
    /options\?\.baseUrl \|\| process\.env\.WHATSAPP_WEB_GATEWAY_URL/,
  );
  assert.match(gatewayClient, /AbortSignal\.timeout/);
});

test("gateway validation fails closed for missing inactive or incomplete gateway", async () => {
  await assert.rejects(
    getLipsWhatsappSyncDiagnostics(
      createDb({ internal_messaging_gateways: [] }).db,
      providerFactory(),
      { includeProviderStatus: true },
    ),
    /Gateway vinculado ao canal Lips nao encontrado/,
  );

  await assert.rejects(
    getLipsWhatsappSyncDiagnostics(
      createDb({
        internal_messaging_gateways: [
          {
            id: "gateway-lips",
            provider: "openwa",
            environment: "production",
            status: "inactive",
            base_url: "https://gateway.example.com",
          },
        ],
      }).db,
      providerFactory(),
      { includeProviderStatus: true },
    ),
    /nao esta ativo/,
  );

  await assert.rejects(
    getLipsWhatsappSyncDiagnostics(
      createDb({
        internal_messaging_gateways: [
          {
            id: "gateway-lips",
            provider: "openwa",
            environment: "production",
            status: "active",
            base_url: null,
          },
        ],
      }).db,
      providerFactory(),
      { includeProviderStatus: true },
    ),
    /sem base_url/,
  );
});

test("bootstrap is limited to one controlled batch", async () => {
  const { db, tables } = createDb();
  const result = await runLipsWhatsappSyncDiagnostics(db, providerFactory(), {
    action: "bootstrap",
    actorUserId: "platform-user",
  });

  assert.equal(result.processedRuns, 1);
  assert.equal(tables.whatsapp_sync_runs[0].mode, "bootstrap");
  assert.equal(tables.whatsapp_sync_runs[0].chat_limit, 100);
  assert.equal(tables.whatsapp_sync_runs[0].message_limit, 100);
  assert.equal(result.runs[0].chatsSkipped, 1);
});

test("incremental honors checkpoint and avoids old messages", async () => {
  const { db } = createDb({
    whatsapp_channel_sync_state: [
      {
        id: "state-lips",
        tenant_id: "tenant-lips",
        organization_id: "org-lips",
        channel_id: "channel-lips",
        sync_status: "idle",
        last_message_checkpoint: "2026-07-15T12:00:00.000Z",
        stats: {},
      },
    ],
  });
  const provider = () => ({
    sessionId: "lips-main",
    async getConnectionStatus() {
      return "ready" as const;
    },
    async listChats() {
      return [
        {
          id: "551100000000@c.us",
          name: "Cliente",
          isGroup: false,
          lastMessageAt: "2026-07-15T12:30:00.000Z",
        },
      ];
    },
    async listChatMessages(chatId: string) {
      return [
        {
          id: "old",
          chatId,
          direction: "inbound" as const,
          from: chatId,
          body: "old",
          timestamp: Date.parse("2026-07-15T11:59:00.000Z") / 1000,
        },
        {
          id: "new",
          chatId,
          direction: "inbound" as const,
          from: chatId,
          body: "new",
          timestamp: Date.parse("2026-07-15T12:01:00.000Z") / 1000,
        },
      ];
    },
  });

  const result = await runLipsWhatsappSyncDiagnostics(db, provider, {
    action: "incremental",
    actorUserId: "platform-user",
  });
  assert.equal(result.runs[0].messagesScanned, 1);
  assert.equal(result.runs[0].messagesSaved, 1);
});

test("sanitized run never returns stack traces or provider URLs", () => {
  const run = sanitizeSyncRun({
    id: "1234567890abcdef",
    status: "failed",
    mode: "bootstrap",
    error_message: "boom https://secret.example.com/token stack line",
  });
  assert.equal(run?.id, "123456...cdef");
  assert.equal(run?.error?.includes("https://secret.example.com"), false);
});

test("diagnostics route lives under operations and admin route only redirects", () => {
  const operationsPage = readFileSync(
    "app/operations/diagnostics/whatsapp-sync/page.tsx",
    "utf8",
  );
  const legacyAdminPage = readFileSync(
    "app/admin/diagnostics/whatsapp-sync/page.tsx",
    "utf8",
  );

  assert.equal(
    existsSync("app/operations/diagnostics/whatsapp-sync/actions.ts"),
    true,
  );
  assert.equal(
    existsSync(
      "app/operations/diagnostics/whatsapp-sync/whatsapp-sync-diagnostics-client.tsx",
    ),
    true,
  );
  assert.match(
    operationsPage,
    /<AppShell active="operations\/diagnostics\/whatsapp-sync">/,
  );
  assert.match(
    legacyAdminPage,
    /redirect\("\/operations\/diagnostics\/whatsapp-sync"\)/,
  );
  assert.doesNotMatch(legacyAdminPage, /WhatsappSyncDiagnosticsClient/);
});

test("operations menu exposes sync diagnostics only as command center item", () => {
  const sidebar = readFileSync("components/sidebar-nav.tsx", "utf8");
  assert.match(sidebar, /label: "Diagnósticos"/);
  assert.match(sidebar, /commandCenterOnly: true/);
  assert.match(sidebar, /href: "\/operations\/diagnostics\/whatsapp-sync"/);
  assert.match(sidebar, /label: "Sincronização WhatsApp"/);
});

test("diagnostics page states fixed Lips scope and does not use internal API key", () => {
  const client = readFileSync(
    "app/operations/diagnostics/whatsapp-sync/whatsapp-sync-diagnostics-client.tsx",
    "utf8",
  );
  const actions = readFileSync(
    "app/operations/diagnostics/whatsapp-sync/actions.ts",
    "utf8",
  );
  const worker = readFileSync(
    "app/api/internal/whatsapp-sync/process/route.ts",
    "utf8",
  );

  assert.match(client, /Auto Peças e Auto Center Lips/);
  assert.match(client, /lips-main/);
  assert.match(client, /OpenWA/);
  assert.match(client, /Verificar status/);
  assert.match(client, /Validar paginação/);
  assert.match(client, /Consultas de status são somente leitura/);
  assert.match(client, /Execução de sincronização está[\s\S]*desabilitada/);
  assert.match(client, /Consultando\.\.\./);
  assert.match(client, /Esta ferramenta não envia mensagens para clientes/);
  assert.doesNotMatch(actions, /INTERNAL_API_KEY/);
  assert.match(actions, /validate_chat_pagination/);
  assert.match(actions, /validateLipsWhatsappChatPaginationReadOnly/);
  assert.match(actions, /isReadOnlySyncDiagnosticsAction\(action\)/);
  const actionBody = actions.slice(
    actions.indexOf("const action = safeAction"),
  );
  assert.ok(
    actionBody.indexOf("isReadOnlySyncDiagnosticsAction(action)") <
      actionBody.indexOf("canExecuteSyncDiagnostics"),
  );
  assert.match(worker, /processQueuedWhatsappSyncRuns/);
});

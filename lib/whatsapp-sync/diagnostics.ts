import { createHash } from "crypto";
import type { ProviderChatSummary } from "../../types/messaging-provider.ts";
import type { createSupabaseWriteClient } from "../supabase/server-write.ts";
import { PROVIDER_TIMEOUT_MS } from "../providers/whatsapp-web-gateway-client.ts";
import {
  enqueueWhatsappSync,
  processQueuedWhatsappSyncRunsForChannel,
  type WhatsappSyncMode,
} from "./service.ts";
import {
  isOpenWaConnected,
  type OpenWaSyncProvider,
} from "./providers/openwa-sync-provider.ts";

type Db = ReturnType<typeof createSupabaseWriteClient>;
type ProviderFactory = (
  sessionId: string,
  options?: { baseUrl?: string | null },
) => OpenWaSyncProvider;

type GatewayOptions = {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
  provider?: string | null;
  environment?: string | null;
  status?: string | null;
  baseUrl?: string | null;
};

type GatewaySession = {
  id?: string;
  name?: string;
  status?: string;
  phone?: string | null;
  wid?: string | null;
  number?: string | null;
  lastError?: string | null;
  error?: string | null;
  me?: { user?: string | null } | null;
};

export type SyncDiagnosticsAction =
  | "status"
  | "probe_chats"
  | "validate_chat_pagination"
  | "capture_lips_integrity_snapshot"
  | "diagnostic"
  | "bootstrap"
  | "incremental"
  | "reconciliation"
  | "process_next";

const LIPS_TENANT_ID = "e6abeaae-29fc-4186-b56a-361a69cb846d";
const LIPS_ORGANIZATION_ID = "8f074193-bf58-4537-9842-720619a9f259";
const LIPS_CHANNEL_ID = "1f65f8d2-2609-42d9-ae57-709aecdb43da";
const LIPS_GATEWAY_ID = "8dc7091e-6d7f-40b9-9008-17f31d748423";
const LIPS_SESSION_ID = "lips-main";
const LIPS_ORGANIZATION_SLUG = "auto-pecas-auto-center-lips";
const GATEWAY_PROBE_TIMEOUT_MS = 15_000;
const BOOTSTRAP_CHAT_LIMIT = 100;
const BOOTSTRAP_MESSAGE_LIMIT = 100;
const PROBE_CHAT_DEFAULT_LIMIT = 5;
const PROBE_CHAT_MAX_LIMIT = 10;
const PROBE_CHAT_DEFAULT_OFFSET = 0;
const LIPS_GO_LIVE_KNOWN_BASELINE = {
  syncState: 1,
  syncRuns: 1,
  pendingRuns: 0,
  failedRuns: 0,
  conversations: 13,
  messages: 94,
  queueStatusNull: 13,
  locks: 0,
} as const;
const QUEUE_FIELDS = [
  "queue_status",
  "priority",
  "requires_human",
  "handoff_reason",
  "department_id",
  "assigned_user_id",
  "last_assigned_user_id",
  "queue_entered_at",
  "assigned_at",
  "sla_due_at",
  "sla_status",
  "resolved_at",
  "closed_at",
] as const;

type TenantMetadata = Record<string, unknown> | null;

type ProbeChatsOptions = {
  limit?: number;
  offset?: number;
};

function metadataRecord(value: unknown): TenantMetadata {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasFeature(metadata: TenantMetadata, feature: string) {
  const features = metadata?.features;
  return Boolean(
    features &&
    typeof features === "object" &&
    !Array.isArray(features) &&
    (features as Record<string, unknown>)[feature] === true,
  );
}

export function canExecuteSyncDiagnostics(input: {
  vercelEnv?: string | null;
  metadata: TenantMetadata;
}) {
  if (input.vercelEnv !== "production") return true;
  return hasFeature(input.metadata, "whatsapp_sync_diagnostics_execute");
}

export function isReadOnlySyncDiagnosticsAction(action: SyncDiagnosticsAction) {
  return (
    action === "status" ||
    action === "probe_chats" ||
    action === "validate_chat_pagination" ||
    action === "capture_lips_integrity_snapshot"
  );
}

export function isWriteSyncDiagnosticsAction(action: SyncDiagnosticsAction) {
  return !isReadOnlySyncDiagnosticsAction(action);
}

function isAllowedRole(value?: string | null) {
  return value === "owner" || value === "admin";
}

export function isWhatsappSyncDiagnosticsOperatorCandidate(input: {
  isPlatformTenant: boolean;
  role?: string | null;
  organizationId?: string | null;
  metadata: TenantMetadata;
}) {
  return (
    input.isPlatformTenant === true &&
    input.organizationId === null &&
    isAllowedRole(input.role) &&
    hasFeature(input.metadata, "command_center")
  );
}

function maskId(value?: string | null) {
  const text = String(value || "");
  if (!text) return null;
  if (text.length <= 10) return `${text.slice(0, 3)}...`;
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

function safeError(value: unknown) {
  const text = String(value || "")
    .replace(/https?:\/\/\S+/g, "[url-redacted]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [token-redacted]")
    .replace(/\b\d{8,}\b/g, "[number-redacted]")
    .replace(/[A-Za-z0-9_-]{24,}/g, "[token-redacted]");
  return text.slice(0, 220);
}

function safeErrorCode(error: unknown) {
  const code =
    typeof (error as { code?: unknown })?.code === "string"
      ? String((error as { code: string }).code)
      : "";
  const text =
    `${code} ${error instanceof Error ? error.message : String(error || "")}`.toLowerCase();
  if (
    text.includes("unauthorized") ||
    text.includes("forbidden") ||
    text.includes("401") ||
    text.includes("403")
  )
    return "gateway_unauthorized";
  if (text.includes("timeout") || text.includes("aborted"))
    return "provider_list_chats_timeout";
  if (text.includes("not_found") || text.includes("404"))
    return "gateway_session_not_found";
  return "provider_list_chats_failed";
}

function fingerprintChat(sessionId: string, chat: ProviderChatSummary) {
  return createHash("sha256").update(`${sessionId}:${chat.id}`).digest("hex");
}

function fingerprintValue(scope: string, value?: string | null) {
  return createHash("sha256")
    .update(`${scope}:${String(value || "")}`)
    .digest("hex");
}

function normalizeProbeChatsOptions(input?: ProbeChatsOptions) {
  const limitProvided = input?.limit !== undefined;
  const offsetProvided = input?.offset !== undefined;
  const rawLimit = limitProvided
    ? Number(input?.limit)
    : PROBE_CHAT_DEFAULT_LIMIT;
  const rawOffset = offsetProvided
    ? Number(input?.offset)
    : PROBE_CHAT_DEFAULT_OFFSET;
  const limit = Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : NaN;
  const offset = Number.isFinite(rawOffset) ? Math.trunc(rawOffset) : NaN;

  if (!Number.isFinite(limit) || limit < 1 || limit > PROBE_CHAT_MAX_LIMIT) {
    return {
      ok: false as const,
      limit,
      offset: Number.isFinite(offset) ? offset : PROBE_CHAT_DEFAULT_OFFSET,
      code: "probe_limit_out_of_bounds",
      error: `probe_limit_must_be_between_1_and_${PROBE_CHAT_MAX_LIMIT}`,
    };
  }
  if (!Number.isFinite(offset) || offset < 0) {
    return {
      ok: false as const,
      limit,
      offset,
      code: "probe_offset_out_of_bounds",
      error: "probe_offset_must_be_zero_or_positive",
    };
  }
  return { ok: true as const, limit, offset };
}

function maskPhone(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length <= 4) return `***${digits}`;
  return `${digits.slice(0, 4)}***${digits.slice(-4)}`;
}

function normalizeGatewayBaseUrl(value?: string | null) {
  return String(value || "").replace(/\/+$/, "");
}

function gatewayApiBaseUrl(value?: string | null) {
  const baseUrl = normalizeGatewayBaseUrl(value);
  if (!baseUrl) return "";
  return baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { data?: unknown }).data)
  )
    return (value as { data: T[] }).data;
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { sessions?: unknown }).sessions)
  )
    return (value as { sessions: T[] }).sessions;
  return [];
}

export function sanitizeSyncRun(
  run: Record<string, unknown> | null | undefined,
) {
  if (!run) return null;
  return {
    id: maskId(String(run.id || "")),
    status: String(run.status || "unknown"),
    mode: String(run.mode || "unknown"),
    chatsScanned: Number(run.chats_scanned || 0),
    chatsSynced: Number(run.chats_synced || 0),
    chatsSkipped: Number(run.chats_skipped || 0),
    messagesScanned: Number(run.messages_scanned || 0),
    messagesSaved: Number(run.messages_saved || 0),
    messagesUpdated: Number(run.messages_updated || 0),
    errorsCount: Number(run.errors_count || 0),
    error: run.error_message ? safeError(run.error_message) : null,
    startedAt: typeof run.started_at === "string" ? run.started_at : null,
    completedAt: typeof run.completed_at === "string" ? run.completed_at : null,
  };
}

export function sanitizeProcessedRun(run: Record<string, unknown>) {
  return {
    id: maskId(String(run.runId || "")),
    status: String(run.status || "unknown"),
    continuationRunId: maskId(String(run.continuationRunId || "")),
    chatsScanned: Number(run.chatsScanned || 0),
    chatsSynced: Number(run.chatsSynced || 0),
    chatsSkipped: Number(run.chatsSkipped || 0),
    messagesScanned: Number(run.messagesScanned || 0),
    messagesSaved: Number(run.messagesSaved || 0),
    messagesUpdated: Number(run.messagesUpdated || 0),
    errorsCount: Array.isArray(run.errors) ? run.errors.length : 0,
    providerStatus:
      typeof run.providerStatus === "string" ? run.providerStatus : null,
  };
}

export async function requireWhatsappSyncDiagnosticsOperator(db: Db) {
  const { getCurrentSession } = await import("../auth/session.ts");
  const session = await getCurrentSession();
  if (!session?.userId) throw new Error("UNAUTHORIZED");

  const { data: appUser, error: appUserError } = await db
    .from("app_users")
    .select("id, name, email, role, status")
    .eq("id", session.userId)
    .eq("status", "active")
    .maybeSingle();
  if (appUserError) throw appUserError;
  if (!appUser) throw new Error("UNAUTHORIZED");

  const { data: tenantUsers, error: tenantUsersError } = await db
    .from("tenant_users")
    .select("id, tenant_id, organization_id, role, status")
    .eq("app_user_id", appUser.id)
    .eq("status", "active");
  if (tenantUsersError) throw tenantUsersError;

  const globalMemberships = (tenantUsers || []).filter(
    (item) =>
      item.organization_id === null && isAllowedRole(item.role || appUser.role),
  );
  if (!globalMemberships.length) throw new Error("FORBIDDEN");

  const tenantIds = Array.from(
    new Set(globalMemberships.map((item) => item.tenant_id).filter(Boolean)),
  );
  const { data: tenants, error: tenantsError } = await db
    .from("tenants")
    .select("id, is_platform, metadata")
    .in("id", tenantIds);
  if (tenantsError) throw tenantsError;

  const tenantById = new Map(
    (tenants || []).map((tenant) => [tenant.id, tenant]),
  );
  const membership = globalMemberships.find((item) => {
    const tenant = tenantById.get(item.tenant_id);
    return isWhatsappSyncDiagnosticsOperatorCandidate({
      isPlatformTenant: tenant?.is_platform === true,
      role: item.role || appUser.role,
      organizationId: item.organization_id,
      metadata: metadataRecord(tenant?.metadata),
    });
  });
  if (!membership) throw new Error("FORBIDDEN");

  const tenant = tenantById.get(membership.tenant_id)!;
  return {
    tenantId: membership.tenant_id as string,
    organizationId: null,
    appUserId: appUser.id as string,
    tenantUserId: membership.id as string,
    role: (membership.role || appUser.role) as "owner" | "admin",
    email: appUser.email as string,
    name: (appUser.name || appUser.email) as string,
    metadata: metadataRecord(tenant.metadata),
  };
}

export async function resolveLipsSyncChannel(db: Db) {
  const { data: channels, error } = await db
    .from("channels")
    .select(
      "id, tenant_id, organization_id, session_id, provider, provider_type, channel_type, status, active, is_active, gateway_id",
    )
    .eq("session_id", LIPS_SESSION_ID);
  if (error) throw error;

  for (const channel of channels || []) {
    const { data: organization, error: organizationError } = await db
      .from("organizations")
      .select("id, slug, name, status")
      .eq("id", channel.organization_id)
      .eq("slug", LIPS_ORGANIZATION_SLUG)
      .eq("status", "active")
      .maybeSingle();
    if (organizationError) throw organizationError;
    if (!organization) continue;
    if (
      channel.provider &&
      !["whatsapp_web", "openwa"].includes(channel.provider)
    )
      throw new Error("Lips channel provider is not OpenWA/WhatsApp Web.");
    return { channel, organization };
  }

  throw new Error("Canal lips-main da Lips nao encontrado.");
}

async function loadGatewayOptions(
  db: Db,
  gatewayId?: string | null,
): Promise<GatewayOptions> {
  if (!gatewayId) return {};
  const { data: gateway, error } = await db
    .from("internal_messaging_gateways")
    .select("id, name, slug, provider, environment, status, base_url")
    .eq("id", gatewayId)
    .maybeSingle();
  if (error) throw error;
  if (!gateway)
    throw new Error("Gateway vinculado ao canal Lips nao encontrado.");
  if (
    gateway.provider !== "openwa" ||
    gateway.environment !== "production" ||
    gateway.status !== "active"
  ) {
    throw new Error(
      "Gateway vinculado ao canal Lips nao esta ativo em Production/OpenWA.",
    );
  }
  if (!gateway.base_url)
    throw new Error("Gateway vinculado ao canal Lips sem base_url.");
  return {
    id: gateway.id as string | null,
    name: gateway.name as string | null,
    slug: gateway.slug as string | null,
    provider: gateway.provider as string | null,
    environment: gateway.environment as string | null,
    status: gateway.status as string | null,
    baseUrl: gateway.base_url as string | null,
  };
}

async function loadSyncState(db: Db, channelId: string) {
  const { data, error } = await db
    .from("whatsapp_channel_sync_state")
    .select(
      "sync_status, last_mode, last_run_id, last_queued_at, last_started_at, last_completed_at, last_success_at, last_error_at, last_error, bootstrap_completed_at, last_chat_checkpoint, last_message_checkpoint, last_provider_status, last_provider_seen_at, next_reconciliation_at, locked_at, lock_expires_at, locked_by, cursor, stats, updated_at",
    )
    .eq("channel_id", channelId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function loadLastRun(db: Db, channelId: string) {
  const { data, error } = await db
    .from("whatsapp_sync_runs")
    .select(
      "id, mode, status, started_at, completed_at, chats_scanned, chats_synced, chats_skipped, messages_scanned, messages_saved, messages_updated, errors_count, error_message",
    )
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function countRows(
  db: Db,
  table: string,
  applyFilters: (query: any) => any,
) {
  const query = applyFilters(db.from(table).select("id"));
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data.length : 0;
}

async function loadReadOnlyInventory(db: Db, channelId: string) {
  const [
    syncState,
    syncRuns,
    pendingRuns,
    failedRuns,
    locks,
    conversations,
    queueNull,
  ] = await Promise.all([
    countRows(db, "whatsapp_channel_sync_state", (query) =>
      query.eq("channel_id", channelId),
    ),
    countRows(db, "whatsapp_sync_runs", (query) =>
      query.eq("channel_id", channelId),
    ),
    countRows(db, "whatsapp_sync_runs", (query) =>
      query.eq("channel_id", channelId).in("status", ["queued", "running"]),
    ),
    countRows(db, "whatsapp_sync_runs", (query) =>
      query.eq("channel_id", channelId).eq("status", "failed"),
    ),
    countRows(db, "whatsapp_channel_sync_state", (query) =>
      query.eq("channel_id", channelId).not("locked_at", "is", null),
    ),
    countRows(db, "whatsapp_conversations", (query) =>
      query.eq("channel_id", channelId),
    ),
    countRows(db, "whatsapp_conversations", (query) =>
      query.eq("channel_id", channelId).is("queue_status", null),
    ),
  ]);

  return {
    syncState,
    syncRuns,
    pendingRuns,
    failedRuns,
    locks,
    conversations,
    queueStatusNull: queueNull,
  };
}

async function loadReadOnlyIntegrity(
  db: Db,
  channel: { id: string; organization_id: string },
) {
  const [
    syncState,
    syncRuns,
    conversations,
    messages,
    queueNull,
    stateLocks,
    runLocks,
  ] = await Promise.all([
    countRows(db, "whatsapp_channel_sync_state", (query) =>
      query.eq("channel_id", channel.id),
    ),
    countRows(db, "whatsapp_sync_runs", (query) =>
      query.eq("channel_id", channel.id),
    ),
    countRows(db, "whatsapp_conversations", (query) =>
      query.eq("channel_id", channel.id),
    ),
    countRows(db, "whatsapp_messages", (query) =>
      query.eq("channel_id", channel.id),
    ),
    countRows(db, "whatsapp_conversations", (query) =>
      query.eq("channel_id", channel.id).is("queue_status", null),
    ),
    countRows(db, "whatsapp_channel_sync_state", (query) =>
      query.eq("channel_id", channel.id).not("locked_at", "is", null),
    ),
    countRows(db, "whatsapp_sync_runs", (query) =>
      query
        .eq("channel_id", channel.id)
        .in("status", ["queued", "running"])
        .not("locked_at", "is", null),
    ),
  ]);

  return {
    syncState,
    syncRuns,
    conversations,
    messages,
    queueStatusNull: queueNull,
    locks: stateLocks + runLocks,
  };
}

async function resolveLipsGoLiveIntegrityScope(db: Db) {
  const { data: channel, error: channelError } = await db
    .from("channels")
    .select(
      "id, tenant_id, organization_id, session_id, provider, provider_type, channel_type, status, active, is_active, gateway_id",
    )
    .eq("id", LIPS_CHANNEL_ID)
    .maybeSingle();
  if (channelError) throw channelError;
  if (!channel) throw new Error("Canal fixo da Lips nao encontrado.");

  if (
    channel.tenant_id !== LIPS_TENANT_ID ||
    channel.organization_id !== LIPS_ORGANIZATION_ID ||
    channel.session_id !== LIPS_SESSION_ID ||
    channel.gateway_id !== LIPS_GATEWAY_ID
  ) {
    throw new Error("Escopo fixo da Lips diverge do banco.");
  }
  if (channel.provider && !["whatsapp_web", "openwa"].includes(channel.provider))
    throw new Error("Canal fixo da Lips nao e OpenWA/WhatsApp Web.");

  const { data: organization, error: organizationError } = await db
    .from("organizations")
    .select("id, slug, name, status")
    .eq("id", LIPS_ORGANIZATION_ID)
    .eq("slug", LIPS_ORGANIZATION_SLUG)
    .eq("status", "active")
    .maybeSingle();
  if (organizationError) throw organizationError;
  if (!organization) throw new Error("Organizacao fixa da Lips nao encontrada.");

  const gatewayOptions = await loadGatewayOptions(db, LIPS_GATEWAY_ID);
  return { channel, organization, gatewayOptions };
}

async function loadLipsGoLiveIntegrityCounts(db: Db, channelId: string) {
  const [integrity, pendingRuns, failedRuns] = await Promise.all([
    loadReadOnlyIntegrity(db, {
      id: channelId,
      organization_id: LIPS_ORGANIZATION_ID,
    }),
    countRows(db, "whatsapp_sync_runs", (query) =>
      query.eq("channel_id", channelId).in("status", ["queued", "running"]),
    ),
    countRows(db, "whatsapp_sync_runs", (query) =>
      query.eq("channel_id", channelId).eq("status", "failed"),
    ),
  ]);

  return {
    ...integrity,
    pendingRuns,
    failedRuns,
  };
}

async function loadLipsConversationFingerprints(db: Db, channelId: string) {
  const { data, error } = await db
    .from("whatsapp_conversations")
    .select(
      "id, external_chat_id, is_group, queue_status, updated_at, last_message_at",
    )
    .eq("channel_id", channelId)
    .order("updated_at", { ascending: false })
    .limit(10);
  if (error) throw error;

  return ((data || []) as Array<Record<string, unknown>>).map((row) => {
    const externalChatId = String(row.external_chat_id || row.id || "");
    return {
      fingerprint: fingerprintValue(LIPS_SESSION_ID, externalChatId),
      isGroup: row.is_group === true || externalChatId.endsWith("@g.us"),
      queueStatus:
        typeof row.queue_status === "string" ? row.queue_status : null,
      updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
      lastMessageAt:
        typeof row.last_message_at === "string" ? row.last_message_at : null,
    };
  });
}

type LipsGoLiveIntegrityCounts = typeof LIPS_GO_LIVE_KNOWN_BASELINE;

function normalizeIntegrityCounts(
  input: Partial<Record<keyof LipsGoLiveIntegrityCounts, number>>,
) {
  return {
    syncState: Number(input.syncState || 0),
    syncRuns: Number(input.syncRuns || 0),
    pendingRuns: Number(input.pendingRuns || 0),
    failedRuns: Number(input.failedRuns || 0),
    conversations: Number(input.conversations || 0),
    messages: Number(input.messages || 0),
    queueStatusNull: Number(input.queueStatusNull || 0),
    locks: Number(input.locks || 0),
  };
}

export function compareLipsGoLiveIntegrityCounts(
  baselineInput: Partial<Record<keyof LipsGoLiveIntegrityCounts, number>>,
  currentInput: Partial<Record<keyof LipsGoLiveIntegrityCounts, number>>,
) {
  const baseline = normalizeIntegrityCounts(baselineInput);
  const current = normalizeIntegrityCounts(currentInput);
  const deltas = {
    syncState: current.syncState - baseline.syncState,
    syncRuns: current.syncRuns - baseline.syncRuns,
    pendingRuns: current.pendingRuns - baseline.pendingRuns,
    failedRuns: current.failedRuns - baseline.failedRuns,
    conversations: current.conversations - baseline.conversations,
    messages: current.messages - baseline.messages,
    queueStatusNull: current.queueStatusNull - baseline.queueStatusNull,
    locks: current.locks - baseline.locks,
  };
  const checks = [
    {
      code: "sync_state_present",
      status: current.syncState === 1 ? "pass" : "blocker",
      message: "Deve existir exatamente um estado de sync para lips-main.",
    },
    {
      code: "no_active_locks",
      status: current.locks === 0 ? "pass" : "blocker",
      message: "Nao deve haver lock ativo antes/depois do go-live.",
    },
    {
      code: "no_pending_runs",
      status: current.pendingRuns === 0 ? "pass" : "warning",
      message: "Runs pendentes ou em execucao exigem revisao manual.",
    },
    {
      code: "conversations_not_lost",
      status: deltas.conversations >= 0 ? "pass" : "blocker",
      message: "Conversas nao podem diminuir entre capturas.",
    },
    {
      code: "messages_not_lost",
      status: deltas.messages >= 0 ? "pass" : "blocker",
      message: "Mensagens nao podem diminuir entre capturas.",
    },
    {
      code: "runs_not_lost",
      status: deltas.syncRuns >= 0 ? "pass" : "blocker",
      message: "Runs de sync nao podem diminuir entre capturas.",
    },
    {
      code: "queue_status_review",
      status: deltas.queueStatusNull <= 0 ? "pass" : "warning",
      message: "Crescimento em queue_status null exige revisao de fila.",
    },
    {
      code: "failed_runs_review",
      status: deltas.failedRuns <= 0 ? "pass" : "warning",
      message: "Crescimento em runs failed exige revisao.",
    },
  ] as const;
  const hasBlocker = checks.some((check) => check.status === "blocker");
  const hasWarning = checks.some((check) => check.status === "warning");

  return {
    baseline,
    current,
    deltas,
    checks,
    decision: {
      level: hasBlocker ? "blocked" : hasWarning ? "review" : "approved",
      code: hasBlocker
        ? "integrity_blocked"
        : hasWarning
          ? "integrity_review_required"
          : "integrity_approved",
      summary: hasBlocker
        ? "Integridade bloqueada: ha perda de dados, lock ou escopo inconsistente."
        : hasWarning
          ? "Integridade exige revisao manual antes de prosseguir."
          : "Integridade aprovada para o proximo passo operacional.",
    },
  };
}

async function gatewayFetchJson(url: string, token: string) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      headers: { "x-api-key": token, authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(GATEWAY_PROBE_TIMEOUT_MS),
      cache: "no-store",
    });
    const text = await response.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { text: text.slice(0, 120) };
    }
    return {
      status: response.status,
      ok: response.ok,
      latencyMs: Date.now() - startedAt,
      payload,
      error: null as string | null,
    };
  } catch (error) {
    return {
      status: null as number | null,
      ok: false,
      latencyMs: Date.now() - startedAt,
      payload: null,
      error: safeError(error instanceof Error ? error.message : String(error)),
    };
  }
}

async function probeGatewayStatus(gateway: GatewayOptions) {
  const token = process.env.WHATSAPP_WEB_GATEWAY_TOKEN || "";
  if (!token) {
    return {
      code: "gateway_token_missing",
      message: "Credencial server-side do gateway não configurada.",
      gateway: {
        name: gateway.name || gateway.slug || "Gateway",
        status: gateway.status || "unknown",
      },
      health: { httpStatus: null, latencyMs: null },
      readiness: { httpStatus: null, latencyMs: null },
      version: null,
      sessions: {
        total: 0,
        lipsMainFound: false,
        lipsMainStatus: null,
        phoneMasked: null,
      },
      checkedAt: new Date().toISOString(),
      error: "gateway_token_missing",
    };
  }

  const rawBaseUrl = normalizeGatewayBaseUrl(gateway.baseUrl);
  const apiBaseUrl = gatewayApiBaseUrl(gateway.baseUrl);
  const [health, readiness, version, sessionsResponse] = await Promise.all([
    gatewayFetchJson(`${rawBaseUrl}/health`, token),
    gatewayFetchJson(`${rawBaseUrl}/readiness`, token),
    gatewayFetchJson(`${apiBaseUrl}/version`, token),
    gatewayFetchJson(`${apiBaseUrl}/sessions`, token),
  ]);
  const sessions = asArray<GatewaySession>(sessionsResponse.payload);
  const lipsSession =
    sessions.find(
      (session) =>
        session.name === LIPS_SESSION_ID || session.id === LIPS_SESSION_ID,
    ) || null;
  const gatewayError = safeError(
    sessionsResponse.error ||
      (sessionsResponse.payload && typeof sessionsResponse.payload === "object"
        ? (sessionsResponse.payload as { error?: unknown; message?: unknown })
            .error ||
          (sessionsResponse.payload as { message?: unknown }).message
        : null) ||
      health.error ||
      readiness.error,
  );

  return {
    code: sessionsResponse.ok
      ? lipsSession
        ? "ok"
        : "session_not_found"
      : sessionsResponse.status === 401
        ? "gateway_unauthorized"
        : "gateway_unavailable",
    message: sessionsResponse.ok
      ? lipsSession
        ? "Status consultado com sucesso."
        : "Sessão lips-main não encontrada."
      : "Falha sanitizada ao consultar sessões do gateway.",
    gateway: {
      name: gateway.name || gateway.slug || "Gateway",
      status: gateway.status || "unknown",
    },
    health: { httpStatus: health.status, latencyMs: health.latencyMs },
    readiness: { httpStatus: readiness.status, latencyMs: readiness.latencyMs },
    version:
      version.ok && version.payload && typeof version.payload === "object"
        ? String((version.payload as { version?: unknown }).version || "") ||
          null
        : null,
    sessions: {
      total: sessions.length,
      lipsMainFound: Boolean(lipsSession),
      lipsMainStatus: lipsSession?.status || null,
      phoneMasked: maskPhone(
        lipsSession?.phone ||
          lipsSession?.wid ||
          lipsSession?.number ||
          lipsSession?.me?.user,
      ),
    },
    checkedAt: new Date().toISOString(),
    error: gatewayError,
  };
}

async function snapshotQueue(db: Db, channelId: string) {
  const { data, error } = await db
    .from("whatsapp_conversations")
    .select(["id", ...QUEUE_FIELDS].join(", "))
    .eq("channel_id", channelId);
  if (error) throw error;
  const snapshot = new Map<string, Record<string, unknown>>();
  for (const row of (data || []) as unknown as Record<string, unknown>[])
    snapshot.set(String(row.id), row);
  return snapshot;
}

export async function compareQueueSnapshot(
  db: Db,
  channelId: string,
  before: Map<string, Record<string, unknown>>,
) {
  const after = await snapshotQueue(db, channelId);
  const changed: string[] = [];
  for (const [id, previous] of before) {
    const current = after.get(id);
    if (!current) continue;
    for (const field of QUEUE_FIELDS) {
      if ((previous[field] ?? null) !== (current[field] ?? null)) {
        changed.push(`${maskId(id)}:${field}`);
      }
    }
  }
  return { preserved: changed.length === 0, changed: changed.slice(0, 20) };
}

export async function getLipsWhatsappSyncDiagnostics(
  db: Db,
  providerFactory: ProviderFactory,
  options?: { includeProviderStatus?: boolean },
) {
  const { channel, organization } = await resolveLipsSyncChannel(db);
  const gatewayOptions = await loadGatewayOptions(db, channel.gateway_id);
  const [state, lastRun] = await Promise.all([
    loadSyncState(db, channel.id),
    loadLastRun(db, channel.id),
  ]);
  let providerStatus =
    typeof state?.last_provider_status === "string"
      ? state.last_provider_status
      : null;
  if (options?.includeProviderStatus) {
    providerStatus = await providerFactory(
      LIPS_SESSION_ID,
      gatewayOptions,
    ).getConnectionStatus();
  }

  return {
    channel: {
      id: maskId(channel.id),
      organization: organization.name,
      sessionId: channel.session_id,
      provider: "openwa",
      status:
        channel.status ||
        (channel.is_active === false || channel.active === false
          ? "disabled"
          : "unknown"),
    },
    connection: {
      providerStatus,
      connected: isOpenWaConnected(providerStatus),
    },
    state: state
      ? {
          syncStatus: state.sync_status || "idle",
          lastSuccessAt: state.last_success_at || null,
          lastError: state.last_error ? safeError(state.last_error) : null,
          lastMode: state.last_mode || null,
          lastRunId: maskId(state.last_run_id),
          lock: state.locked_at
            ? {
                lockedAt: state.locked_at,
                expiresAt: state.lock_expires_at,
                lockedBy: maskId(state.locked_by),
              }
            : null,
          checkpoint: {
            chat: state.last_chat_checkpoint || null,
            message: state.last_message_checkpoint || null,
          },
          nextReconciliationAt: state.next_reconciliation_at || null,
          stats: state.stats || null,
        }
      : null,
    lastRun: sanitizeSyncRun(lastRun),
  };
}

export async function getLipsWhatsappReadOnlyStatus(db: Db) {
  const { channel, organization } = await resolveLipsSyncChannel(db);
  const gatewayOptions = await loadGatewayOptions(db, channel.gateway_id);
  const [state, lastRun, inventory, gatewayStatus] = await Promise.all([
    loadSyncState(db, channel.id),
    loadLastRun(db, channel.id),
    loadReadOnlyInventory(db, channel.id),
    probeGatewayStatus(gatewayOptions),
  ]);
  const providerStatus =
    gatewayStatus.sessions.lipsMainStatus ||
    (typeof state?.last_provider_status === "string"
      ? state.last_provider_status
      : null);

  return {
    action: "status" as const,
    providerStatus: providerStatus || "unknown",
    connected: isOpenWaConnected(providerStatus),
    enqueue: null,
    processedRuns: 0,
    runs: [],
    queuePreserved: true,
    queueChanged: [],
    sentMessages: false,
    returnedSecret: false,
    snapshot: {
      channel: {
        id: maskId(channel.id),
        organization: organization.name,
        sessionId: channel.session_id,
        provider: "openwa",
        status:
          channel.status ||
          (channel.is_active === false || channel.active === false
            ? "disabled"
            : "unknown"),
      },
      connection: {
        providerStatus,
        connected: isOpenWaConnected(providerStatus),
      },
      state: state
        ? {
            syncStatus: state.sync_status || "idle",
            lastSuccessAt: state.last_success_at || null,
            lastError: state.last_error ? safeError(state.last_error) : null,
            lastMode: state.last_mode || null,
            lastRunId: maskId(state.last_run_id),
            lock: state.locked_at
              ? {
                  lockedAt: state.locked_at,
                  expiresAt: state.lock_expires_at,
                  lockedBy: maskId(state.locked_by),
                }
              : null,
            checkpoint: {
              chat: state.last_chat_checkpoint || null,
              message: state.last_message_checkpoint || null,
            },
            nextReconciliationAt: state.next_reconciliation_at || null,
            stats: state.stats || null,
          }
        : null,
      lastRun: sanitizeSyncRun(lastRun),
    },
    gatewayStatus,
    inventory,
    limits: {
      chatLimit: BOOTSTRAP_CHAT_LIMIT,
      messageLimit: BOOTSTRAP_MESSAGE_LIMIT,
      maxAgeDays: 30,
      groupsIgnored: true,
    },
  };
}

export async function captureLipsGoLiveIntegritySnapshotReadOnly(db: Db) {
  const { channel, organization, gatewayOptions } =
    await resolveLipsGoLiveIntegrityScope(db);
  const beforeIntegrity = await loadLipsGoLiveIntegrityCounts(db, channel.id);
  const beforeQueue = await snapshotQueue(db, channel.id);
  const [state, lastRun, gatewayStatus, conversationFingerprints] =
    await Promise.all([
      loadSyncState(db, channel.id),
      loadLastRun(db, channel.id),
      probeGatewayStatus(gatewayOptions),
      loadLipsConversationFingerprints(db, channel.id),
    ]);
  const afterIntegrity = await loadLipsGoLiveIntegrityCounts(db, channel.id);
  const queue = await compareQueueSnapshot(db, channel.id, beforeQueue);
  const readOnlyPreserved =
    JSON.stringify(beforeIntegrity) === JSON.stringify(afterIntegrity) &&
    queue.preserved;
  const comparison = compareLipsGoLiveIntegrityCounts(
    LIPS_GO_LIVE_KNOWN_BASELINE,
    afterIntegrity,
  );
  const gatewayCheck = {
    code: "gateway_session_ready",
    status:
      gatewayStatus.code === "ok" && isOpenWaConnected(gatewayStatus.sessions.lipsMainStatus)
        ? "pass"
        : "warning",
    message: "Gateway deve responder e expor lips-main conectada.",
  };
  const readOnlyCheck = {
    code: "read_only_preserved",
    status: readOnlyPreserved ? "pass" : "blocker",
    message: "A captura nao pode alterar contadores nem campos de fila.",
  };
  const checks = [...comparison.checks, gatewayCheck, readOnlyCheck];
  const hasBlocker = checks.some((check) => check.status === "blocker");
  const hasWarning = checks.some((check) => check.status === "warning");
  const decision = {
    level: hasBlocker ? "blocked" : hasWarning ? "review" : "approved",
    code: hasBlocker
      ? "integrity_blocked"
      : hasWarning
        ? "integrity_review_required"
        : "integrity_approved",
    summary: hasBlocker
      ? "Captura bloqueada por falha de integridade ou violacao read-only."
      : hasWarning
        ? "Captura concluida; revise alertas antes do proximo passo."
        : "Captura concluida e integridade aprovada.",
  };

  return {
    action: "capture_lips_integrity_snapshot" as const,
    ok: !hasBlocker,
    capturedAt: new Date().toISOString(),
    scope: {
      tenantId: maskId(LIPS_TENANT_ID),
      organizationId: maskId(LIPS_ORGANIZATION_ID),
      channelId: maskId(LIPS_CHANNEL_ID),
      gatewayId: maskId(LIPS_GATEWAY_ID),
      organization: organization.name,
      sessionId: LIPS_SESSION_ID,
      provider: "openwa",
      environment: "production",
      fixedProductionScope: true,
    },
    integrity: afterIntegrity,
    knownBaseline: LIPS_GO_LIVE_KNOWN_BASELINE,
    comparisonToKnownBaseline: comparison,
    decision: {
      ...decision,
      checks,
    },
    gatewayStatus,
    sync: {
      syncStatus: state?.sync_status || "idle",
      lastSuccessAt: state?.last_success_at || null,
      lastError: state?.last_error ? safeError(state.last_error) : null,
      lastMode: state?.last_mode || null,
      lastRunId: maskId(state?.last_run_id),
      lastRun: sanitizeSyncRun(lastRun),
      checkpoint: {
        chat: state?.last_chat_checkpoint || null,
        message: state?.last_message_checkpoint || null,
      },
    },
    samples: {
      conversationFingerprints,
    },
    readOnly: {
      preserved: readOnlyPreserved,
      queuePreserved: queue.preserved,
      queueChanged: queue.changed,
      sentMessages: false,
      returnedSecret: false,
    },
    queuePreserved: queue.preserved,
    queueChanged: queue.changed,
    sentMessages: false,
    returnedSecret: false,
  };
}

async function listProbeChatPage(
  provider: OpenWaSyncProvider,
  input: { limit: number; offset: number },
) {
  const startedAt = Date.now();
  try {
    const chats = await provider.listChats({
      limit: input.limit,
      offset: input.offset,
    });
    const durationMs = Date.now() - startedAt;
    return {
      success: true,
      ok: true,
      code: "ok",
      limit: input.limit,
      offset: input.offset,
      durationMs,
      duration_ms: durationMs,
      count: chats.length,
      returned: chats.length,
      has_more: null as boolean | null,
      timeoutMs: PROVIDER_TIMEOUT_MS.listChats,
      timeout_ms: PROVIDER_TIMEOUT_MS.listChats,
      error: null as string | null,
      chats,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const code = safeErrorCode(error);
    return {
      success: false,
      ok: false,
      code,
      limit: input.limit,
      offset: input.offset,
      durationMs,
      duration_ms: durationMs,
      count: 0,
      returned: 0,
      has_more: null as boolean | null,
      timeoutMs: PROVIDER_TIMEOUT_MS.listChats,
      timeout_ms: PROVIDER_TIMEOUT_MS.listChats,
      error: code,
      chats: [] as ProviderChatSummary[],
    };
  }
}

export async function probeLipsWhatsappChatsReadOnly(
  db: Db,
  providerFactory: ProviderFactory,
  input?: ProbeChatsOptions,
) {
  const { channel } = await resolveLipsSyncChannel(db);
  const gatewayOptions = await loadGatewayOptions(db, channel.gateway_id);
  const normalized = normalizeProbeChatsOptions(input);
  if (!normalized.ok) {
    return {
      action: "probe_chats" as const,
      ok: false,
      success: false,
      code: normalized.code,
      durationMs: 0,
      duration_ms: 0,
      returned: 0,
      count: 0,
      requestedLimit: normalized.limit,
      requestedOffset: normalized.offset,
      limit: normalized.limit,
      offset: normalized.offset,
      maxLimit: PROBE_CHAT_MAX_LIMIT,
      paginationAvailable: false,
      paginationIgnored: false,
      timeoutMs: PROVIDER_TIMEOUT_MS.listChats,
      timeout_ms: PROVIDER_TIMEOUT_MS.listChats,
      checkedAt: new Date().toISOString(),
      error: normalized.error,
      sentMessages: false,
      returnedSecret: false,
    };
  }
  const provider = providerFactory(LIPS_SESSION_ID, gatewayOptions);
  const page = await listProbeChatPage(provider, normalized);
  return {
    action: "probe_chats" as const,
    ok: page.ok,
    success: page.success,
    code: page.code,
    durationMs: page.durationMs,
    duration_ms: page.duration_ms,
    returned: page.returned,
    count: page.count,
    requestedLimit: normalized.limit,
    requestedOffset: normalized.offset,
    limit: normalized.limit,
    offset: normalized.offset,
    maxLimit: PROBE_CHAT_MAX_LIMIT,
    paginationAvailable: page.count <= normalized.limit,
    paginationIgnored: page.count > normalized.limit,
    has_more: page.has_more,
    timeoutMs: page.timeoutMs,
    timeout_ms: page.timeout_ms,
    checkedAt: new Date().toISOString(),
    error: page.error,
    sentMessages: false,
    returnedSecret: false,
  };
}

export async function validateLipsWhatsappChatPaginationReadOnly(
  db: Db,
  providerFactory: ProviderFactory,
) {
  const { channel } = await resolveLipsSyncChannel(db);
  const gatewayOptions = await loadGatewayOptions(db, channel.gateway_id);
  const provider = providerFactory(LIPS_SESSION_ID, gatewayOptions);
  const beforeIntegrity = await loadReadOnlyIntegrity(db, channel);
  const beforeQueue = await snapshotQueue(db, channel.id);
  const page1 = await listProbeChatPage(provider, { limit: 5, offset: 0 });
  const page2 = await listProbeChatPage(provider, { limit: 5, offset: 5 });
  const afterIntegrity = await loadReadOnlyIntegrity(db, channel);
  const queue = await compareQueueSnapshot(db, channel.id, beforeQueue);
  const page1Fingerprints = page1.chats.map((chat) =>
    fingerprintChat(LIPS_SESSION_ID, chat),
  );
  const page2Fingerprints = page2.chats.map((chat) =>
    fingerprintChat(LIPS_SESSION_ID, chat),
  );
  const page1Set = new Set(page1Fingerprints);
  const page2Set = new Set(page2Fingerprints);
  const overlapCount = page2Fingerprints.filter((fingerprint) =>
    page1Set.has(fingerprint),
  ).length;
  const uniquePage1 = page1Fingerprints.filter(
    (fingerprint) => !page2Set.has(fingerprint),
  ).length;
  const uniquePage2 = page2Fingerprints.filter(
    (fingerprint) => !page1Set.has(fingerprint),
  ).length;
  const limitRespected =
    page1.count <= page1.limit && page2.count <= page2.limit;
  const enoughVolume = page1.count === 5 && page2.count === 5;
  const distinctPages = page2.count > 0 && overlapCount === 0;
  const paginationProved = Boolean(
    page1.success &&
    page2.success &&
    limitRespected &&
    enoughVolume &&
    distinctPages,
  );
  const integrityPreserved =
    JSON.stringify(beforeIntegrity) === JSON.stringify(afterIntegrity) &&
    queue.preserved;

  const code = paginationProved
    ? "pagination_validated"
    : !page1.success || !page2.success
      ? "pagination_probe_failed"
      : !limitRespected
        ? "pagination_limit_ignored"
        : !integrityPreserved
          ? "read_only_integrity_changed"
          : enoughVolume && !distinctPages
            ? "pagination_overlap_detected"
            : "pagination_not_enough_volume";

  return {
    action: "validate_chat_pagination" as const,
    ok:
      page1.success &&
      page2.success &&
      limitRespected &&
      integrityPreserved &&
      (paginationProved || !enoughVolume),
    code,
    status: paginationProved
      ? "aprovado"
      : !page1.success || !page2.success
        ? page1.code === "gateway_unauthorized" ||
          page2.code === "gateway_unauthorized"
          ? "erro de autorização"
          : page1.code.includes("timeout") || page2.code.includes("timeout")
            ? "timeout"
            : "gateway indisponível"
        : !limitRespected || !distinctPages
          ? "paginação não comprovada"
          : "paginação não comprovada",
    pages: {
      page1: {
        success: page1.success,
        limit: page1.limit,
        offset: page1.offset,
        duration_ms: page1.duration_ms,
        count: page1.count,
        has_more: page1.has_more,
        timeout_ms: page1.timeout_ms,
        error: page1.error,
      },
      page2: {
        success: page2.success,
        limit: page2.limit,
        offset: page2.offset,
        duration_ms: page2.duration_ms,
        count: page2.count,
        has_more: page2.has_more,
        timeout_ms: page2.timeout_ms,
        error: page2.error,
      },
    },
    comparison: {
      fingerprints_page_1: page1Fingerprints,
      fingerprints_page_2: page2Fingerprints,
      overlap_count: overlapCount,
      unique_page_1: uniquePage1,
      unique_page_2: uniquePage2,
      distinct_pages: distinctPages,
      limit_respected: limitRespected,
      offset_proved: paginationProved,
      enough_volume: enoughVolume,
      ordering_stable: true,
      ordering_basis:
        "OpenWA sorts chats by timestamp before applying limit/offset",
    },
    integrity: {
      before: beforeIntegrity,
      after: afterIntegrity,
      queuePreserved: queue.preserved,
      queueChanged: queue.changed,
    },
    queuePreserved: queue.preserved,
    queueChanged: queue.changed,
    sentMessages: false,
    returnedSecret: false,
    checkedAt: new Date().toISOString(),
  };
}

function actionMode(action: SyncDiagnosticsAction): WhatsappSyncMode | null {
  if (action === "diagnostic") return "manual_diagnostic";
  if (action === "bootstrap") return "bootstrap";
  if (action === "incremental") return "incremental";
  if (action === "reconciliation") return "reconciliation";
  return null;
}

function actionLimits(action: SyncDiagnosticsAction) {
  if (action === "diagnostic") return { chatLimit: 1, messageLimit: 1 };
  if (action === "bootstrap") return { chatLimit: 100, messageLimit: 100 };
  if (action === "incremental") return { chatLimit: 100, messageLimit: 100 };
  if (action === "reconciliation") return { chatLimit: 100, messageLimit: 100 };
  return { chatLimit: 1, messageLimit: 1 };
}

export async function runLipsWhatsappSyncDiagnostics(
  db: Db,
  providerFactory: ProviderFactory,
  input: { action: SyncDiagnosticsAction; actorUserId: string },
) {
  const { channel } = await resolveLipsSyncChannel(db);
  const gatewayOptions = await loadGatewayOptions(db, channel.gateway_id);
  const provider = providerFactory(LIPS_SESSION_ID, gatewayOptions);
  const providerStatus = await provider.getConnectionStatus();
  const before = await snapshotQueue(db, channel.id);
  const mode = actionMode(input.action);

  let enqueueResult: Record<string, unknown> | null = null;
  if (mode) {
    const limits = actionLimits(input.action);
    enqueueResult = await enqueueWhatsappSync(db, {
      tenantId: channel.tenant_id,
      organizationId: channel.organization_id,
      channelId: channel.id,
      sessionId: LIPS_SESSION_ID,
      mode,
      triggerSource: "preview_internal_diagnostics",
      requestedByAppUserId: input.actorUserId,
      chatLimit: limits.chatLimit,
      messageLimit: limits.messageLimit,
      metadata: {
        source: "admin_diagnostics",
        maxAgeDays: input.action === "bootstrap" ? 30 : null,
        sendsMessages: false,
      },
    });
  }

  const processResult = await processQueuedWhatsappSyncRunsForChannel(
    db,
    channel.id,
    1,
    (sessionId) => {
      if (sessionId !== LIPS_SESSION_ID)
        throw new Error("A homologacao interna aceita somente lips-main.");
      return provider;
    },
  );
  const queue = await compareQueueSnapshot(db, channel.id, before);
  if (!queue.preserved)
    throw new Error(
      `Queue fields changed during sync: ${queue.changed.join(", ")}`,
    );
  const snapshot = await getLipsWhatsappSyncDiagnostics(db, providerFactory);

  return {
    action: input.action,
    providerStatus,
    connected: isOpenWaConnected(providerStatus),
    enqueue: enqueueResult
      ? {
          created: Boolean(enqueueResult.created),
          runId: maskId(String(enqueueResult.runId || "")),
          status: enqueueResult.status || null,
        }
      : null,
    processedRuns: processResult.processedRuns,
    runs: processResult.runs.map((run) =>
      sanitizeProcessedRun(run as Record<string, unknown>),
    ),
    queuePreserved: queue.preserved,
    queueChanged: queue.changed,
    snapshot,
    sentMessages: false,
    returnedSecret: false,
  };
}

export const LIPS_WHATSAPP_SYNC_DIAGNOSTICS = {
  sessionId: LIPS_SESSION_ID,
  organizationSlug: LIPS_ORGANIZATION_SLUG,
  queueFields: QUEUE_FIELDS,
};

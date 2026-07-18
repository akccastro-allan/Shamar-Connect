import type { createSupabaseWriteClient } from "../supabase/server-write.ts";
import { PROVIDER_TIMEOUT_MS } from "../providers/whatsapp-web-gateway-client.ts";
import { enqueueWhatsappSync, processQueuedWhatsappSyncRunsForChannel, type WhatsappSyncMode } from "./service.ts";
import { isOpenWaConnected, type OpenWaSyncProvider } from "./providers/openwa-sync-provider.ts";

type Db = ReturnType<typeof createSupabaseWriteClient>;
type ProviderFactory = (sessionId: string, options?: { baseUrl?: string | null }) => OpenWaSyncProvider;

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

export type SyncDiagnosticsAction = "status" | "probe_chats" | "diagnostic" | "bootstrap" | "incremental" | "reconciliation" | "process_next";

const LIPS_SESSION_ID = "lips-main";
const LIPS_ORGANIZATION_SLUG = "auto-pecas-auto-center-lips";
const GATEWAY_PROBE_TIMEOUT_MS = 15_000;
const BOOTSTRAP_CHAT_LIMIT = 100;
const BOOTSTRAP_MESSAGE_LIMIT = 100;
const PROBE_CHAT_DEFAULT_LIMIT = 5;
const PROBE_CHAT_MAX_LIMIT = 10;
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

function metadataRecord(value: unknown): TenantMetadata {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function hasFeature(metadata: TenantMetadata, feature: string) {
  const features = metadata?.features;
  return Boolean(features && typeof features === "object" && !Array.isArray(features) && (features as Record<string, unknown>)[feature] === true);
}

export function canExecuteSyncDiagnostics(input: { vercelEnv?: string | null; metadata: TenantMetadata }) {
  if (input.vercelEnv !== "production") return true;
  return hasFeature(input.metadata, "whatsapp_sync_diagnostics_execute");
}

export function isReadOnlySyncDiagnosticsAction(action: SyncDiagnosticsAction) {
  return action === "status" || action === "probe_chats";
}

export function isWriteSyncDiagnosticsAction(action: SyncDiagnosticsAction) {
  return !isReadOnlySyncDiagnosticsAction(action);
}

function isAllowedRole(value?: string | null) {
  return value === "owner" || value === "admin";
}

export function isWhatsappSyncDiagnosticsOperatorCandidate(input: { isPlatformTenant: boolean; role?: string | null; organizationId?: string | null; metadata: TenantMetadata }) {
  return input.isPlatformTenant === true && input.organizationId === null && isAllowedRole(input.role) && hasFeature(input.metadata, "command_center");
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
  if (value && typeof value === "object" && Array.isArray((value as { data?: unknown }).data)) return (value as { data: T[] }).data;
  if (value && typeof value === "object" && Array.isArray((value as { sessions?: unknown }).sessions)) return (value as { sessions: T[] }).sessions;
  return [];
}

export function sanitizeSyncRun(run: Record<string, unknown> | null | undefined) {
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
    providerStatus: typeof run.providerStatus === "string" ? run.providerStatus : null,
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

  const globalMemberships = (tenantUsers || []).filter((item) => item.organization_id === null && isAllowedRole(item.role || appUser.role));
  if (!globalMemberships.length) throw new Error("FORBIDDEN");

  const tenantIds = Array.from(new Set(globalMemberships.map((item) => item.tenant_id).filter(Boolean)));
  const { data: tenants, error: tenantsError } = await db
    .from("tenants")
    .select("id, is_platform, metadata")
    .in("id", tenantIds);
  if (tenantsError) throw tenantsError;

  const tenantById = new Map((tenants || []).map((tenant) => [tenant.id, tenant]));
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
    .select("id, tenant_id, organization_id, session_id, provider, provider_type, channel_type, status, active, is_active, gateway_id")
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
    if (channel.provider && !["whatsapp_web", "openwa"].includes(channel.provider)) throw new Error("Lips channel provider is not OpenWA/WhatsApp Web.");
    return { channel, organization };
  }

  throw new Error("Canal lips-main da Lips nao encontrado.");
}

async function loadGatewayOptions(db: Db, gatewayId?: string | null): Promise<GatewayOptions> {
  if (!gatewayId) return {};
  const { data: gateway, error } = await db
    .from("internal_messaging_gateways")
    .select("id, name, slug, provider, environment, status, base_url")
    .eq("id", gatewayId)
    .maybeSingle();
  if (error) throw error;
  if (!gateway) throw new Error("Gateway vinculado ao canal Lips nao encontrado.");
  if (gateway.provider !== "openwa" || gateway.environment !== "production" || gateway.status !== "active") {
    throw new Error("Gateway vinculado ao canal Lips nao esta ativo em Production/OpenWA.");
  }
  if (!gateway.base_url) throw new Error("Gateway vinculado ao canal Lips sem base_url.");
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
    .select("sync_status, last_mode, last_run_id, last_queued_at, last_started_at, last_completed_at, last_success_at, last_error_at, last_error, bootstrap_completed_at, last_chat_checkpoint, last_message_checkpoint, last_provider_status, last_provider_seen_at, next_reconciliation_at, locked_at, lock_expires_at, locked_by, cursor, stats, updated_at")
    .eq("channel_id", channelId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function loadLastRun(db: Db, channelId: string) {
  const { data, error } = await db
    .from("whatsapp_sync_runs")
    .select("id, mode, status, started_at, completed_at, chats_scanned, chats_synced, chats_skipped, messages_scanned, messages_saved, messages_updated, errors_count, error_message")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function countRows(db: Db, table: string, applyFilters: (query: any) => any) {
  const query = applyFilters(db.from(table).select("id"));
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data.length : 0;
}

async function loadReadOnlyInventory(db: Db, channelId: string) {
  const [syncState, syncRuns, pendingRuns, failedRuns, locks, conversations, queueNull] = await Promise.all([
    countRows(db, "whatsapp_channel_sync_state", (query) => query.eq("channel_id", channelId)),
    countRows(db, "whatsapp_sync_runs", (query) => query.eq("channel_id", channelId)),
    countRows(db, "whatsapp_sync_runs", (query) => query.eq("channel_id", channelId).in("status", ["queued", "running"])),
    countRows(db, "whatsapp_sync_runs", (query) => query.eq("channel_id", channelId).eq("status", "failed")),
    countRows(db, "whatsapp_channel_sync_state", (query) => query.eq("channel_id", channelId).not("locked_at", "is", null)),
    countRows(db, "whatsapp_conversations", (query) => query.eq("channel_id", channelId)),
    countRows(db, "whatsapp_conversations", (query) => query.eq("channel_id", channelId).is("queue_status", null)),
  ]);

  return { syncState, syncRuns, pendingRuns, failedRuns, locks, conversations, queueStatusNull: queueNull };
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
    return { status: response.status, ok: response.ok, latencyMs: Date.now() - startedAt, payload, error: null as string | null };
  } catch (error) {
    return { status: null as number | null, ok: false, latencyMs: Date.now() - startedAt, payload: null, error: safeError(error instanceof Error ? error.message : String(error)) };
  }
}

async function probeGatewayStatus(gateway: GatewayOptions) {
  const token = process.env.WHATSAPP_WEB_GATEWAY_TOKEN || "";
  if (!token) {
    return {
      code: "gateway_token_missing",
      message: "Credencial server-side do gateway não configurada.",
      gateway: { name: gateway.name || gateway.slug || "Gateway", status: gateway.status || "unknown" },
      health: { httpStatus: null, latencyMs: null },
      readiness: { httpStatus: null, latencyMs: null },
      version: null,
      sessions: { total: 0, lipsMainFound: false, lipsMainStatus: null, phoneMasked: null },
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
  const lipsSession = sessions.find((session) => session.name === LIPS_SESSION_ID || session.id === LIPS_SESSION_ID) || null;
  const gatewayError = safeError(
    sessionsResponse.error ||
    (sessionsResponse.payload && typeof sessionsResponse.payload === "object" ? (sessionsResponse.payload as { error?: unknown; message?: unknown }).error || (sessionsResponse.payload as { message?: unknown }).message : null) ||
    health.error ||
    readiness.error,
  );

  return {
    code: sessionsResponse.ok ? (lipsSession ? "ok" : "session_not_found") : sessionsResponse.status === 401 ? "gateway_unauthorized" : "gateway_unavailable",
    message: sessionsResponse.ok ? (lipsSession ? "Status consultado com sucesso." : "Sessão lips-main não encontrada.") : "Falha sanitizada ao consultar sessões do gateway.",
    gateway: { name: gateway.name || gateway.slug || "Gateway", status: gateway.status || "unknown" },
    health: { httpStatus: health.status, latencyMs: health.latencyMs },
    readiness: { httpStatus: readiness.status, latencyMs: readiness.latencyMs },
    version: version.ok && version.payload && typeof version.payload === "object" ? String((version.payload as { version?: unknown }).version || "") || null : null,
    sessions: {
      total: sessions.length,
      lipsMainFound: Boolean(lipsSession),
      lipsMainStatus: lipsSession?.status || null,
      phoneMasked: maskPhone(lipsSession?.phone || lipsSession?.wid || lipsSession?.number || lipsSession?.me?.user),
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
  for (const row of (data || []) as unknown as Record<string, unknown>[]) snapshot.set(String(row.id), row);
  return snapshot;
}

export async function compareQueueSnapshot(db: Db, channelId: string, before: Map<string, Record<string, unknown>>) {
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

export async function getLipsWhatsappSyncDiagnostics(db: Db, providerFactory: ProviderFactory, options?: { includeProviderStatus?: boolean }) {
  const { channel, organization } = await resolveLipsSyncChannel(db);
  const gatewayOptions = await loadGatewayOptions(db, channel.gateway_id);
  const [state, lastRun] = await Promise.all([loadSyncState(db, channel.id), loadLastRun(db, channel.id)]);
  let providerStatus = typeof state?.last_provider_status === "string" ? state.last_provider_status : null;
  if (options?.includeProviderStatus) {
    providerStatus = await providerFactory(LIPS_SESSION_ID, gatewayOptions).getConnectionStatus();
  }

  return {
    channel: {
      id: maskId(channel.id),
      organization: organization.name,
      sessionId: channel.session_id,
      provider: "openwa",
      status: channel.status || (channel.is_active === false || channel.active === false ? "disabled" : "unknown"),
    },
    connection: {
      providerStatus,
      connected: isOpenWaConnected(providerStatus),
    },
    state: state ? {
      syncStatus: state.sync_status || "idle",
      lastSuccessAt: state.last_success_at || null,
      lastError: state.last_error ? safeError(state.last_error) : null,
      lastMode: state.last_mode || null,
      lastRunId: maskId(state.last_run_id),
      lock: state.locked_at ? { lockedAt: state.locked_at, expiresAt: state.lock_expires_at, lockedBy: maskId(state.locked_by) } : null,
      checkpoint: { chat: state.last_chat_checkpoint || null, message: state.last_message_checkpoint || null },
      nextReconciliationAt: state.next_reconciliation_at || null,
      stats: state.stats || null,
    } : null,
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
  const providerStatus = gatewayStatus.sessions.lipsMainStatus || (typeof state?.last_provider_status === "string" ? state.last_provider_status : null);

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
        status: channel.status || (channel.is_active === false || channel.active === false ? "disabled" : "unknown"),
      },
      connection: {
        providerStatus,
        connected: isOpenWaConnected(providerStatus),
      },
      state: state ? {
        syncStatus: state.sync_status || "idle",
        lastSuccessAt: state.last_success_at || null,
        lastError: state.last_error ? safeError(state.last_error) : null,
        lastMode: state.last_mode || null,
        lastRunId: maskId(state.last_run_id),
        lock: state.locked_at ? { lockedAt: state.locked_at, expiresAt: state.lock_expires_at, lockedBy: maskId(state.locked_by) } : null,
        checkpoint: { chat: state.last_chat_checkpoint || null, message: state.last_message_checkpoint || null },
        nextReconciliationAt: state.next_reconciliation_at || null,
        stats: state.stats || null,
      } : null,
      lastRun: sanitizeSyncRun(lastRun),
    },
    gatewayStatus,
    inventory,
    limits: { chatLimit: BOOTSTRAP_CHAT_LIMIT, messageLimit: BOOTSTRAP_MESSAGE_LIMIT, maxAgeDays: 30, groupsIgnored: true },
  };
}

export async function probeLipsWhatsappChatsReadOnly(db: Db, providerFactory: ProviderFactory, input?: { limit?: number }) {
  const { channel } = await resolveLipsSyncChannel(db);
  const gatewayOptions = await loadGatewayOptions(db, channel.gateway_id);
  const rawLimit = input?.limit === undefined ? PROBE_CHAT_DEFAULT_LIMIT : Math.trunc(Number(input.limit));
  const limit = Number.isFinite(rawLimit) ? rawLimit : PROBE_CHAT_DEFAULT_LIMIT;
  if (limit < 1 || limit > PROBE_CHAT_MAX_LIMIT) {
    return {
      action: "probe_chats" as const,
      ok: false,
      code: "probe_limit_out_of_bounds",
      durationMs: 0,
      returned: 0,
      requestedLimit: limit,
      maxLimit: PROBE_CHAT_MAX_LIMIT,
      paginationAvailable: false,
      paginationIgnored: false,
      timeoutMs: PROVIDER_TIMEOUT_MS.listChats,
      checkedAt: new Date().toISOString(),
      error: `probe_limit_must_be_between_1_and_${PROBE_CHAT_MAX_LIMIT}`,
      sentMessages: false,
      returnedSecret: false,
    };
  }
  const provider = providerFactory(LIPS_SESSION_ID, gatewayOptions);
  const startedAt = Date.now();
  try {
    const chats = await provider.listChats({ limit, offset: 0 });
    return {
      action: "probe_chats" as const,
      ok: true,
      code: "ok",
      durationMs: Date.now() - startedAt,
      returned: chats.length,
      requestedLimit: limit,
      maxLimit: PROBE_CHAT_MAX_LIMIT,
      paginationAvailable: chats.length <= limit,
      paginationIgnored: chats.length > limit,
      timeoutMs: PROVIDER_TIMEOUT_MS.listChats,
      checkedAt: new Date().toISOString(),
      error: null,
      sentMessages: false,
      returnedSecret: false,
    };
  } catch (error) {
    const timeout = error instanceof Error && error.message.toLowerCase().includes("timeout");
    return {
      action: "probe_chats" as const,
      ok: false,
      code: timeout ? "provider_list_chats_timeout" : "provider_list_chats_failed",
      durationMs: Date.now() - startedAt,
      returned: 0,
      requestedLimit: limit,
      maxLimit: PROBE_CHAT_MAX_LIMIT,
      paginationAvailable: false,
      paginationIgnored: false,
      timeoutMs: PROVIDER_TIMEOUT_MS.listChats,
      checkedAt: new Date().toISOString(),
      error: safeError(error instanceof Error ? error.message : String(error)),
      sentMessages: false,
      returnedSecret: false,
    };
  }
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

export async function runLipsWhatsappSyncDiagnostics(db: Db, providerFactory: ProviderFactory, input: { action: SyncDiagnosticsAction; actorUserId: string }) {
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
      metadata: { source: "admin_diagnostics", maxAgeDays: input.action === "bootstrap" ? 30 : null, sendsMessages: false },
    });
  }

  const processResult = await processQueuedWhatsappSyncRunsForChannel(db, channel.id, 1, (sessionId) => {
    if (sessionId !== LIPS_SESSION_ID) throw new Error("A homologacao interna aceita somente lips-main.");
    return provider;
  });
  const queue = await compareQueueSnapshot(db, channel.id, before);
  if (!queue.preserved) throw new Error(`Queue fields changed during sync: ${queue.changed.join(", ")}`);
  const snapshot = await getLipsWhatsappSyncDiagnostics(db, providerFactory);

  return {
    action: input.action,
    providerStatus,
    connected: isOpenWaConnected(providerStatus),
    enqueue: enqueueResult ? { created: Boolean(enqueueResult.created), runId: maskId(String(enqueueResult.runId || "")), status: enqueueResult.status || null } : null,
    processedRuns: processResult.processedRuns,
    runs: processResult.runs.map((run) => sanitizeProcessedRun(run as Record<string, unknown>)),
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

import { createHash } from "crypto";
import { LIPS_ORGANIZATION_ID } from "../agents/auto-reply-config.ts";
import { resolveOrCreateContactByIdentity, type IdentityType } from "../inbox/contacts.ts";
import { OpenWaGatewayError, PROVIDER_TIMEOUT_MS } from "../providers/whatsapp-web-gateway-client.ts";
import type { createSupabaseWriteClient } from "../supabase/server-write.ts";
import { isOpenWaConnected, type OpenWaSyncProvider } from "./providers/openwa-sync-provider.ts";
import type { ProviderChatSummary, ProviderSyncedMessage } from "../../types/messaging-provider.ts";

type Db = ReturnType<typeof createSupabaseWriteClient>;
type SyncProviderFactory = (sessionId: string) => OpenWaSyncProvider;

function missingProviderFactory(): OpenWaSyncProvider {
  throw new Error("OpenWA sync provider factory is required.");
}

export type WhatsappSyncMode = "bootstrap" | "incremental" | "reconciliation" | "manual_diagnostic";
export type WhatsappSyncRunStatus = "queued" | "running" | "completed" | "partial" | "failed" | "skipped";

type ChannelForSync = {
  id: string;
  tenant_id: string;
  organization_id: string;
  session_id: string | null;
  provider: string | null;
};

type SyncRunRow = {
  id: string;
  tenant_id: string;
  organization_id: string;
  channel_id: string;
  sync_state_id: string | null;
  mode: WhatsappSyncMode;
  status: WhatsappSyncRunStatus;
  selected_chat_ids: string[] | null;
  chat_limit: number;
  message_limit: number;
  metadata?: Record<string, unknown> | null;
};

type SyncCounters = {
  chatsScanned: number;
  chatsSynced: number;
  chatsSkipped: number;
  messagesScanned: number;
  messagesSaved: number;
  messagesUpdated: number;
  errors: { chatId?: string; messageId?: string; step: string; error: string }[];
  latestMessageAt: string | null;
  hasMore: boolean;
  nextCursorOffset: number | null;
  providerStatus: string | null;
  skippedReason: string | null;
  diagnostics: Record<string, unknown>;
};

class SyncStageError extends Error {
  diagnostics: Record<string, unknown>;

  constructor(message: string, diagnostics: Record<string, unknown>) {
    super(message);
    this.name = "SyncStageError";
    this.diagnostics = diagnostics;
  }
}

const BOOTSTRAP_CHAT_LIMIT = 100;
const BOOTSTRAP_MESSAGE_LIMIT = 100;
const DEFAULT_CHAT_LIMIT = 20;
const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_SELECTED_CHAT_IDS = 100;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const LOCK_TIMEOUT_MS = 10 * 60 * 1000;
const RECONCILIATION_INTERVAL_MS = 5 * 60 * 1000;
const IDLE_RECONCILIATION_INTERVAL_MS = 15 * 60 * 1000;
const CONNECTED_EVENT_DEDUPE_MS = 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function safeDiagnosticError(value: unknown) {
  return String(value || "")
    .replace(/https?:\/\/\S+/g, "[url-redacted]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [token-redacted]")
    .replace(/\b\d{8,}\b/g, "[number-redacted]")
    .replace(/[A-Za-z0-9_-]{24,}/g, "[token-redacted]")
    .slice(0, 220);
}

function stageFailure(stage: string, startedAt: number, error: unknown, fallbackTimeoutMs?: number) {
  const elapsedMs = Date.now() - startedAt;
  const isGatewayError = error instanceof OpenWaGatewayError;
  const timeout = isGatewayError && error.code === "openwa_timeout";
  const code = stage === "list_chats" && timeout ? "provider_list_chats_timeout" : isGatewayError ? error.code : "sync_stage_failed";
  const message = code === "provider_list_chats_timeout"
    ? "O gateway excedeu o tempo permitido ao listar os chats."
    : safeDiagnosticError(error instanceof Error ? error.message : String(error));
  return {
    failed_stage: stage,
    code,
    message,
    elapsed_ms: elapsedMs,
    timeout_ms: isGatewayError ? error.timeoutMs || fallbackTimeoutMs || null : fallbackTimeoutMs || null,
    attempt: isGatewayError ? error.attempts : 1,
    retryable: isGatewayError ? error.retryable : false,
    upstream_status: isGatewayError ? error.status || null : null,
    retry_skipped_reason: isGatewayError ? error.retrySkippedReason || null : null,
    error: safeDiagnosticError(error instanceof Error ? error.message : String(error)),
  };
}

function throwStage(stage: string, startedAt: number, error: unknown, timeoutMs?: number): never {
  const diagnostics = stageFailure(stage, startedAt, error, timeoutMs);
  throw new SyncStageError(String(diagnostics.message || "Falha na sincronizacao."), diagnostics);
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function normalizeChatIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(String).map((item) => item.trim()).filter(Boolean))).slice(0, MAX_SELECTED_CHAT_IDS);
}

function onlyDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function inferIdentityType(externalId: string): IdentityType {
  if (externalId.endsWith("@lid")) return "lid";
  return "phone";
}

function normalizeExternalContactId(message: ProviderSyncedMessage, chatId: string) {
  const phone = onlyDigits(message.phone || (message.direction === "outbound" ? message.to : message.from) || chatId);
  if (phone) return { externalId: phone, identityType: "phone" as IdentityType };
  return { externalId: chatId, identityType: inferIdentityType(chatId) };
}

function timestampToIso(timestamp?: number) {
  if (!timestamp) return null;
  const millis = Number(timestamp) > 10_000_000_000 ? Number(timestamp) : Number(timestamp) * 1000;
  if (!Number.isFinite(millis)) return null;
  return new Date(millis).toISOString();
}

function messageTime(message: ProviderSyncedMessage) {
  return timestampToIso(message.timestamp) || nowIso();
}

function hashFallbackMessageId(message: ProviderSyncedMessage, conversationId: string) {
  const basis = [
    conversationId,
    message.direction || "inbound",
    String(message.body || ""),
    timestampToIso(message.timestamp)?.slice(0, 16) || "no-ts",
  ].join("|");
  return `sync_${createHash("sha256").update(basis).digest("hex").slice(0, 32)}`;
}

function resolveMessageType(message: ProviderSyncedMessage) {
  return message.mediaType || message.type || (message.hasMedia ? "media" : "text");
}

function resolveMessageBody(message: ProviderSyncedMessage) {
  const text = String(message.body || "").trim();
  if (text) return text;

  const type = resolveMessageType(message);
  const mimeType = message.mimeType || message.media?.mimetype || "";
  if (type === "sticker") return "[Figurinha recebida]";
  if (type === "image") return "[Imagem recebida]";
  if (type === "audio" || type === "ptt") return "[Audio recebido]";
  if (type === "video") return "[Video recebido]";
  if (type === "document") return "[Documento recebido]";
  if (message.hasMedia) return mimeType ? `[Midia recebida: ${mimeType}]` : "[Midia recebida]";
  return null;
}

function resolveMediaSummary(message: ProviderSyncedMessage) {
  if (!message.hasMedia) return null;
  const type = resolveMessageType(message);
  const mimeType = message.mimeType || message.media?.mimetype || "";
  const label = type === "sticker" ? "Figurinha" : type || "Midia";
  return mimeType ? `${label} (${mimeType})` : label;
}

function sanitizeRawPayload(message: ProviderSyncedMessage) {
  const payload = JSON.parse(JSON.stringify(message)) as Record<string, unknown>;
  const media = payload.media as Record<string, unknown> | undefined;
  if (media && typeof media.data === "string") {
    media.dataLength = media.data.length;
    delete media.data;
    media.dataOmitted = true;
  }
  return payload;
}

function isGroupChat(chat: ProviderChatSummary | ProviderSyncedMessage) {
  return Boolean(chat.isGroup) || String("chatId" in chat ? chat.chatId : chat.id).endsWith("@g.us");
}

function isSupportedOpenWaProvider(provider?: string | null) {
  return !provider || provider === "whatsapp_web" || provider === "openwa";
}

function runLimits(mode: WhatsappSyncMode, chatLimit: number, messageLimit: number) {
  if (mode === "bootstrap" || mode === "reconciliation") {
    return {
      chatLimit: clampInt(chatLimit, BOOTSTRAP_CHAT_LIMIT, 1, BOOTSTRAP_CHAT_LIMIT),
      messageLimit: clampInt(messageLimit, BOOTSTRAP_MESSAGE_LIMIT, 1, BOOTSTRAP_MESSAGE_LIMIT),
    };
  }
  return {
    chatLimit: clampInt(chatLimit, DEFAULT_CHAT_LIMIT, 1, BOOTSTRAP_CHAT_LIMIT),
    messageLimit: clampInt(messageLimit, DEFAULT_MESSAGE_LIMIT, 1, BOOTSTRAP_MESSAGE_LIMIT),
  };
}

function modeDedupeWindowMs(mode: WhatsappSyncMode) {
  if (mode === "reconciliation") return RECONCILIATION_INTERVAL_MS;
  if (mode === "manual_diagnostic") return 0;
  return CONNECTED_EVENT_DEDUPE_MS;
}

function cursorOffsetFromMetadata(metadata?: Record<string, unknown> | null) {
  const parsed = Number(metadata?.cursorOffset ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(Math.trunc(parsed), 0);
}

function nextReconciliationAt(idle = false) {
  const interval = idle ? IDLE_RECONCILIATION_INTERVAL_MS : RECONCILIATION_INTERVAL_MS;
  return new Date(Date.now() + interval).toISOString();
}

function isFinalSuccessfulStatus(status: WhatsappSyncRunStatus | string | null | undefined) {
  return status === "completed" || status === "partial" || status === "skipped";
}

export async function enqueueWhatsappSync(db: Db, input: {
  tenantId: string;
  organizationId: string;
  channelId: string;
  sessionId?: string | null;
  mode: WhatsappSyncMode;
  triggerSource: string;
  requestedByAppUserId?: string | null;
  selectedChatIds?: string[];
  chatLimit?: number;
  messageLimit?: number;
  metadata?: Record<string, unknown>;
}) {
  const selectedChatIds = normalizeChatIds(input.selectedChatIds || []);
  const limits = runLimits(input.mode, input.chatLimit ?? DEFAULT_CHAT_LIMIT, input.messageLimit ?? DEFAULT_MESSAGE_LIMIT);
  const now = nowIso();

  const { data: existingState, error: stateLookupError } = await db
    .from("whatsapp_channel_sync_state")
    .select("id, sync_status")
    .eq("channel_id", input.channelId)
    .maybeSingle();
  if (stateLookupError) throw stateLookupError;

  let stateId = existingState?.id as string | undefined;
  if (!stateId) {
    const { data: createdState, error: createStateError } = await db
      .from("whatsapp_channel_sync_state")
      .insert({
        tenant_id: input.tenantId,
        organization_id: input.organizationId,
        channel_id: input.channelId,
        provider: "whatsapp_web",
        session_id: input.sessionId || null,
        sync_status: "idle",
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();
    if (createStateError) {
      const { data: racedState } = await db.from("whatsapp_channel_sync_state").select("id").eq("channel_id", input.channelId).maybeSingle();
      if (!racedState?.id) throw createStateError;
      stateId = racedState.id;
    } else {
      stateId = createdState.id;
    }
  }

  const { data: activeRun, error: activeRunError } = await db
    .from("whatsapp_sync_runs")
    .select("id, status, mode, created_at")
    .eq("channel_id", input.channelId)
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (activeRunError) throw activeRunError;

  if (activeRun?.id) {
    await db.from("whatsapp_channel_sync_state").update({
      sync_status: activeRun.status === "running" ? "syncing" : "queued",
      last_mode: activeRun.mode,
      last_queued_at: now,
      session_id: input.sessionId || null,
      updated_at: now,
    }).eq("id", stateId);
    return { created: false, runId: activeRun.id as string, status: activeRun.status as WhatsappSyncRunStatus };
  }

  const dedupeWindowMs = modeDedupeWindowMs(input.mode);
  if (dedupeWindowMs > 0) {
    const recentThreshold = new Date(Date.now() - dedupeWindowMs).toISOString();
    const { data: recentRun, error: recentRunError } = await db
      .from("whatsapp_sync_runs")
      .select("id, status")
      .eq("channel_id", input.channelId)
      .eq("mode", input.mode)
      .gte("created_at", recentThreshold)
      .in("status", ["queued", "running", "completed", "partial", "skipped"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recentRunError) throw recentRunError;
    if (recentRun?.id) {
      return { created: false, runId: recentRun.id as string, status: "skipped" as const };
    }
  }

  const { data: run, error: runError } = await db
    .from("whatsapp_sync_runs")
    .insert({
      tenant_id: input.tenantId,
      organization_id: input.organizationId,
      channel_id: input.channelId,
      sync_state_id: stateId,
      mode: input.mode,
      trigger_source: input.triggerSource,
      requested_by_app_user_id: input.requestedByAppUserId || null,
      status: "queued",
      selected_chat_ids: selectedChatIds,
      chat_limit: limits.chatLimit,
      message_limit: limits.messageLimit,
      scheduled_at: now,
      metadata: input.metadata || {},
      created_at: now,
      updated_at: now,
    })
    .select("id, status")
    .single();

  if (runError) {
    const { data: racedRun } = await db
      .from("whatsapp_sync_runs")
      .select("id, status")
      .eq("channel_id", input.channelId)
      .in("status", ["queued", "running"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!racedRun?.id) throw runError;
    return { created: false, runId: racedRun.id as string, status: racedRun.status as WhatsappSyncRunStatus };
  }

  await db.from("whatsapp_channel_sync_state").update({
    sync_status: "queued",
    last_mode: input.mode,
    last_run_id: run.id,
    last_queued_at: now,
    session_id: input.sessionId || null,
    updated_at: now,
  }).eq("id", stateId);

  return { created: true, runId: run.id as string, status: run.status as WhatsappSyncRunStatus };
}

export async function enqueueWhatsappSyncForSession(db: Db, input: {
  sessionId: string;
  mode: WhatsappSyncMode;
  triggerSource: string;
  metadata?: Record<string, unknown>;
}) {
  const { data: channel, error } = await db
    .from("channels")
    .select("id, tenant_id, organization_id, session_id, provider")
    .eq("session_id", input.sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!channel?.id) return { created: false, runId: null, status: "skipped" as const, reason: "channel_not_found" };
  if (!isSupportedOpenWaProvider(channel.provider)) return { created: false, runId: null, status: "skipped" as const, reason: "provider_not_supported" };

  return enqueueWhatsappSync(db, {
    tenantId: channel.tenant_id,
    organizationId: channel.organization_id,
    channelId: channel.id,
    sessionId: channel.session_id,
    mode: input.mode,
    triggerSource: input.triggerSource,
    metadata: input.metadata,
  });
}

export async function enqueueWhatsappSyncForConnectedSession(db: Db, input: {
  sessionId: string;
  triggerSource: string;
  metadata?: Record<string, unknown>;
}) {
  const { data: channel, error } = await db
    .from("channels")
    .select("id, tenant_id, organization_id, session_id, provider")
    .eq("session_id", input.sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!channel?.id) return { created: false, runId: null, status: "skipped" as const, reason: "channel_not_found" };
  if (!isSupportedOpenWaProvider(channel.provider)) return { created: false, runId: null, status: "skipped" as const, reason: "provider_not_supported" };
  if (channel.organization_id !== LIPS_ORGANIZATION_ID) return { created: false, runId: null, status: "skipped" as const, reason: "non_lips_channel" };

  const { data: state, error: stateError } = await db
    .from("whatsapp_channel_sync_state")
    .select("bootstrap_completed_at")
    .eq("channel_id", channel.id)
    .maybeSingle();
  if (stateError) throw stateError;

  return enqueueWhatsappSync(db, {
    tenantId: channel.tenant_id,
    organizationId: channel.organization_id,
    channelId: channel.id,
    sessionId: channel.session_id,
    mode: state?.bootstrap_completed_at ? "incremental" : "bootstrap",
    triggerSource: input.triggerSource,
    metadata: input.metadata,
  });
}

async function claimNextRun(db: Db, channelId?: string | null): Promise<SyncRunRow | null> {
  await recoverAbandonedLocks(db);

  let query = db
    .from("whatsapp_sync_runs")
    .select("id, tenant_id, organization_id, channel_id, sync_state_id, mode, status, selected_chat_ids, chat_limit, message_limit, metadata")
    .eq("status", "queued")
    .lte("scheduled_at", nowIso());
  if (channelId) query = query.eq("channel_id", channelId);

  const { data: queued, error } = await query
    .order("scheduled_at", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!queued?.id) return null;

  const lockId = `sync_${process.pid}_${Date.now()}`;
  const startedAt = nowIso();
  const lockExpiresAt = new Date(Date.now() + LOCK_TIMEOUT_MS).toISOString();
  const { data: claimed, error: claimError } = await db
    .from("whatsapp_sync_runs")
    .update({ status: "running", started_at: startedAt, lock_id: lockId, locked_at: startedAt, lock_expires_at: lockExpiresAt, updated_at: startedAt })
    .eq("id", queued.id)
    .eq("status", "queued")
    .select("id, tenant_id, organization_id, channel_id, sync_state_id, mode, status, selected_chat_ids, chat_limit, message_limit, metadata")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed?.id) return null;

  await db.from("whatsapp_channel_sync_state").update({
    sync_status: "syncing",
    last_started_at: startedAt,
    locked_at: startedAt,
    lock_expires_at: lockExpiresAt,
    locked_by: lockId,
    updated_at: startedAt,
  }).eq("channel_id", claimed.channel_id);

  return claimed as SyncRunRow;
}

export async function recoverAbandonedLocks(db: Db, lockTimeoutMs = LOCK_TIMEOUT_MS) {
  const cutoff = new Date(Date.now() - lockTimeoutMs).toISOString();
  const recoveredAt = nowIso();

  const { data: expiredRuns, error } = await db
    .from("whatsapp_sync_runs")
    .select("id, channel_id, diagnostics")
    .eq("status", "running")
    .lt("locked_at", cutoff)
    .limit(20);
  if (error) throw error;

  for (const run of expiredRuns || []) {
    await db
      .from("whatsapp_sync_runs")
      .update({
        status: "queued",
        lock_id: null,
        locked_at: null,
        lock_expires_at: null,
        diagnostics: {
          ...(run.diagnostics && typeof run.diagnostics === "object" ? run.diagnostics : {}),
          recoveredLockAt: recoveredAt,
        },
        updated_at: recoveredAt,
      })
      .eq("id", run.id)
      .eq("status", "running");

    await db
      .from("whatsapp_channel_sync_state")
      .update({
        sync_status: "queued",
        locked_at: null,
        lock_expires_at: null,
        locked_by: null,
        updated_at: recoveredAt,
      })
      .eq("channel_id", run.channel_id);
  }

  return { recovered: expiredRuns?.length || 0 };
}

async function getChannel(db: Db, channelId: string): Promise<ChannelForSync | null> {
  const { data, error } = await db
    .from("channels")
    .select("id, tenant_id, organization_id, session_id, provider")
    .eq("id", channelId)
    .maybeSingle();
  if (error) throw error;
  return data as ChannelForSync | null;
}

async function resolveContact(db: Db, channel: ChannelForSync, message: ProviderSyncedMessage, chat: ProviderChatSummary) {
  if (isGroupChat(chat) || isGroupChat(message)) return null;
  const identity = normalizeExternalContactId(message, chat.id);
  if (!identity.externalId) return null;
  return resolveOrCreateContactByIdentity(db, {
    tenantId: channel.tenant_id,
    organizationId: channel.organization_id,
    channelId: channel.id,
    provider: "whatsapp_web",
    identityType: identity.identityType,
    externalId: identity.externalId,
    displayName: message.contactName || message.chatName || chat.name || identity.externalId,
  });
}

async function upsertConversation(db: Db, channel: ChannelForSync, chat: ProviderChatSummary, latestMessage: ProviderSyncedMessage | null, contactId: string | null) {
  const latestAt = latestMessage ? messageTime(latestMessage) : chat.lastMessageAt || nowIso();
  const latestDirection = latestMessage?.direction || null;
  const now = nowIso();
  const { data: existing, error: lookupError } = await db
    .from("whatsapp_conversations")
    .select("id")
    .eq("channel_id", channel.id)
    .eq("external_chat_id", chat.id)
    .maybeSingle();
  if (lookupError) throw lookupError;

  const basePatch = {
    name: chat.name || latestMessage?.chatName || latestMessage?.contactName || chat.id,
    is_group: isGroupChat(chat),
    unread_count: chat.unreadCount || 0,
    last_message_at: latestAt,
    last_message_direction: latestDirection,
    ...(latestDirection === "inbound" ? { last_inbound_at: latestAt, last_customer_message_at: latestAt } : {}),
    ...(latestDirection === "outbound" ? { last_outbound_at: latestAt } : {}),
    ...(contactId ? { contact_id: contactId } : {}),
    updated_at: now,
  };

  if (existing?.id) {
    const { error } = await db.from("whatsapp_conversations").update(basePatch).eq("id", existing.id);
    if (error) throw error;
    return existing.id as string;
  }

  const shouldQueue = !isGroupChat(chat) && latestDirection === "inbound";
  const { data: created, error } = await db
    .from("whatsapp_conversations")
    .insert({
      tenant_id: channel.tenant_id,
      organization_id: channel.organization_id,
      channel_id: channel.id,
      provider: "whatsapp_web",
      external_chat_id: chat.id,
      status: "open",
      ...basePatch,
      ...(shouldQueue ? {
        queue_status: "waiting",
        requires_human: true,
        pending_reason: "sync_inbound_message",
        queue_entered_at: now,
        sla_started_at: now,
        sla_status: "on_time",
      } : {}),
      created_at: now,
    })
    .select("id")
    .single();
  if (error) throw error;
  return created.id as string;
}

async function upsertMessage(db: Db, channel: ChannelForSync, message: ProviderSyncedMessage, conversationId: string, contactId: string | null) {
  const externalMessageId = String(message.id || "").trim() || hashFallbackMessageId(message, conversationId);
  const createdAt = messageTime(message);
  const payload = {
    tenant_id: channel.tenant_id,
    organization_id: channel.organization_id,
    channel_id: channel.id,
    provider: "whatsapp_web",
    external_message_id: externalMessageId,
    conversation_id: conversationId,
    contact_id: contactId,
    direction: message.direction || "inbound",
    delivery_status: message.direction === "outbound" ? "sent" : "delivered",
    from_id: message.from || null,
    to_id: message.to || null,
    body: resolveMessageBody(message),
    message_type: resolveMessageType(message),
    raw_payload: sanitizeRawPayload(message),
    has_media: Boolean(message.hasMedia),
    media_count: message.hasMedia ? 1 : 0,
    media_summary: resolveMediaSummary(message),
    created_at: createdAt,
  };

  const { data: existing, error: lookupError } = await db
    .from("whatsapp_messages")
    .select("id")
    .eq("channel_id", channel.id)
    .eq("external_message_id", externalMessageId)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existing?.id) {
    const { error } = await db.from("whatsapp_messages").update(payload).eq("id", existing.id);
    if (error) throw error;
    return "updated" as const;
  }

  const { error } = await db.from("whatsapp_messages").insert(payload);
  if (error) throw error;
  return "inserted" as const;
}

async function syncChat(db: Db, channel: ChannelForSync, chat: ProviderChatSummary, messages: ProviderSyncedMessage[], counters: SyncCounters) {
  const sortedMessages = [...messages].sort((a, b) => new Date(messageTime(a)).getTime() - new Date(messageTime(b)).getTime());
  const latestMessage = sortedMessages.at(-1) || null;
  const contactId = latestMessage ? await resolveContact(db, channel, latestMessage, chat) : null;
  counters.diagnostics.stage = "persist_conversation";
  const conversationId = await upsertConversation(db, channel, chat, latestMessage, contactId);

  for (const message of sortedMessages) {
    if (isGroupChat(message)) {
      counters.chatsSkipped += 1;
      continue;
    }
    counters.messagesScanned += 1;
    const messageContactId = await resolveContact(db, channel, message, chat) || contactId;
    counters.diagnostics.stage = "persist_messages";
    const result = await upsertMessage(db, channel, message, conversationId, messageContactId);
    if (result === "inserted") counters.messagesSaved += 1;
    else counters.messagesUpdated += 1;

    const createdAt = messageTime(message);
    if (!counters.latestMessageAt || new Date(createdAt) > new Date(counters.latestMessageAt)) counters.latestMessageAt = createdAt;
  }
}

async function executeRun(db: Db, run: SyncRunRow, providerFactory: SyncProviderFactory): Promise<SyncCounters> {
  let stageStartedAt = Date.now();
  let stage = "resolve_channel";
  const channel = await getChannel(db, run.channel_id);
  if (!channel?.session_id) throw new Error("Canal sem session_id para sincronizacao.");
  if (!isSupportedOpenWaProvider(channel.provider)) throw new Error("Canal nao e OpenWA/WhatsApp Web.");

  stage = "resolve_gateway";
  const provider = providerFactory(channel.session_id);

  const counters: SyncCounters = {
    chatsScanned: 0,
    chatsSynced: 0,
    chatsSkipped: 0,
    messagesScanned: 0,
    messagesSaved: 0,
    messagesUpdated: 0,
    errors: [],
    latestMessageAt: null,
    hasMore: false,
    nextCursorOffset: null,
    providerStatus: null,
    skippedReason: null,
    diagnostics: { stage: "resolve_gateway", stages: [] },
  };

  stage = "provider_status";
  stageStartedAt = Date.now();
  let providerStatus: string;
  try {
    providerStatus = await provider.getConnectionStatus();
  } catch (error) {
    throwStage(stage, stageStartedAt, error, PROVIDER_TIMEOUT_MS.status);
  }
  counters.providerStatus = providerStatus;
  if (!isOpenWaConnected(providerStatus)) {
    counters.skippedReason = "whatsapp_disconnected";
    return counters;
  }

  const limits = runLimits(run.mode, run.chat_limit, run.message_limit);
  const selectedChatIds = normalizeChatIds(run.selected_chat_ids || []);
  const cursorOffset = selectedChatIds.length > 0 ? 0 : cursorOffsetFromMetadata(run.metadata);
  const cutoffMs = run.mode === "manual_diagnostic" || run.mode === "incremental" ? null : Date.now() - THIRTY_DAYS_MS;
  const incrementalCheckpoint = run.mode === "incremental" ? await getIncrementalCheckpoint(db, run) : null;
  stage = "list_chats";
  stageStartedAt = Date.now();
  let allChats: ProviderChatSummary[];
  try {
    allChats = await provider.listChats({ limit: limits.chatLimit, offset: cursorOffset });
  } catch (error) {
    throwStage(stage, stageStartedAt, error, PROVIDER_TIMEOUT_MS.listChats);
  }
  const providerLikelyAppliedLimit = allChats.length <= limits.chatLimit;
  counters.diagnostics.listChats = { requestedLimit: limits.chatLimit, requestedOffset: cursorOffset, returned: allChats.length, paginationLikelyApplied: providerLikelyAppliedLimit, timeoutMs: PROVIDER_TIMEOUT_MS.listChats };
  stage = "filter_chats";
  counters.diagnostics.stage = stage;
  const checkpointMs = incrementalCheckpoint ? new Date(incrementalCheckpoint).getTime() : null;
  const candidateChats = checkpointMs && selectedChatIds.length === 0
    ? allChats.filter((chat) => !chat.lastMessageAt || new Date(chat.lastMessageAt).getTime() >= checkpointMs)
    : allChats;
  const sortedChats = [...candidateChats].sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
  const chats = selectedChatIds.length > 0
    ? sortedChats.filter((chat) => selectedChatIds.includes(chat.id))
    : providerLikelyAppliedLimit
      ? sortedChats.slice(0, limits.chatLimit)
      : sortedChats.slice(cursorOffset, cursorOffset + limits.chatLimit);
  counters.hasMore = selectedChatIds.length === 0 && (providerLikelyAppliedLimit ? allChats.length >= limits.chatLimit : sortedChats.length > cursorOffset + chats.length);
  counters.nextCursorOffset = counters.hasMore ? cursorOffset + chats.length : null;

  for (const chat of chats) {
    counters.chatsScanned += 1;
    if (isGroupChat(chat)) {
      counters.chatsSkipped += 1;
      continue;
    }

    try {
      counters.diagnostics.stage = "list_messages";
      const rawMessages = await provider.listChatMessages(chat.id, limits.messageLimit);
      const messages = rawMessages.filter((message) => {
        const createdMs = new Date(messageTime(message)).getTime();
        if (cutoffMs && createdMs < cutoffMs) return false;
        if (checkpointMs && createdMs <= checkpointMs) return false;
        return true;
      });
      await syncChat(db, channel, chat, messages, counters);
      counters.chatsSynced += 1;
    } catch (error) {
      counters.errors.push({ chatId: chat.id, step: String(counters.diagnostics.stage || "syncChat"), error: safeDiagnosticError(error instanceof Error ? error.message : String(error)) });
    }
  }

  counters.diagnostics.stage = "finalize";
  return counters;
}

async function getIncrementalCheckpoint(db: Db, run: SyncRunRow) {
  const { data, error } = await db
    .from("whatsapp_channel_sync_state")
    .select("last_message_checkpoint, last_success_at")
    .eq("channel_id", run.channel_id)
    .maybeSingle();
  if (error) throw error;
  const messageCheckpoint = typeof data?.last_message_checkpoint === "string" ? data.last_message_checkpoint : null;
  const successCheckpoint = typeof data?.last_success_at === "string" ? data.last_success_at : null;
  return messageCheckpoint || successCheckpoint;
}

async function completeRun(db: Db, run: SyncRunRow, counters: SyncCounters) {
  const completedAt = nowIso();
  const status: WhatsappSyncRunStatus = counters.skippedReason
    ? "skipped"
    : counters.errors.length > 0
      ? (counters.chatsSynced > 0 ? "partial" : "failed")
      : counters.hasMore
        ? "partial"
        : "completed";
  const errorMessage = counters.errors[0]?.error || null;
  await db.from("whatsapp_sync_runs").update({
    status,
    completed_at: completedAt,
    chats_scanned: counters.chatsScanned,
    chats_synced: counters.chatsSynced,
    chats_skipped: counters.chatsSkipped,
    messages_scanned: counters.messagesScanned,
    messages_saved: counters.messagesSaved,
    messages_updated: counters.messagesUpdated,
    errors_count: counters.errors.length,
    error_message: errorMessage || counters.skippedReason,
    diagnostics: { ...counters.diagnostics, errors: counters.errors.slice(0, 20), skippedReason: counters.skippedReason, hasMore: counters.hasMore },
    lock_id: null,
    locked_at: null,
    lock_expires_at: null,
    updated_at: completedAt,
  }).eq("id", run.id);

  let continuationRunId: string | null = null;
  if (counters.hasMore && counters.nextCursorOffset !== null && status === "partial") {
    const { data: continuation, error: continuationError } = await db
      .from("whatsapp_sync_runs")
      .insert({
        tenant_id: run.tenant_id,
        organization_id: run.organization_id,
        channel_id: run.channel_id,
        sync_state_id: run.sync_state_id,
        mode: run.mode,
        trigger_source: "sync_continuation",
        status: "queued",
        selected_chat_ids: [],
        chat_limit: run.chat_limit,
        message_limit: run.message_limit,
        scheduled_at: completedAt,
        metadata: { ...(run.metadata || {}), cursorOffset: counters.nextCursorOffset, continuedFromRunId: run.id },
        created_at: completedAt,
        updated_at: completedAt,
      })
      .select("id")
      .single();
    if (!continuationError && continuation?.id) continuationRunId = continuation.id;
  }

  await db.from("whatsapp_channel_sync_state").update({
    sync_status: continuationRunId ? "queued" : status === "completed" ? "ready" : status === "partial" ? "degraded" : status === "skipped" ? "degraded" : "failed",
    last_run_id: continuationRunId || run.id,
    last_completed_at: completedAt,
    last_success_at: isFinalSuccessfulStatus(status) && !counters.skippedReason ? completedAt : undefined,
    last_error_at: status === "failed" || status === "partial" ? completedAt : null,
    last_error: errorMessage || counters.skippedReason,
    bootstrap_completed_at: run.mode === "bootstrap" && status !== "failed" && !continuationRunId && !counters.skippedReason ? completedAt : undefined,
    last_message_checkpoint: counters.latestMessageAt || undefined,
    last_chat_checkpoint: completedAt,
    last_provider_status: counters.providerStatus,
    last_provider_seen_at: counters.providerStatus ? completedAt : undefined,
    next_reconciliation_at: nextReconciliationAt(Boolean(counters.skippedReason)),
    locked_at: null,
    lock_expires_at: null,
    locked_by: null,
    stats: {
      chatsScanned: counters.chatsScanned,
      chatsSynced: counters.chatsSynced,
      chatsSkipped: counters.chatsSkipped,
      messagesScanned: counters.messagesScanned,
      messagesSaved: counters.messagesSaved,
      messagesUpdated: counters.messagesUpdated,
      errorsCount: counters.errors.length,
    },
    updated_at: completedAt,
  }).eq("channel_id", run.channel_id);

  return { runId: run.id, status, continuationRunId, ...counters };
}

async function failRun(db: Db, run: SyncRunRow, error: unknown) {
  const completedAt = nowIso();
  const message = error instanceof Error ? error.message : String(error);
  const diagnostics = error instanceof SyncStageError
    ? { ...error.diagnostics, errors: [{ step: error.diagnostics.failed_stage || "executeRun", error: safeDiagnosticError(message) }] }
    : { failed_stage: "executeRun", errors: [{ step: "executeRun", error: safeDiagnosticError(message) }] };
  await db.from("whatsapp_sync_runs").update({
    status: "failed",
    completed_at: completedAt,
    errors_count: 1,
    error_message: safeDiagnosticError(message),
    diagnostics,
    lock_id: null,
    locked_at: null,
    lock_expires_at: null,
    updated_at: completedAt,
  }).eq("id", run.id);
  await db.from("whatsapp_channel_sync_state").update({
    sync_status: "failed",
    last_completed_at: completedAt,
    last_error_at: completedAt,
    last_error: safeDiagnosticError(message),
    locked_at: null,
    lock_expires_at: null,
    locked_by: null,
    updated_at: completedAt,
  }).eq("channel_id", run.channel_id);
  return { runId: run.id, status: "failed" as const, error: safeDiagnosticError(message), diagnostics };
}

export async function processQueuedWhatsappSyncRuns(db: Db, maxRuns = 1, providerFactory: SyncProviderFactory = missingProviderFactory) {
  const limit = clampInt(maxRuns, 1, 1, 5);
  const reconciliation = await enqueueDueWhatsappReconciliations(db, providerFactory);
  const processed = [];

  for (let index = 0; index < limit; index += 1) {
    const run = await claimNextRun(db);
    if (!run) break;
    try {
      const counters = await executeRun(db, run, providerFactory);
      processed.push(await completeRun(db, run, counters));
    } catch (error) {
      processed.push(await failRun(db, run, error));
    }
  }

  return { processedRuns: processed.length, reconciliationsQueued: reconciliation.queued, runs: processed };
}

export async function processQueuedWhatsappSyncRunsForChannel(db: Db, channelId: string, maxRuns = 1, providerFactory: SyncProviderFactory = missingProviderFactory) {
  const limit = clampInt(maxRuns, 1, 1, 5);
  const processed = [];

  for (let index = 0; index < limit; index += 1) {
    const run = await claimNextRun(db, channelId);
    if (!run) break;
    try {
      const counters = await executeRun(db, run, providerFactory);
      processed.push(await completeRun(db, run, counters));
    } catch (error) {
      processed.push(await failRun(db, run, error));
    }
  }

  return { processedRuns: processed.length, reconciliationsQueued: 0, runs: processed };
}

export async function enqueueDueWhatsappReconciliations(db: Db, providerFactory: SyncProviderFactory = missingProviderFactory) {
  const now = nowIso();
  const staleBefore = new Date(Date.now() - RECONCILIATION_INTERVAL_MS).toISOString();
  const { data: channels, error } = await db
    .from("channels")
    .select("id, tenant_id, organization_id, session_id, provider, is_active, active")
    .eq("organization_id", LIPS_ORGANIZATION_ID)
    .in("provider", ["whatsapp_web", "openwa"])
    .not("session_id", "is", null);
  if (error) throw error;

  let queued = 0;
  for (const channel of channels || []) {
    if (channel.is_active === false || channel.active === false || !channel.session_id) continue;

    const { data: activeRun, error: activeRunError } = await db
      .from("whatsapp_sync_runs")
      .select("id")
      .eq("channel_id", channel.id)
      .in("status", ["queued", "running"])
      .limit(1)
      .maybeSingle();
    if (activeRunError) throw activeRunError;
    if (activeRun?.id) continue;

    const { data: state, error: stateError } = await db
      .from("whatsapp_channel_sync_state")
      .select("last_success_at, next_reconciliation_at")
      .eq("channel_id", channel.id)
      .maybeSingle();
    if (stateError) throw stateError;

    const nextDue = state?.next_reconciliation_at ? new Date(state.next_reconciliation_at).getTime() <= Date.now() : true;
    const stale = !state?.last_success_at || state.last_success_at < staleBefore;
    if (!nextDue && !stale) continue;

    const provider = providerFactory(channel.session_id);
    const providerStatus = await provider.getConnectionStatus();
    if (!isOpenWaConnected(providerStatus)) {
      await ensureSyncStateForChannel(db, {
        tenantId: channel.tenant_id,
        organizationId: channel.organization_id,
        channelId: channel.id,
        sessionId: channel.session_id,
        syncStatus: "degraded",
        providerStatus,
        nextReconciliationAt: nextReconciliationAt(true),
      });
      continue;
    }

    const result = await enqueueWhatsappSync(db, {
      tenantId: channel.tenant_id,
      organizationId: channel.organization_id,
      channelId: channel.id,
      sessionId: channel.session_id,
      mode: "reconciliation",
      triggerSource: "worker_reconciliation",
      metadata: { enqueuedAt: now },
    });
    if (result.created) queued += 1;
  }

  return { queued };
}

async function ensureSyncStateForChannel(db: Db, input: {
  tenantId: string;
  organizationId: string;
  channelId: string;
  sessionId: string;
  syncStatus: "idle" | "queued" | "syncing" | "ready" | "degraded" | "failed" | "disabled";
  providerStatus?: string | null;
  nextReconciliationAt?: string | null;
}) {
  const now = nowIso();
  const { data: existing, error: lookupError } = await db
    .from("whatsapp_channel_sync_state")
    .select("id")
    .eq("channel_id", input.channelId)
    .maybeSingle();
  if (lookupError) throw lookupError;

  const payload = {
    tenant_id: input.tenantId,
    organization_id: input.organizationId,
    channel_id: input.channelId,
    provider: "whatsapp_web",
    session_id: input.sessionId,
    sync_status: input.syncStatus,
    last_provider_status: input.providerStatus || null,
    last_provider_seen_at: input.providerStatus ? now : null,
    next_reconciliation_at: input.nextReconciliationAt || null,
    updated_at: now,
  };

  if (existing?.id) {
    await db.from("whatsapp_channel_sync_state").update(payload).eq("id", existing.id);
    return existing.id as string;
  }

  const { data: created, error: createError } = await db
    .from("whatsapp_channel_sync_state")
    .insert({ ...payload, created_at: now })
    .select("id")
    .single();
  if (createError) throw createError;
  return created.id as string;
}

export async function getWhatsappSyncStatus(db: Db, input: { tenantId: string; organizationId: string; channelId?: string | null }) {
  let query = db
    .from("whatsapp_channel_sync_state")
    .select("sync_status, last_queued_at, last_started_at, last_completed_at, last_success_at, last_chat_checkpoint, last_message_checkpoint, last_provider_status, last_provider_seen_at, updated_at")
    .eq("tenant_id", input.tenantId)
    .eq("organization_id", input.organizationId)
    .order("updated_at", { ascending: false });

  if (input.channelId) query = query.eq("channel_id", input.channelId);

  const { data, error } = await query.limit(input.channelId ? 1 : 20);
  if (error) throw error;
  return (data || []).map(toPublicSyncStatus);
}

function toPublicSyncStatus(row: Record<string, unknown>) {
  const rawStatus = String(row.sync_status || "idle");
  const connected = isOpenWaConnected(String(row.last_provider_status || ""));
  const lastSuccessAt = typeof row.last_success_at === "string" ? row.last_success_at : null;
  const lastEventAt = typeof row.updated_at === "string" ? row.updated_at : null;
  const isStale = !lastSuccessAt || Date.now() - new Date(lastSuccessAt).getTime() > RECONCILIATION_INTERVAL_MS;
  const status = !connected && rawStatus !== "syncing" && rawStatus !== "queued"
    ? "disconnected"
    : rawStatus === "syncing" || rawStatus === "queued"
      ? "syncing"
      : isStale
        ? "stale"
        : "ready";

  return {
    status,
    connected,
    lastSuccessAt,
    lastEventAt,
    lastChatSyncAt: typeof row.last_chat_checkpoint === "string" ? row.last_chat_checkpoint : null,
    lastMessageSyncAt: typeof row.last_message_checkpoint === "string" ? row.last_message_checkpoint : null,
    isStale,
    label: status === "syncing"
      ? "Sincronizando"
      : status === "stale"
        ? "Atualização atrasada"
        : status === "disconnected"
          ? "WhatsApp desconectado"
          : "Atualizado agora",
  };
}

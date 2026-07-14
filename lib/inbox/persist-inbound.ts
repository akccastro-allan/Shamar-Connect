/**
 * Marco 1 — Ingestão de mensagem recebida, presa ao canal.
 *
 * Fluxo único usado pelos webhooks (Evolution, Meta Cloud, Instagram/Messenger):
 *   1. canal já resolvido (resolveChannelFromWebhook) — sem canal não chega aqui;
 *   2. idempotência por (channel_id, provider, external_event_id);
 *   3. contato por identidade de canal (IDs sociais nunca em crm_contacts.phone);
 *   4. find-or-create de conversa e mensagem com channel_id.
 *
 * Tudo find-or-create manual (índices únicos parciais não casam com onConflict).
 */

import { createHash } from "crypto";
import type { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import type { ChannelResolution } from "@/lib/inbox/resolve-channel";
import { resolveOrCreateContactByIdentity, type IdentityType } from "@/lib/inbox/contacts";
import { recordQueueEvent } from "@/lib/queues/lips-queue";
import { reopenAssignment, type QueueStatus } from "@/lib/queues/lips-routing";

type Db = ReturnType<typeof createSupabaseWriteClient>;

export function payloadHash(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

/**
 * Webhook sem canal reconhecido: registra o evento para auditoria/diagnóstico,
 * SEM criar contato/conversa/mensagem e SEM responder. Dedup por payload_hash.
 */
export async function recordUnresolvedEvent(db: Db, provider: string, body: unknown): Promise<void> {
  const hash = payloadHash(body);
  const { data: existing } = await db
    .from("provider_events")
    .select("id")
    .eq("provider", provider)
    .eq("payload_hash", hash)
    .is("channel_id", null)
    .maybeSingle();
  if (existing) return;

  await db.from("provider_events").insert({
    provider,
    event: "webhook.received",
    payload: body as Record<string, unknown>,
    channel_id: null,
    tenant_id: null,
    organization_id: null,
    payload_hash: hash,
    processing_status: "unresolved_channel",
    created_at: new Date().toISOString(),
  });
}

export type InboundMedia = {
  mediaType: string; // image | audio | video | document | sticker
  mimetype: string | null;
  durationSeconds: number | null;
  providerMediaId: string | null;
  /** Dados p/ baixar depois (url/mediaKey/key da mensagem). NUNCA token. */
  downloadMeta: Record<string, unknown>;
};

export type InboundMessage = {
  externalEventId: string; // id da mensagem do provider (idempotência)
  externalChatId: string; // chave da conversa no provider
  externalMessageId: string;
  body: string | null;
  messageType: string;
  media?: InboundMedia | null;
  timestampMs: number;
  isGroup: boolean;
  senderExternalId: string; // número (WhatsApp) ou PSID (social)
  identityType: IdentityType;
  displayName: string | null;
  rawPayload: Record<string, unknown>;
};

/**
 * Ingesta uma mensagem recebida no canal resolvido. Idempotente: repetições
 * (webhook duplicado) retornam "duplicate" sem duplicar nada.
 */
export async function ingestInboundMessage(
  db: Db,
  ch: ChannelResolution,
  msg: InboundMessage,
): Promise<"processed" | "duplicate"> {
  const now = new Date().toISOString();

  // 1) Idempotência por canal (evento já processado?). O registro do evento é
  // gravado SÓ NO FINAL (após persistir a mensagem). Assim, se algo falhar no
  // meio, o reenvio do provider reprocessa em vez de ficar preso em "processed".
  const { data: seen } = await db
    .from("provider_events")
    .select("id")
    .eq("channel_id", ch.channelId)
    .eq("provider", ch.provider)
    .eq("external_event_id", msg.externalEventId)
    .maybeSingle();
  if (seen) return "duplicate";

  // 2) Contato por identidade de canal (grupos não têm contato).
  let contactId: string | null = null;
  if (!msg.isGroup && msg.senderExternalId) {
    contactId = await resolveOrCreateContactByIdentity(db, {
      tenantId: ch.tenantId,
      organizationId: ch.organizationId,
      channelId: ch.channelId,
      provider: ch.provider,
      identityType: msg.identityType,
      externalId: msg.senderExternalId,
      displayName: msg.displayName,
    });
  }

  // 3) Conversa (única por channel_id + external_chat_id).
  const convFields = {
    name: msg.displayName || msg.senderExternalId,
    contact_id: contactId,
    is_group: msg.isGroup,
    last_message_at: now,
    last_inbound_at: now,
    last_customer_message_at: now,
    last_message_direction: "inbound",
    requires_human: !msg.isGroup,
    pending_reason: msg.isGroup ? null : "new_inbound_message",
    sla_status: "on_time",
    updated_at: now,
  };

  let conversationId: string;
  const { data: existingConv } = await db
    .from("whatsapp_conversations")
    .select("id, queue_status, assigned_user_id, assigned_to, last_assigned_user_id, resolved_at")
    .eq("channel_id", ch.channelId)
    .eq("external_chat_id", msg.externalChatId)
    .maybeSingle();

  if (existingConv?.id) {
    conversationId = existingConv.id;
    const queuePatch: { queue_status?: QueueStatus; [key: string]: string | boolean | null | undefined } = {};
    if (!msg.isGroup && existingConv.queue_status === "awaiting_customer") {
      queuePatch.queue_status = "in_progress";
      queuePatch.requires_human = true;
      queuePatch.pending_reason = "customer_replied";
    } else if (!msg.isGroup && existingConv.queue_status === "resolved") {
      const preferredAssignee = reopenAssignment({ lastAssignedUserId: existingConv.last_assigned_user_id, lastResolvedAt: existingConv.resolved_at, now: new Date(now) });
      const assignBack = preferredAssignee ? await resolveAvailableAssignee(db, ch, preferredAssignee) : null;
      queuePatch.queue_status = assignBack ? "in_progress" : "waiting";
      queuePatch.assigned_user_id = assignBack;
      queuePatch.assigned_to = assignBack;
      queuePatch.assigned_at = assignBack ? now : null;
      queuePatch.requires_human = true;
      queuePatch.pending_reason = "conversation_reopened";
      queuePatch.reopened_at = now;
      queuePatch.queue_entered_at = now;
      queuePatch.sla_started_at = now;
      queuePatch.sla_status = "on_time";
    }
    await db.from("whatsapp_conversations").update({ ...convFields, ...queuePatch }).eq("id", existingConv.id);
    if (!msg.isGroup && existingConv.queue_status === "awaiting_customer") {
      await recordQueueEvent(db, { tenantId: ch.tenantId, organizationId: ch.organizationId, conversationId, actorType: "provider", eventType: "customer_replied", previousState: "awaiting_customer", newState: "in_progress", description: "Cliente respondeu atendimento em espera." });
    } else if (!msg.isGroup && existingConv.queue_status === "resolved") {
      await recordQueueEvent(db, { tenantId: ch.tenantId, organizationId: ch.organizationId, conversationId, actorType: "provider", eventType: "reopened", previousState: "resolved", newState: queuePatch.queue_status, description: "Nova mensagem reabriu atendimento resolvido.", metadata: { assignedTo: queuePatch.assigned_user_id ?? null } });
    }
  } else {
    const { data: created, error } = await db
      .from("whatsapp_conversations")
      .insert({
        tenant_id: ch.tenantId,
        organization_id: ch.organizationId,
        channel_id: ch.channelId,
        external_chat_id: msg.externalChatId,
        provider: ch.provider,
        ...convFields,
      })
      .select("id")
      .single();
    if (error) throw error;
    conversationId = created.id;
  }

  // 4) Mensagem (única por channel_id + external_message_id).
  const { data: existingMsg } = await db
    .from("whatsapp_messages")
    .select("id, has_media")
    .eq("channel_id", ch.channelId)
    .eq("external_message_id", msg.externalMessageId)
    .maybeSingle();

  if (existingMsg?.id) {
    // Mensagem já existe (reenvio). Se trouxe mídia e ainda não estava marcada,
    // atualiza os campos de mídia para não perder a figurinha/áudio.
    if (msg.media && !existingMsg.has_media) {
      await db
        .from("whatsapp_messages")
        .update({
          message_type: msg.messageType,
          has_media: true,
          media_kind: msg.media.mediaType,
          media_status: "pending_download",
          media_mime_type: msg.media.mimetype,
          media_duration_seconds: msg.media.durationSeconds,
        })
        .eq("id", existingMsg.id);
      await ensureMessageMedia(db, ch, existingMsg.id, msg.media);
    }
    await recordProcessedEvent(db, ch, msg, now);
    return "duplicate";
  }

  const ts = msg.timestampMs ? new Date(msg.timestampMs).toISOString() : now;
  const { data: insertedMsg, error: msgError } = await db
    .from("whatsapp_messages")
    .insert({
      tenant_id: ch.tenantId,
      organization_id: ch.organizationId,
      channel_id: ch.channelId,
      external_message_id: msg.externalMessageId,
      provider: ch.provider,
      conversation_id: conversationId,
      contact_id: contactId,
      direction: "inbound",
      delivery_status: "delivered",
      from_id: msg.senderExternalId,
      to_id: null,
      body: msg.body,
      message_type: msg.messageType,
      has_media: Boolean(msg.media),
      media_kind: msg.media?.mediaType ?? null,
      // CHECK real: none|pending_download|downloading|stored|download_failed|skipped.
      media_status: msg.media ? "pending_download" : "none",
      media_mime_type: msg.media?.mimetype ?? null,
      media_duration_seconds: msg.media?.durationSeconds ?? null,
      raw_payload: msg.rawPayload,
      created_at: ts,
    })
    .select("id")
    .single();
  if (msgError) throw msgError;

  // Mídia: registra em message_media (idempotente). NÃO baixa aqui.
  if (msg.media && insertedMsg?.id) {
    await ensureMessageMedia(db, ch, insertedMsg.id, msg.media);
  }

  // 5) Só agora marca o evento como processado (idempotência pós-sucesso).
  await recordProcessedEvent(db, ch, msg, now);

  return "processed";
}

async function resolveAvailableAssignee(db: Db, ch: ChannelResolution, appUserId: string): Promise<string | null> {
  const { data } = await db
    .from("agent_availability")
    .select("app_user_id")
    .eq("tenant_id", ch.tenantId)
    .eq("organization_id", ch.organizationId)
    .eq("app_user_id", appUserId)
    .eq("status", "available")
    .eq("accepting_new_conversations", true)
    .maybeSingle();
  return data?.app_user_id ?? null;
}

/** Registra o provider_event como processado (idempotência por canal). */
async function recordProcessedEvent(
  db: Db,
  ch: ChannelResolution,
  msg: InboundMessage,
  now: string,
): Promise<void> {
  await db.from("provider_events").insert({
    provider: ch.provider,
    event: "messages.inbound",
    external_event_id: msg.externalEventId,
    channel_id: ch.channelId,
    tenant_id: ch.tenantId,
    organization_id: ch.organizationId,
    payload: msg.rawPayload,
    processing_status: "processed",
    created_at: now,
  });
}

/**
 * Cria o registro de mídia (sem baixar). Idempotente por
 * (message_id + provider_media_id) ou (message_id + media_type) quando não há id.
 */
async function ensureMessageMedia(
  db: Db,
  ch: ChannelResolution,
  messageId: string,
  media: InboundMedia,
): Promise<void> {
  let q = db.from("message_media").select("id").eq("message_id", messageId);
  q = media.providerMediaId
    ? q.eq("provider_media_id", media.providerMediaId)
    : q.eq("media_type", media.mediaType);
  const { data: existing } = await q.maybeSingle();
  if (existing) return;

  await db.from("message_media").insert({
    tenant_id: ch.tenantId,
    organization_id: ch.organizationId,
    channel_id: ch.channelId,
    message_id: messageId,
    provider: ch.provider,
    provider_media_id: media.providerMediaId,
    media_type: media.mediaType,
    mime_type: media.mimetype,
    duration_seconds: media.durationSeconds,
    storage_bucket: "shamar-message-media",
    download_status: "pending",
    metadata: media.downloadMeta,
  });
}

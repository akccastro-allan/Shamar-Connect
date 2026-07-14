import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { resolveChannelFromWebhook } from "@/lib/inbox/resolve-channel";
import { ingestInboundMessage } from "@/lib/inbox/persist-inbound";
import type { IdentityType } from "@/lib/inbox/contacts";
import { verifyOpenWaWebhookRequest } from "@/lib/webhooks/openwa-auth";
import {
  applyLipsConversationState,
  checkCooldown,
  processLipsMessage,
  recordAutoReply,
  sendAndSaveResponse,
} from "@/lib/agents/lips-simple-processor";
import { LIPS_ORGANIZATION_ID } from "@/lib/agents/auto-reply-config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true });
}

type NormalizedIncomingMessage = {
  id: string;
  chatId: string;
  body: string;
  timestamp?: number;
  fromMe: boolean;
  isGroup: boolean;
  senderExternalId: string;
  identityType: IdentityType;
  displayName: string;
};

type PersistedInboundMessage = {
  id: string;
  conversation_id: string;
  body: string | null;
  from_id: string | null;
  message_type: string | null;
};

const AUTO_REPLY_ALLOWED_PENDING_REASONS = new Set(["new_inbound_message", "auto_quote_idle", "quote_context"]);

function normalizeIncomingMessage(data: Record<string, unknown>): NormalizedIncomingMessage {
  const contact = data.contact as Record<string, unknown> | undefined;
  const chatId = data.chatId as string || data.from as string || "";
  const senderPhone = String(
    data.senderPhone ||
    data.phone ||
    contact?.phone ||
    contact?.number ||
    contact?.waId ||
    "",
  ).replace(/\D/g, "");

  if (data.key && data.message) {
    const key = data.key as Record<string, unknown>;
    const message = data.message as Record<string, unknown>;
    return {
      id: key.id as string || "",
      chatId: key.remoteJid as string || "",
      body: message.conversation as string || "",
      timestamp: data.messageTimestamp as number | undefined,
      fromMe: Boolean(key.fromMe),
      isGroup: String(key.remoteJid || "").endsWith("@g.us"),
      senderExternalId: key.remoteJid as string || "",
      identityType: String(key.remoteJid || "").endsWith("@lid") ? "lid" : "phone",
      displayName: data.pushName as string || "OpenWA User",
    };
  }

  return {
    id: data.id as string || "",
    chatId,
    body: data.body as string || "",
    timestamp: data.timestamp as number | undefined,
    fromMe: Boolean(data.fromMe),
    isGroup: Boolean(data.isGroup) || String(chatId).endsWith("@g.us"),
    senderExternalId: senderPhone || chatId,
    identityType: senderPhone ? "phone" : chatId.endsWith("@lid") ? "lid" : "phone",
    displayName:
      contact?.pushName as string ||
      contact?.name as string ||
      data.pushName as string ||
      data.contactName as string ||
      data.chatName as string ||
      "OpenWA User",
  };
}

function isOfficialAutoReply(result: Awaited<ReturnType<typeof processLipsMessage>>) {
  if (!result.shouldSend || !result.autoSendAllowed) return false;

  const isSafeHandoff = Boolean(
    result.requiresHandoff &&
      result.department &&
      ["Balcão", "Oficina", "Supervisor"].includes(result.department) &&
      result.handoffReason,
  );

  if (result.quoteOnly) {
    return (
      (
        (result.intent === "quote" && hasPriceInResponse(result.response)) ||
        (result.intent === "quote_options" && /R\$\s*\d/i.test(result.response))
      ) &&
      (!result.requiresHandoff || isSafeHandoff)
    );
  }

  if (result.intent === "menu") {
    return !result.requiresHandoff;
  }

  if (result.intent === "nao_encontrado") {
    return !result.requiresHandoff && result.response.includes("Não encontrei essa peça com segurança");
  }

  if (["need_vehicle_year", "need_brake_position", "need_catalog_application", "need_side", "need_vertical_position"].includes(result.intent)) {
    return !result.requiresHandoff;
  }

  return isSafeHandoff;
}

function hasPriceInResponse(response: string) {
  const normalized = response
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return /\bValor:\s*R\$/i.test(normalized);
}

function isAwaitingHuman(requiresHuman?: boolean | null, pendingReason?: string | null) {
  return Boolean(requiresHuman && (!pendingReason || !AUTO_REPLY_ALLOWED_PENDING_REASONS.has(pendingReason)));
}

function maskChatId(chatId: string) {
  if (!chatId) return "unknown";
  const [identifier, suffix] = chatId.split("@");
  const tail = identifier.slice(-4);
  return `${tail ? `***${tail}` : "unknown"}${suffix ? `@${suffix}` : ""}`;
}

function maskSessionReference(sessionRef: string) {
  if (!sessionRef) return "unknown";
  if (sessionRef.length <= 8) return "***";
  return `${sessionRef.slice(0, 4)}***${sessionRef.slice(-4)}`;
}

async function findPersistedInboundMessage(
  db: ReturnType<typeof createSupabaseWriteClient>,
  channelId: string,
  incomingId: string,
  chatId: string,
  body: string,
): Promise<PersistedInboundMessage | null> {
  const byMessageId = await db
    .from("whatsapp_messages")
    .select("id, conversation_id, body, from_id, message_type")
    .eq("channel_id", channelId)
    .eq("external_message_id", incomingId)
    .maybeSingle();

  if (byMessageId.data?.id && byMessageId.data.conversation_id) {
    return byMessageId.data;
  }

  const conversation = await db
    .from("whatsapp_conversations")
    .select("id")
    .eq("channel_id", channelId)
    .eq("external_chat_id", chatId)
    .maybeSingle();

  if (!conversation.data?.id) return null;

  const recentMessage = await db
    .from("whatsapp_messages")
    .select("id, conversation_id, body, from_id, message_type")
    .eq("conversation_id", conversation.data.id)
    .eq("direction", "inbound")
    .eq("body", body)
    .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return recentMessage.data?.id && recentMessage.data.conversation_id ? recentMessage.data : null;
}

async function ensureLipsAutomationJob(
  db: ReturnType<typeof createSupabaseWriteClient>,
  channel: { tenantId: string; organizationId: string | null; channelId: string },
  messageId: string,
  conversationId: string,
) {
  if (!channel.organizationId) return { job: null, created: false };

  const existing = await db
    .from("agent_automation_jobs")
    .select("id, status")
    .eq("message_id", messageId)
    .eq("agent_type", "lips-auto")
    .maybeSingle();

  if (existing.data?.id) {
    return { job: existing.data, created: false };
  }

  const created = await db.from("agent_automation_jobs").insert({
    tenant_id: channel.tenantId,
    organization_id: channel.organizationId,
    channel_id: channel.channelId,
    conversation_id: conversationId,
    message_id: messageId,
    status: "pending",
    agent_type: "lips-auto",
  }).select("id, status").single();

  if (created.error) {
    console.error("[openwa-webhook] Failed to create Lips automation job:", created.error.message);
    return { job: null, created: false };
  }

  return { job: created.data, created: true };
}

async function routeNonTextToHuman(
  db: ReturnType<typeof createSupabaseWriteClient>,
  conversationId: string,
  messageType: string,
  transcriptionEnabled: boolean,
) {
  const normalizedType = messageType.toLowerCase();
  const isAudio = normalizedType === "audio" || normalizedType === "ptt";
  const pendingReason = isAudio && !transcriptionEnabled
    ? "audio_requires_human"
    : normalizedType === "sticker"
      ? "sticker_requires_human"
      : "media_requires_human";

  await db
    .from("whatsapp_conversations")
    .update({
      status: "pending",
      requires_human: true,
      pending_reason: pendingReason,
      sla_status: "on_time",
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (!verifyOpenWaWebhookRequest(rawBody, request.headers)) {
      return NextResponse.json({ ok: false, error: "Invalid OpenWA webhook authentication." }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as Record<string, unknown>;

    if (body.event === "message.received" && body.sessionId && body.data) {
      const data = body.data as Record<string, unknown>;
      const incoming = normalizeIncomingMessage(data);

      if (!incoming.chatId || incoming.fromMe || incoming.isGroup) {
        return NextResponse.json({ ok: true });
      }

      const db = createSupabaseWriteClient();
      const sessionId = body.sessionId as string;
      console.log("[openwa-webhook] Resolving channel for sessionId:", sessionId);
      const channel = await resolveChannelFromWebhook(db, "openwa", { sessionId });

      if (!channel) {
        console.warn("[openwa-webhook] channel resolution failed", {
          provider: "openwa",
          sessionRef: maskSessionReference(sessionId),
          eventType: body.event,
        });
        return NextResponse.json({ ok: true });
      }
      console.log("[openwa-webhook] Channel resolved:", channel.channelId);

      const { data: existingConversation } = await db
        .from("whatsapp_conversations")
        .select("id, requires_human, pending_reason")
        .eq("channel_id", channel.channelId)
        .eq("external_chat_id", incoming.chatId)
        .maybeSingle();
      const wasAwaitingHuman = isAwaitingHuman(existingConversation?.requires_human, existingConversation?.pending_reason);

      const result = await ingestInboundMessage(db, channel, {
        externalEventId: incoming.id,
        externalChatId: incoming.chatId,
        externalMessageId: incoming.id,
        body: incoming.body,
        messageType: String(data.type || "text"),
        media: null,
        timestampMs: (incoming.timestamp || Math.floor(Date.now() / 1000)) * 1000,
        isGroup: false,
        senderExternalId: incoming.senderExternalId || incoming.chatId,
        identityType: incoming.identityType || "phone",
        displayName: incoming.displayName,
        rawPayload: data,
      });

      if ((result === "processed" || result === "duplicate") && channel.organizationId) {
        const persistedMessage = await findPersistedInboundMessage(
          db,
          channel.channelId,
          incoming.id,
          incoming.chatId,
          incoming.body,
        );

        if (persistedMessage?.id && persistedMessage.conversation_id) {
          const text = (persistedMessage.body || "").trim();
          const isLipsChannel = channel.organizationId === LIPS_ORGANIZATION_ID;
          const isTextMessage = !persistedMessage.message_type || ["text", "chat"].includes(persistedMessage.message_type);
          const messageType = persistedMessage.message_type || "text";

          if (!isLipsChannel) {
            return NextResponse.json({ ok: true });
          }

          const { job, created } = await ensureLipsAutomationJob(
            db,
            channel,
            persistedMessage.id,
            persistedMessage.conversation_id,
          );

          console.log("[openwa-webhook] Lips automation checkpoint", {
            ingestResult: result,
            channelId: channel.channelId,
            chat: maskChatId(incoming.chatId),
            messagePersisted: true,
            jobId: job?.id || null,
            jobCreated: created,
            jobStatus: job?.status || null,
          });

          if (!job || (result === "duplicate" && !created && job.status === "done")) {
            return NextResponse.json({ ok: true });
          }

          if (text && isTextMessage) {
            const processResult = await processLipsMessage(
              db,
              channel.organizationId,
              text,
              persistedMessage.from_id || incoming.senderExternalId || incoming.chatId,
              persistedMessage.conversation_id,
            );

            if (wasAwaitingHuman && job?.id) {
              await db
                .from("agent_automation_jobs")
                .update({
                  status: "done",
                  completed_at: new Date().toISOString(),
                  response_type: "already_requires_human",
                  response_text: processResult.response || null,
                  sent_to_evolution: false,
                })
                .eq("id", job.id);
            } else if (isOfficialAutoReply(processResult)) {
              if (processResult.requiresHandoff) {
                await applyLipsConversationState(db, channel.organizationId, persistedMessage.conversation_id, processResult);
              }

              const cooldown = await checkCooldown(db, persistedMessage.conversation_id, processResult.response, {
                allowWithinCooldown: processResult.requiresHandoff,
              });

              if (cooldown.allowed) {
                const sendResult = await sendAndSaveResponse(
                  db,
                  channel.organizationId,
                  persistedMessage.conversation_id,
                  incoming.chatId,
                  processResult.response,
                  processResult.requiresHandoff,
                  processResult.department,
                );

                if (sendResult.success) {
                  await recordAutoReply(db, channel.organizationId, persistedMessage.conversation_id, processResult.response);
                  if (!processResult.requiresHandoff) {
                    await applyLipsConversationState(db, channel.organizationId, persistedMessage.conversation_id, processResult);
                  }
                  if (job?.id) {
                    await db
                      .from("agent_automation_jobs")
                      .update({
                        status: "done",
                        completed_at: new Date().toISOString(),
                        response_type: processResult.intent,
                        response_text: processResult.response,
                        sent_to_evolution: true,
                        outbound_message_id: sendResult.messageId,
                      })
                      .eq("id", job.id);
                  }
                } else if (job?.id) {
                  await db
                    .from("agent_automation_jobs")
                    .update({ status: "error", error_message: sendResult.error || "Falha ao enviar resposta automática" })
                    .eq("id", job.id);
                }
              } else if (job?.id) {
                await db
                  .from("agent_automation_jobs")
                  .update({
                    status: "done",
                    completed_at: new Date().toISOString(),
                    response_type: `${processResult.intent}_blocked_cooldown`,
                    response_text: processResult.response,
                    sent_to_evolution: false,
                  })
                  .eq("id", job.id);
              }
            } else if (job?.id) {
              await db
                .from("agent_automation_jobs")
                .update({
                  status: "done",
                  completed_at: new Date().toISOString(),
                  response_type: "not_auto_replied",
                  response_text: processResult.response || null,
                  sent_to_evolution: false,
                })
                .eq("id", job.id);
            }
          } else if (job?.id) {
            const { data: channelSettings } = await db
              .from("channels")
              .select("transcription_enabled")
              .eq("id", channel.channelId)
              .maybeSingle();

            await routeNonTextToHuman(
              db,
              persistedMessage.conversation_id,
              messageType,
              Boolean(channelSettings?.transcription_enabled),
            );

            await db
              .from("agent_automation_jobs")
              .update({
                status: "done",
                completed_at: new Date().toISOString(),
                response_type: `${messageType}_requires_human`,
                sent_to_evolution: false,
              })
              .eq("id", job.id);
          }
        }
      }
    }
  } catch (err) {
    console.error("[openwa-webhook] Error:", err);
  }

  return NextResponse.json({ ok: true });
}

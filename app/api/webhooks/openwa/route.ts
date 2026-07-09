import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { resolveChannelFromWebhook } from "@/lib/inbox/resolve-channel";
import { ingestInboundMessage } from "@/lib/inbox/persist-inbound";
import type { IdentityType } from "@/lib/inbox/contacts";
import {
  checkCooldown,
  processLipsMessage,
  recordAutoReply,
  sendAndSaveResponse,
} from "@/lib/agents/lips-simple-processor";

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

const LIPS_SESSION_ID = "lips-main";
const LIPS_CHANNEL_ID = "1f65f8d2-2609-42d9-ae57-709aecdb43da";

function verifyOpenWaSignature(rawBody: string, signature: string | null) {
  const secret = process.env.OPENWA_WEBHOOK_SECRET || process.env.SHAMARCONNECT_WEBHOOK_TOKEN || "";
  if (!secret) return true;
  if (!signature?.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

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

function isSafeAutoQuote(result: Awaited<ReturnType<typeof processLipsMessage>>) {
  return Boolean(
    result.shouldSend &&
      result.autoSendAllowed &&
      result.quoteOnly &&
      result.intent === "quote" &&
      !result.requiresHandoff &&
      hasPriceInResponse(result.response),
  );
}

function hasPriceInResponse(response: string) {
  const normalized = response
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return /\bValor:\s*R\$/i.test(normalized);
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (!verifyOpenWaSignature(rawBody, request.headers.get("x-openwa-signature"))) {
      return NextResponse.json({ ok: false, error: "Invalid OpenWA signature." }, { status: 401 });
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
      const channel =
        await resolveChannelFromWebhook(db, "openwa", { sessionId }) ||
        await resolveChannelFromWebhook(db, "openwa", { sessionId: process.env.WHATSAPP_WEB_GATEWAY_SESSION_ID || "lips-main" });

      if (!channel) {
        console.log("[openwa-webhook] Channel not resolved for sessionId:", sessionId);
        return NextResponse.json({ ok: true });
      }
      console.log("[openwa-webhook] Channel resolved:", channel.channelId);

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

      if (result === "processed" && channel.organizationId) {
        const msgQuery = await db
          .from("whatsapp_messages")
          .select("id, conversation_id, body, from_id, message_type")
          .eq("external_message_id", incoming.id)
          .maybeSingle();

        if (msgQuery.data?.id && msgQuery.data?.conversation_id) {
          const text = (msgQuery.data.body || "").trim();
          const isLipsChannel = channel.channelId === LIPS_CHANNEL_ID && sessionId === LIPS_SESSION_ID;
          const isTextMessage = !msgQuery.data.message_type || msgQuery.data.message_type === "text";

          if (!isLipsChannel) {
            return NextResponse.json({ ok: true });
          }

          const { data: job } = await db.from("agent_automation_jobs").insert({
            tenant_id: channel.tenantId,
            organization_id: channel.organizationId,
            channel_id: channel.channelId,
            conversation_id: msgQuery.data.conversation_id,
            message_id: msgQuery.data.id,
            status: "pending",
            agent_type: "lips-auto",
          }).select("id").single();

          if (text && isTextMessage) {
            const processResult = await processLipsMessage(
              db,
              channel.organizationId,
              text,
              msgQuery.data.from_id || incoming.senderExternalId || incoming.chatId,
              msgQuery.data.conversation_id,
            );

            if (isSafeAutoQuote(processResult)) {
              const cooldown = await checkCooldown(db, msgQuery.data.conversation_id, processResult.response);

              if (cooldown.allowed) {
                const sendResult = await sendAndSaveResponse(
                  db,
                  channel.organizationId,
                  msgQuery.data.conversation_id,
                  incoming.chatId,
                  processResult.response,
                  false,
                  processResult.department,
                );

                if (sendResult.success) {
                  await recordAutoReply(db, channel.organizationId, msgQuery.data.conversation_id, processResult.response);
                  await db
                    .from("whatsapp_conversations")
                    .update({ status: processResult.nextStatusSuggestion || "awaiting_customer", updated_at: new Date().toISOString() })
                    .eq("id", msgQuery.data.conversation_id);
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
            await db
              .from("agent_automation_jobs")
              .update({
                status: "done",
                completed_at: new Date().toISOString(),
                response_type: "not_auto_replied",
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

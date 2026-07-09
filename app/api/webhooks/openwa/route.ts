import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { resolveChannelFromWebhook } from "@/lib/inbox/resolve-channel";
import { ingestInboundMessage } from "@/lib/inbox/persist-inbound";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true });
}

function verifyOpenWaSignature(rawBody: string, signature: string | null) {
  const secret = process.env.OPENWA_WEBHOOK_SECRET || process.env.SHAMARCONNECT_WEBHOOK_TOKEN || "";
  if (!secret) return true;
  if (!signature?.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function normalizeIncomingMessage(data: Record<string, unknown>) {
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
      displayName: data.pushName as string || "OpenWA User",
    };
  }

  return {
    id: data.id as string || "",
    chatId: data.chatId as string || data.from as string || "",
    body: data.body as string || "",
    timestamp: data.timestamp as number | undefined,
    fromMe: Boolean(data.fromMe),
    isGroup: Boolean(data.isGroup) || String(data.chatId || data.from || "").endsWith("@g.us"),
    displayName: data.pushName as string || data.contactName as string || "OpenWA User",
  };
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
        senderExternalId: incoming.chatId,
        identityType: "phone",
        displayName: incoming.displayName,
        rawPayload: data,
      });

      if (result === "processed" && channel.organizationId) {
        const msgQuery = await db
          .from("whatsapp_messages")
          .select("id, conversation_id")
          .eq("external_message_id", incoming.id)
          .maybeSingle();

        if (msgQuery.data?.id && msgQuery.data?.conversation_id) {
          await db.from("agent_automation_jobs").insert({
            tenant_id: channel.tenantId,
            organization_id: channel.organizationId,
            channel_id: channel.channelId,
            conversation_id: msgQuery.data.conversation_id,
            message_id: msgQuery.data.id,
            status: "pending",
            agent_type: "lips-auto",
          });
        }
      }
    }
  } catch (err) {
    console.error("[openwa-webhook] Error:", err);
  }

  return NextResponse.json({ ok: true });
}

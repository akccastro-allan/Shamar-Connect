import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { resolveChannelFromWebhook } from "@/lib/inbox/resolve-channel";
import { ingestInboundMessage } from "@/lib/inbox/persist-inbound";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;

    if (body.event === "message.received" && body.sessionId && body.data) {
      const data = body.data as Record<string, unknown>;
      if (!data.key || !data.message) return NextResponse.json({ ok: true });

      const key = data.key as Record<string, unknown>;
      const msg = data.message as Record<string, unknown>;
      const remoteJid = key.remoteJid as string;
      const fromMe = key.fromMe as boolean;

      if (!remoteJid || fromMe || remoteJid.endsWith("@g.us")) {
        return NextResponse.json({ ok: true });
      }

      const db = createSupabaseWriteClient();
      const channel = await resolveChannelFromWebhook(db, "openwa", { sessionId: body.sessionId as string });

      if (!channel) return NextResponse.json({ ok: true });

      const result = await ingestInboundMessage(db, channel, {
        externalEventId: key.id as string || "",
        externalChatId: remoteJid,
        externalMessageId: key.id as string || "",
        body: msg.conversation as string || "",
        messageType: "text",
        media: null,
        timestampMs: ((data.messageTimestamp as number) || Math.floor(Date.now() / 1000)) * 1000,
        isGroup: false,
        senderExternalId: remoteJid,
        identityType: "phone",
        displayName: (data.pushName as string) || "OpenWA User",
        rawPayload: data,
      });

      if (result === "processed" && channel.organizationId) {
        const msgQuery = await db
          .from("whatsapp_messages")
          .select("id, conversation_id")
          .eq("external_message_id", key.id)
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

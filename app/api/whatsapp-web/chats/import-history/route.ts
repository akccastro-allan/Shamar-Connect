import { NextRequest, NextResponse } from "next/server";
import { isUnauthorizedError } from "@/lib/auth/app-context";
import { requireOwnedWhatsappSession } from "../../_auth";
import { upsertTenantRow } from "../../_tenant-upsert";

function onlyDigits(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const chatId = String(body?.chatId || "");
    const limit = Math.min(Number(body?.limit || 50), 200);
    const sessionId = body?.sessionId ? String(body.sessionId) : null;

    if (!chatId) {
      return NextResponse.json({ ok: false, error: "chatId is required" }, { status: 400 });
    }

    const session = await requireOwnedWhatsappSession(sessionId);
    if (!session.ok) return session.response;

    const { context, db, channelId, resolved } = session;

    const messages = await resolved.client.listChatMessages(chatId, limit);

    let saved = 0;

    for (const message of messages) {
      const phone = onlyDigits(message.phone || message.from);
      let personId = null;

      if (phone) {
        const person = await upsertTenantRow(db, context, "crm_contacts", { phone }, {
          phone,
          name: message.contactName || phone,
          source: "whatsapp_web_manual_sync",
          updated_at: new Date().toISOString(),
        });
        personId = person?.id || null;
      }

      const conversationPayload: Record<string, unknown> = {
        tenant_id: context.tenantId,
        organization_id: context.organizationId,
        external_chat_id: message.chatId,
        provider: "whatsapp_web",
        contact_id: personId,
        name: message.chatName || message.contactName || message.chatId,
        is_group: Boolean(message.isGroup),
        last_message_at: message.timestamp
          ? new Date(Number(message.timestamp) * 1000).toISOString()
          : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      conversationPayload.channel_id = channelId;

      const conversation = await upsertTenantRow(db, context, "whatsapp_conversations", {
        provider: "whatsapp_web",
        channel_id: channelId,
        external_chat_id: message.chatId,
      }, conversationPayload);

      if (message.id) {
        await upsertTenantRow(db, context, "whatsapp_messages", {
          provider: "whatsapp_web",
          channel_id: channelId,
          external_message_id: message.id,
        }, {
          external_message_id: message.id,
          provider: "whatsapp_web",
          channel_id: channelId,
          conversation_id: conversation?.id || null,
          contact_id: personId,
          direction: message.direction,
          from_id: message.from || null,
          to_id: message.to || null,
          body: message.body || null,
          message_type: message.type || "text",
          raw_payload: message || {},
          created_at: message.timestamp
            ? new Date(Number(message.timestamp) * 1000).toISOString()
            : new Date().toISOString(),
        });
        saved += 1;
      }
    }

    return NextResponse.json({ ok: true, chatId, sessionId: resolved.sessionId, requested: limit, saved });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to import chat history" }, { status: 500 });
  }
}

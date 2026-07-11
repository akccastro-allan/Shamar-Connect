import { NextRequest, NextResponse } from "next/server";
import { isUnauthorizedError } from "@/lib/auth/app-context";
import { isWhatsappGroupChat } from "@/lib/whatsapp/chat-policy";
import { requireOwnedWhatsappSession } from "../../_auth";
import { upsertTenantRow } from "../../_tenant-upsert";

function onlyDigits(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const to = String(body?.to || "");
    const text = String(body?.body || "").trim();
    const chatName = String(body?.chatName || to);
    const isGroup = Boolean(body?.isGroup);
    const sessionId = String(body?.sessionId || "");

    if (!to || !text) {
      return NextResponse.json({ ok: false, error: "to and body are required" }, { status: 400 });
    }
    if (isWhatsappGroupChat(to, isGroup)) {
      return NextResponse.json({ ok: false, error: "Grupos não podem receber mensagens automáticas." }, { status: 400 });
    }

    const session = await requireOwnedWhatsappSession(sessionId);
    if (!session.ok) return session.response;
    const { data: existingConversation } = await session.db
      .from("whatsapp_conversations")
      .select("id")
      .eq("tenant_id", session.context.tenantId)
      .eq("organization_id", session.context.organizationId)
      .eq("channel_id", session.channelId)
      .eq("provider", "whatsapp_web")
      .eq("external_chat_id", to)
      .maybeSingle();

    if (!existingConversation?.id) {
      return NextResponse.json({ ok: false, error: "Conversa não encontrada para este canal." }, { status: 404 });
    }

    const sent = await session.resolved.client.sendMessage({ to, body: text });
    const { context, db } = session;

    let contactId = null;
    const phone = isGroup ? "" : onlyDigits(to);

    if (phone) {
      const contact = await upsertTenantRow(db, context, "crm_contacts", { phone }, {
        phone,
        name: chatName || phone,
        source: "whatsapp_web_reply",
        updated_at: new Date().toISOString(),
      });
      contactId = contact?.id || null;
    }

    const conversation = await upsertTenantRow(db, context, "whatsapp_conversations", {
      provider: "whatsapp_web",
      channel_id: session.channelId,
      external_chat_id: to,
    }, {
        external_chat_id: to,
        provider: "whatsapp_web",
        channel_id: session.channelId,
        contact_id: contactId,
        name: chatName || to,
        is_group: isGroup,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    await upsertTenantRow(db, context, "whatsapp_messages", {
      provider: "whatsapp_web",
      channel_id: session.channelId,
      external_message_id: sent.id,
    }, {
        external_message_id: sent.id,
        provider: "whatsapp_web",
        channel_id: session.channelId,
        conversation_id: conversation?.id || null,
        contact_id: contactId,
        direction: "outbound",
        from_id: null,
        to_id: to,
        body: text,
        message_type: "text",
        raw_payload: { id: sent.id, to, body: text, isGroup },
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({ ok: true, id: sent.id, status: sent.status });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to send WhatsApp message" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

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

    if (!to || !text) {
      return NextResponse.json({ ok: false, error: "to and body are required" }, { status: 400 });
    }

    const sent = await whatsappWebGatewayClient.sendMessage({ to, body: text });
    const db = createSupabaseWriteClient();

    let contactId = null;
    const phone = isGroup ? "" : onlyDigits(to);

    if (phone) {
      const { data: contact, error: contactError } = await db
        .from("crm_contacts")
        .upsert({ phone, name: chatName || phone, source: "whatsapp_web_reply", updated_at: new Date().toISOString() }, { onConflict: "phone" })
        .select("id")
        .single();

      if (contactError) throw contactError;
      contactId = contact?.id || null;
    }

    const { data: conversation, error: conversationError } = await db
      .from("whatsapp_conversations")
      .upsert({
        external_chat_id: to,
        provider: "whatsapp_web",
        contact_id: contactId,
        name: chatName || to,
        is_group: isGroup,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "external_chat_id" })
      .select("id")
      .single();

    if (conversationError) throw conversationError;

    const { error: messageError } = await db
      .from("whatsapp_messages")
      .upsert({
        external_message_id: sent.id,
        provider: "whatsapp_web",
        conversation_id: conversation?.id || null,
        contact_id: contactId,
        direction: "outbound",
        from_id: null,
        to_id: to,
        body: text,
        message_type: "text",
        raw_payload: { id: sent.id, to, body: text, isGroup },
        created_at: new Date().toISOString(),
      }, { onConflict: "external_message_id" });

    if (messageError) throw messageError;

    return NextResponse.json({ ok: true, id: sent.id, status: sent.status });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to send WhatsApp message" }, { status: 500 });
  }
}

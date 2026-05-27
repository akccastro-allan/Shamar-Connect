import { NextRequest, NextResponse } from "next/server";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

function onlyDigits(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const chatId = String(body?.chatId || "");
    const limit = Math.min(Number(body?.limit || 50), 200);

    if (!chatId) {
      return NextResponse.json({ ok: false, error: "chatId is required" }, { status: 400 });
    }

    const db = createSupabaseWriteClient();
    const messages = await whatsappWebGatewayClient.listChatMessages(chatId, limit);

    let saved = 0;

    for (const message of messages) {
      const phone = onlyDigits(message.phone || message.from);
      let personId = null;

      if (phone) {
        const { data: person, error: personError } = await db
          .from("crm_contacts")
          .upsert({ phone, name: message.contactName || phone, source: "whatsapp_web_manual_sync", updated_at: new Date().toISOString() }, { onConflict: "phone" })
          .select("id")
          .single();

        if (personError) throw personError;
        personId = person?.id || null;
      }

      const { data: conversation, error: conversationError } = await db
        .from("whatsapp_conversations")
        .upsert({
          external_chat_id: message.chatId,
          provider: "whatsapp_web",
          contact_id: personId,
          name: message.chatName || message.contactName || message.chatId,
          is_group: Boolean(message.isGroup),
          last_message_at: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "external_chat_id" })
        .select("id")
        .single();

      if (conversationError) throw conversationError;

      if (message.id) {
        const { error: messageError } = await db
          .from("whatsapp_messages")
          .upsert({
            external_message_id: message.id,
            provider: "whatsapp_web",
            conversation_id: conversation?.id || null,
            contact_id: personId,
            direction: message.direction,
            from_id: message.from || null,
            to_id: message.to || null,
            body: message.body || null,
            message_type: message.type || "text",
            raw_payload: message || {},
            created_at: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString(),
          }, { onConflict: "external_message_id" });

        if (messageError) throw messageError;
        saved += 1;
      }
    }

    return NextResponse.json({ ok: true, chatId, requested: limit, saved });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to import chat history" }, { status: 500 });
  }
}

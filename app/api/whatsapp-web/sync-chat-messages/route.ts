import { NextRequest, NextResponse } from "next/server";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

function normalizePhone(value?: string) {
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

    const client = createSupabaseWriteClient();
    const messages = await whatsappWebGatewayClient.listChatMessages(chatId, limit);

    let savedMessages = 0;

    for (const message of messages) {
      const phone = normalizePhone(message.phone || message.from || message.to);
      let contactId: string | null = null;

      if (phone) {
        const { data: contact, error: contactError } = await client
          .from("crm_contacts")
          .upsert({
            phone,
            name: message.contactName || phone,
            source: "whatsapp_web_history",
            updated_at: new Date().toISOString(),
          }, { onConflict: "phone" })
          .select("id")
          .single();

        if (contactError) throw contactError;
        contactId = contact?.id || null;
      }

      const { data: conversation, error: conversationError } = await client
        .from("whatsapp_conversations")
        .upsert({
          provider: "whatsapp_web",
          external_chat_id: message.chatId || chatId,
          contact_id: contactId,
          name: message.chatName || message.contactName || message.chatId || chatId,
          is_group: Boolean(message.isGroup),
          last_message_at: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "external_chat_id" })
        .select("id")
        .single();

      if (conversationError) throw conversationError;

      const { error: messageError } = await client
        .from("whatsapp_messages")
        .upsert({
          external_message_id: message.id,
          provider: "whatsapp_web",
          conversation_id: conversation?.id || null,
          contact_id: contactId,
          direction: message.direction || "inbound",
          from_id: message.from || null,
          to_id: message.to || null,
          body: message.body || null,
          message_type: message.type || "text",
          raw_payload: message,
          created_at: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString(),
        }, { onConflict: "external_message_id" });

      if (messageError) throw messageError;
      savedMessages += 1;
    }

    return NextResponse.json({ ok: true, chatId, scanned: messages.length, savedMessages });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to sync chat messages" }, { status: 500 });
  }
}

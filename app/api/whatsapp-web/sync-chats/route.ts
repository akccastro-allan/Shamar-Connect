import { NextResponse } from "next/server";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function POST() {
  try {
    const client = createSupabaseWriteClient();
    const chats = await whatsappWebGatewayClient.listChats();

    const conversations = chats.map((chat) => ({
      provider: "whatsapp_web",
      external_chat_id: chat.id,
      name: chat.name || chat.id,
      is_group: Boolean(chat.isGroup),
      unread_count: chat.unreadCount || 0,
      last_message_at: chat.lastMessageAt || null,
      updated_at: new Date().toISOString(),
    }));

    if (conversations.length > 0) {
      const { error } = await client
        .from("whatsapp_conversations")
        .upsert(conversations, { onConflict: "external_chat_id" });

      if (error) throw error;
    }

    return NextResponse.json({ ok: true, total: conversations.length });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to sync chats" }, { status: 500 });
  }
}

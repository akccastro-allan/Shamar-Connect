import { NextRequest, NextResponse } from "next/server";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const selectedChatIds = Array.isArray(body?.chatIds) ? body.chatIds.map(String) : [];

    if (selectedChatIds.length === 0) {
      return NextResponse.json({ ok: false, error: "Nenhuma conversa selecionada. Por segurança, o sistema não salva conversas em massa." }, { status: 400 });
    }

    const client = createSupabaseWriteClient();
    const chats = await whatsappWebGatewayClient.listChats();
    const selectedChats = chats.filter((chat) => selectedChatIds.includes(chat.id));

    const conversations = selectedChats.map((chat) => ({
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

    return NextResponse.json({ ok: true, total: conversations.length, mode: "selected_only" });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to sync selected chats" }, { status: 500 });
  }
}

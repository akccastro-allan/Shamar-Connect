import { NextRequest, NextResponse } from "next/server";
import { isUnauthorizedError } from "@/lib/auth/app-context";
import { requireOwnedWhatsappSession } from "../_auth";
import { upsertTenantRow } from "../_tenant-upsert";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const selectedChatIds = Array.isArray(body?.chatIds) ? body.chatIds.map(String) : [];
    const sessionId = body?.sessionId ? String(body.sessionId) : null;

    if (selectedChatIds.length === 0) {
      return NextResponse.json({ ok: false, error: "Nenhuma conversa selecionada. Por segurança, o sistema não salva conversas em massa." }, { status: 400 });
    }

    const session = await requireOwnedWhatsappSession(sessionId);
    if (!session.ok) return session.response;

    const chats = await session.resolved.client.listChats();
    const selectedChats = chats.filter((chat) => selectedChatIds.includes(chat.id));

    const conversations = selectedChats.map((chat) => ({
      tenant_id: session.context.tenantId,
      organization_id: session.context.organizationId,
      channel_id: session.channelId,
      provider: "whatsapp_web",
      external_chat_id: chat.id,
      name: chat.name || chat.id,
      is_group: Boolean(chat.isGroup),
      unread_count: chat.unreadCount || 0,
      last_message_at: chat.lastMessageAt || null,
      updated_at: new Date().toISOString(),
    }));

    for (const conversation of conversations) {
      await upsertTenantRow(session.db, session.context, "whatsapp_conversations", {
        provider: "whatsapp_web",
        channel_id: session.channelId,
        external_chat_id: conversation.external_chat_id,
      }, conversation);
    }

    return NextResponse.json({ ok: true, total: conversations.length, mode: "selected_only" });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to sync selected chats" }, { status: 500 });
  }
}

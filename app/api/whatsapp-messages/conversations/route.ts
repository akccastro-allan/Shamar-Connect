import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

type MessageRow = {
  conversation_id: string | null;
  body: string | null;
  direction: "inbound" | "outbound";
  created_at: string;
};

export async function GET() {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseWriteClient();

    const { data: conversations, error: conversationsError } = await db
      .from("whatsapp_conversations")
      .select("id, external_chat_id, name, is_group, status, unread_count, last_message_at, created_at, last_inbound_at, last_outbound_at, last_message_direction, requires_human, pending_reason, sla_status, sla_due_at, watchdog_checked_at, channel_id, provider, crm_contacts(id, name, phone, email, company, consent_status), channels(id, name, slug, color)")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100);

    if (conversationsError) throw conversationsError;

    const conversationIds = (conversations || []).map((conversation) => conversation.id);

    let latestMessages: MessageRow[] = [];
    if (conversationIds.length > 0) {
      const { data: messages, error: messagesError } = await db
        .from("whatsapp_messages")
        .select("conversation_id, body, direction, created_at")
        .eq("tenant_id", context.tenantId)
        .eq("organization_id", context.organizationId)
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(500);

      if (messagesError) throw messagesError;
      latestMessages = messages || [];
    }

    const latestByConversation = new Map<string, MessageRow>();
    for (const message of latestMessages) {
      if (!message.conversation_id) continue;
      if (!latestByConversation.has(message.conversation_id)) {
        latestByConversation.set(message.conversation_id, message);
      }
    }

    return NextResponse.json({
      ok: true,
      conversations: (conversations || []).map((conversation) => ({
        ...conversation,
        latest_message: latestByConversation.get(conversation.id) || null,
      })),
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load conversations" }, { status: 500 });
  }
}

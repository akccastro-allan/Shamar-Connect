import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

type ConversationRow = {
  id: string;
  tenant_id: string;
  organization_id: string;
  external_chat_id: string | null;
  name: string | null;
  status: string | null;
  requires_human?: boolean | null;
  pending_reason?: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string | null;
  direction: "inbound" | "outbound" | string | null;
  body: string | null;
  message_type: string | null;
  has_media: boolean | null;
  created_at: string;
};

function addMinutes(value: string, minutes: number) {
  return new Date(new Date(value).getTime() + minutes * 60 * 1000).toISOString();
}

function isAfter(a?: string | null, b?: string | null) {
  if (!a) return false;
  if (!b) return true;
  return new Date(a).getTime() > new Date(b).getTime();
}

function getLatest(messages: MessageRow[], direction?: "inbound" | "outbound") {
  return messages.find((message) => !direction || message.direction === direction) || null;
}

function needsHumanForMessage(message: MessageRow | null) {
  if (!message) return false;
  if (message.has_media) return true;
  const type = String(message.message_type || "text").toLowerCase();
  if (!["text", "chat"].includes(type)) return true;
  return false;
}

function resolvePendingReason(latestInbound: MessageRow | null, latestOutbound: MessageRow | null) {
  if (!latestInbound) return null;
  if (!isAfter(latestInbound.created_at, latestOutbound?.created_at)) return null;

  if (needsHumanForMessage(latestInbound)) {
    return latestInbound.message_type === "sticker" ? "sticker_requires_human" : "media_requires_human";
  }

  return "unanswered_inbound";
}

export async function GET(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseWriteClient();
    const searchParams = request.nextUrl.searchParams;
    const staleMinutes = Math.max(1, Math.min(Number(searchParams.get("staleMinutes") || 15), 240));
    const maxConversations = Math.max(1, Math.min(Number(searchParams.get("limit") || 500), 1000));

    const { data: conversations, error: conversationsError } = await db
      .from("whatsapp_conversations")
      .select("id, tenant_id, organization_id, external_chat_id, name, status, requires_human, pending_reason")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(maxConversations);

    if (conversationsError) throw conversationsError;

    const rows = (conversations || []) as ConversationRow[];
    const conversationIds = rows.map((conversation) => conversation.id);

    let messages: MessageRow[] = [];
    if (conversationIds.length > 0) {
      const { data: messageRows, error: messagesError } = await db
        .from("whatsapp_messages")
        .select("id, conversation_id, direction, body, message_type, has_media, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(maxConversations * 20);

      if (messagesError) throw messagesError;
      messages = (messageRows || []) as MessageRow[];
    }

    const messagesByConversation = new Map<string, MessageRow[]>();
    for (const message of messages) {
      if (!message.conversation_id) continue;
      const current = messagesByConversation.get(message.conversation_id) || [];
      current.push(message);
      messagesByConversation.set(message.conversation_id, current);
    }

    const now = Date.now();
    const updates = [];
    const events = [];

    for (const conversation of rows) {
      const conversationMessages = messagesByConversation.get(conversation.id) || [];
      const latestMessage = getLatest(conversationMessages);
      const latestInbound = getLatest(conversationMessages, "inbound");
      const latestOutbound = getLatest(conversationMessages, "outbound");
      const pendingReason = resolvePendingReason(latestInbound, latestOutbound);
      const requiresHuman = Boolean(pendingReason);
      const slaDueAt = latestInbound && requiresHuman ? addMinutes(latestInbound.created_at, staleMinutes) : null;
      const slaStatus = requiresHuman
        ? slaDueAt && new Date(slaDueAt).getTime() < now
          ? "breached"
          : "pending"
        : "ok";

      const patch = {
        last_inbound_at: latestInbound?.created_at || null,
        last_outbound_at: latestOutbound?.created_at || null,
        last_message_direction: latestMessage?.direction || null,
        requires_human: requiresHuman,
        pending_reason: pendingReason,
        sla_status: slaStatus,
        sla_due_at: slaDueAt,
        watchdog_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await db
        .from("whatsapp_conversations")
        .update(patch)
        .eq("id", conversation.id)
        .eq("tenant_id", context.tenantId)
        .eq("organization_id", context.organizationId);

      if (updateError) throw updateError;

      updates.push({
        conversationId: conversation.id,
        name: conversation.name,
        externalChatId: conversation.external_chat_id,
        requiresHuman,
        pendingReason,
        slaStatus,
        slaDueAt,
        lastInboundAt: latestInbound?.created_at || null,
        lastOutboundAt: latestOutbound?.created_at || null,
      });

      if (requiresHuman && !conversation.requires_human) {
        events.push({
          tenant_id: context.tenantId,
          organization_id: context.organizationId,
          conversation_id: conversation.id,
          event_type: "requires_human",
          event_source: "watchdog",
          description: pendingReason === "unanswered_inbound"
            ? "Cliente respondeu e ainda não recebeu retorno."
            : "Mensagem requer análise humana.",
          metadata: {
            pendingReason,
            staleMinutes,
            latestInboundAt: latestInbound?.created_at || null,
            latestOutboundAt: latestOutbound?.created_at || null,
          },
        });
      }
    }

    if (events.length > 0) {
      const { error: eventsError } = await db.from("whatsapp_conversation_events").insert(events);
      if (eventsError) throw eventsError;
    }

    return NextResponse.json({
      ok: true,
      checkedAt: new Date().toISOString(),
      staleMinutes,
      scannedConversations: rows.length,
      requiresHuman: updates.filter((item) => item.requiresHuman).length,
      breached: updates.filter((item) => item.slaStatus === "breached").length,
      pending: updates.filter((item) => item.slaStatus === "pending").length,
      updates,
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to run WhatsApp watchdog" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

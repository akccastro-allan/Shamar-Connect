import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createWhatsappGatewayClient, isAllowedSessionId, whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const body = await request.json();

    const conversationId = String(body?.conversationId || "");
    const text = String(body?.body || "").trim();

    if (!conversationId || !text) {
      return NextResponse.json({ ok: false, error: "conversationId and body are required" }, { status: 400 });
    }

    const client = createSupabaseWriteClient();

    const { data: conversation, error: conversationError } = await client
      .from("whatsapp_conversations")
      .select("id, external_chat_id, contact_id, tenant_id, organization_id, channel_id")
      .eq("id", conversationId)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .maybeSingle();

    if (conversationError) throw conversationError;

    if (!conversation?.external_chat_id) {
      return NextResponse.json({ ok: false, error: "Conversa não encontrada ou sem external_chat_id." }, { status: 404 });
    }

    // Resolve the gateway session that owns this conversation's channel,
    // otherwise the default session (hall-main) is used and the send fails.
    let sessionId: string | null = null;
    if (conversation.channel_id) {
      const { data: ch } = await client
        .from("channels")
        .select("session_id")
        .eq("id", conversation.channel_id)
        .maybeSingle();
      sessionId = ch?.session_id ?? null;
    }
    if (!sessionId) {
      const { data: ch } = await client
        .from("channels")
        .select("session_id")
        .eq("tenant_id", context.tenantId)
        .eq("organization_id", context.organizationId)
        .not("session_id", "is", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      sessionId = ch?.session_id ?? null;
    }

    const gatewayClient =
      sessionId && isAllowedSessionId(sessionId)
        ? createWhatsappGatewayClient(sessionId)
        : whatsappWebGatewayClient;

    const sent = await gatewayClient.sendMessage({
      to: conversation.external_chat_id,
      body: text,
    });

    const now = new Date().toISOString();
    const externalMessageId = sent.id || `manual:${conversation.id}:${Date.now()}`;

    // Use insert instead of upsert here because the production uniqueness is backed by
    // partial indexes. PostgREST cannot reliably infer partial indexes with ON CONFLICT,
    // which caused the gateway send to succeed while persistence failed afterward.
    const { data: savedMessage, error: messageError } = await client
      .from("whatsapp_messages")
      .insert({
        tenant_id: context.tenantId,
        organization_id: context.organizationId,
        channel_id: conversation.channel_id || null,
        external_message_id: externalMessageId,
        provider: "whatsapp_web",
        conversation_id: conversation.id,
        contact_id: conversation.contact_id || null,
        direction: "outbound",
        from_id: "shamarconnect",
        to_id: conversation.external_chat_id,
        body: text,
        message_type: "text",
        raw_payload: { sent, source: "inbox_manual_reply" },
        created_at: now,
      })
      .select("id, external_message_id, conversation_id, contact_id, direction, from_id, to_id, body, message_type, created_at")
      .single();

    if (messageError) throw messageError;

    const { error: updateError } = await client
      .from("whatsapp_conversations")
      .update({
        last_message_at: now,
        updated_at: now,
        status: "pending",
      })
      .eq("id", conversation.id)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, messageId: externalMessageId, status: sent.status, message: savedMessage });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to send inbox message" },
      { status: 500 },
    );
  }
}

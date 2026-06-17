import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
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
      .select("id, external_chat_id, contact_id, tenant_id, organization_id")
      .eq("id", conversationId)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .maybeSingle();

    if (conversationError) throw conversationError;

    if (!conversation?.external_chat_id) {
      return NextResponse.json({ ok: false, error: "Conversa não encontrada ou sem external_chat_id." }, { status: 404 });
    }

    const sent = await whatsappWebGatewayClient.sendMessage({
      to: conversation.external_chat_id,
      body: text,
    });

    const now = new Date().toISOString();

    const { error: messageError } = await client
      .from("whatsapp_messages")
      .upsert(
        {
          tenant_id: context.tenantId,
          organization_id: context.organizationId,
          external_message_id: sent.id,
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
        },
        { onConflict: "organization_id,provider,external_message_id" },
      );

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

    return NextResponse.json({ ok: true, messageId: sent.id, status: sent.status });
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


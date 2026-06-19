import { NextRequest, NextResponse } from "next/server";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

type Params = { params: Promise<{ conversationId: string }> };

export async function POST(request: NextRequest, context: Params) {
  try {
    const { conversationId } = await context.params;
    const body = await request.json();
    const messageBody = String(body?.body || "").trim();

    if (!messageBody) {
      return NextResponse.json({ ok: false, error: "Mensagem vazia." }, { status: 400 });
    }

    if (messageBody.length > 4000) {
      return NextResponse.json({ ok: false, error: "Mensagem muito longa. Limite atual: 4000 caracteres." }, { status: 400 });
    }

    const db = createSupabaseWriteClient();

    const { data: conversation, error: conversationError } = await db
      .from("whatsapp_conversations")
      .select("id, tenant_id, organization_id, external_chat_id, contact_id")
      .eq("id", conversationId)
      .single();

    if (conversationError) throw conversationError;
    if (!conversation?.external_chat_id) {
      return NextResponse.json({ ok: false, error: "Conversa sem chat ID externo." }, { status: 400 });
    }

    const sent = await whatsappWebGatewayClient.sendMessage({
      to: conversation.external_chat_id,
      body: messageBody,
    });

    const now = new Date().toISOString();

    const { data: savedMessage, error: messageError } = await db
      .from("whatsapp_messages")
      .upsert({
        external_message_id: sent.id,
        provider: "whatsapp_web",
        conversation_id: conversation.id,
        contact_id: conversation.contact_id || null,
        direction: "outbound",
        from_id: null,
        to_id: conversation.external_chat_id,
        body: messageBody,
        message_type: "text",
        raw_payload: { providerResult: sent, sentFrom: "whatsapp_service_center" },
        created_at: now,
      }, { onConflict: "external_message_id" })
      .select("id, external_message_id, direction, from_id, to_id, body, message_type, created_at")
      .single();

    if (messageError) throw messageError;

    // After a human reply, clear the pending queue and SLA flags
    const { error: updateError } = await db
      .from("whatsapp_conversations")
      .update({
        last_message_at: now,
        last_outbound_at: now,
        last_message_direction: "outbound",
        requires_human: false,
        pending_reason: null,
        sla_status: "ok",
        sla_due_at: null,
        updated_at: now,
      })
      .eq("id", conversation.id);

    if (updateError) throw updateError;

    if (conversation.tenant_id && conversation.organization_id) {
      await db.from("whatsapp_conversation_events").insert({
        tenant_id: conversation.tenant_id,
        organization_id: conversation.organization_id,
        conversation_id: conversation.id,
        event_type: "human_reply_sent",
        event_source: "service_center",
        description: "Atendente enviou resposta manual.",
        metadata: {
          sentMessageId: sent.id,
          bodyLength: messageBody.length,
        },
      });
    }

    return NextResponse.json({ ok: true, message: savedMessage });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao enviar mensagem" }, { status: 500 });
  }
}

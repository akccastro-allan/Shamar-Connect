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
      .select("id, external_chat_id, contact_id")
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

    const { error: updateError } = await db
      .from("whatsapp_conversations")
      .update({ last_message_at: now, updated_at: now })
      .eq("id", conversation.id);

    if (updateError) throw updateError;

    await db.from("provider_events").insert({
      provider: "whatsapp_web",
      event: "message.sent",
      payload: {
        conversationId: conversation.id,
        externalChatId: conversation.external_chat_id,
        messageId: sent.id,
        body: messageBody,
      },
      processed_at: now,
    });

    return NextResponse.json({ ok: true, message: savedMessage });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao enviar mensagem" }, { status: 500 });
  }
}

/**
 * Send a text message via WhatsApp Cloud API.
 * Only for human-triggered replies — never automatic broadcasts.
 * Groups are blocked (Cloud API doesn't support group messaging anyway).
 */

import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { sendTextMessage } from "@/lib/providers/whatsapp-cloud-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();

    const body = await request.json();
    const conversationId = String(body?.conversationId || "").trim();
    const messageBody = String(body?.body || "").trim();

    if (!conversationId) {
      return NextResponse.json({ ok: false, error: "conversationId obrigatório." }, { status: 400 });
    }
    if (!messageBody) {
      return NextResponse.json({ ok: false, error: "Mensagem vazia." }, { status: 400 });
    }
    if (messageBody.length > 4096) {
      return NextResponse.json({ ok: false, error: "Mensagem muito longa (máx 4096 chars)." }, { status: 400 });
    }

    const db = createSupabaseWriteClient();

    const { data: conversation, error: convError } = await db
      .from("whatsapp_conversations")
      .select("id, external_chat_id, provider, is_group, contact_id, tenant_id, organization_id")
      .eq("id", conversationId)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .single();

    if (convError) throw convError;
    if (!conversation) {
      return NextResponse.json({ ok: false, error: "Conversa não encontrada." }, { status: 404 });
    }
    if (conversation.provider !== "whatsapp_cloud") {
      return NextResponse.json({ ok: false, error: "Esta conversa não usa o provider whatsapp_cloud." }, { status: 400 });
    }
    if (conversation.is_group) {
      return NextResponse.json({ ok: false, error: "Não é possível enviar mensagens automáticas para grupos." }, { status: 400 });
    }

    const to = conversation.external_chat_id; // phone number e.g. "5511999999999"

    const sent = await sendTextMessage(to, messageBody);

    const now = new Date().toISOString();

    const { data: savedMessage, error: msgError } = await db
      .from("whatsapp_messages")
      .upsert(
        {
          external_message_id: sent.messageId,
          provider: "whatsapp_cloud",
          conversation_id: conversation.id,
          contact_id: conversation.contact_id || null,
          direction: "outbound",
          from_id: null,
          to_id: to,
          body: messageBody,
          message_type: "text",
          raw_payload: { providerResult: sent, sentFrom: "service_center" },
          created_at: now,
        },
        { onConflict: "external_message_id" },
      )
      .select("id, external_message_id, direction, body, created_at")
      .single();

    if (msgError) throw msgError;

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
        event_source: "service_center_cloud",
        description: "Atendente enviou resposta via WhatsApp Cloud API.",
        metadata: { sentMessageId: sent.messageId, bodyLength: messageBody.length },
      });
    }

    return NextResponse.json({ ok: true, message: savedMessage });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao enviar mensagem" },
      { status: 500 },
    );
  }
}

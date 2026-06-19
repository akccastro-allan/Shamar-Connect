import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import { shouldBlockAiForConversation } from "@/lib/ai/supervised-whatsapp-ai";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const body = await request.json();

    const logId = String(body?.logId || "").trim();
    const finalResponse = String(body?.finalResponse || "").trim();

    if (!logId) {
      return NextResponse.json({ ok: false, error: "logId obrigatório." }, { status: 400 });
    }
    if (!finalResponse) {
      return NextResponse.json({ ok: false, error: "finalResponse obrigatório." }, { status: 400 });
    }

    const db = createSupabaseWriteClient();

    // Load log
    const { data: log, error: logError } = await db
      .from("ai_response_logs")
      .select("id, conversation_id, blocked_reason, risk_level, status, mode, tenant_id, organization_id")
      .eq("id", logId)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .single();

    if (logError || !log) {
      return NextResponse.json({ ok: false, error: "Log de IA não encontrado." }, { status: 404 });
    }

    // Never send if blocked
    if (log.blocked_reason) {
      return NextResponse.json({ ok: false, error: `Envio bloqueado: ${log.blocked_reason}` }, { status: 403 });
    }

    // High risk requires explicit override — caller must pass { forceHighRisk: true }
    if (log.risk_level === "high" && !body?.forceHighRisk) {
      return NextResponse.json(
        { ok: false, error: "Nível de risco alto. Confirme com forceHighRisk: true para enviar.", requiresConfirmation: true },
        { status: 422 },
      );
    }

    // Load conversation
    const { data: conversation, error: convError } = await db
      .from("whatsapp_conversations")
      .select("id, external_chat_id, is_group, contact_id, tenant_id, organization_id")
      .eq("id", log.conversation_id)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ ok: false, error: "Conversa não encontrada." }, { status: 404 });
    }

    // Double-check group rule
    const blockCheck = shouldBlockAiForConversation(conversation);
    if (blockCheck.blocked) {
      await db.from("ai_response_logs").update({ status: "blocked", blocked_reason: blockCheck.reason, updated_at: new Date().toISOString() }).eq("id", logId);
      return NextResponse.json({ ok: false, error: `Conversa de grupo não pode receber resposta de IA: ${blockCheck.reason}` }, { status: 403 });
    }

    // Send via gateway
    const sent = await whatsappWebGatewayClient.sendMessage({
      to: conversation.external_chat_id,
      body: finalResponse,
    });

    const now = new Date().toISOString();

    // Persist message
    const { data: savedMessage } = await db
      .from("whatsapp_messages")
      .upsert({
        external_message_id: sent.id,
        provider: "whatsapp_web",
        conversation_id: conversation.id,
        contact_id: conversation.contact_id ?? null,
        direction: "outbound",
        from_id: null,
        to_id: conversation.external_chat_id,
        body: finalResponse,
        message_type: "text",
        raw_payload: { providerResult: sent, sentFrom: "supervised_ai", aiLogId: logId },
        created_at: now,
      }, { onConflict: "external_message_id" })
      .select("id")
      .single();

    // Update conversation SLA
    await db.from("whatsapp_conversations").update({
      last_message_at: now,
      last_outbound_at: now,
      last_message_direction: "outbound",
      requires_human: false,
      pending_reason: null,
      sla_status: "ok",
      sla_due_at: null,
      updated_at: now,
    }).eq("id", conversation.id);

    // Register event
    await db.from("whatsapp_conversation_events").insert({
      tenant_id: context.tenantId,
      organization_id: context.organizationId,
      conversation_id: conversation.id,
      event_type: "ai_reply_sent",
      event_source: "supervised_ai",
      description: "Resposta de IA supervisionada enviada e aprovada pelo atendente.",
      metadata: {
        aiLogId: logId,
        riskLevel: log.risk_level,
        mode: log.mode,
        messageId: savedMessage?.id ?? null,
      },
    });

    // Update log
    const editedFromSuggestion = body?.editedFromSuggestion === true;
    await db.from("ai_response_logs").update({
      final_response: finalResponse,
      status: editedFromSuggestion ? "edited" : "sent",
      sent_at: now,
      updated_at: now,
    }).eq("id", logId);

    return NextResponse.json({ ok: true, messageId: savedMessage?.id ?? null, logId });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao enviar resposta aprovada." },
      { status: 500 },
    );
  }
}

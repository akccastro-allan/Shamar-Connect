import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { classifyWhatsAppMessage, generateSuggestedReply, shouldBlockAiForConversation } from "@/lib/ai/supervised-whatsapp-ai";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const body = await request.json();

    const conversationId = String(body?.conversationId || "").trim();
    if (!conversationId) {
      return NextResponse.json({ ok: false, error: "conversationId obrigatório." }, { status: 400 });
    }

    const mode = String(body?.mode || "copilot");
    const messageId: string | null = body?.messageId ? String(body.messageId) : null;

    const db = createSupabaseWriteClient();

    // Load conversation
    const { data: conversation, error: convError } = await db
      .from("whatsapp_conversations")
      .select("id, external_chat_id, is_group, contact_id, requires_human, pending_reason, tenant_id, organization_id")
      .eq("id", conversationId)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ ok: false, error: "Conversa não encontrada." }, { status: 404 });
    }

    // ABSOLUTE RULE: groups never get AI
    const blockCheck = shouldBlockAiForConversation(conversation);
    if (blockCheck.blocked) {
      await db.from("ai_response_logs").insert({
        tenant_id: context.tenantId,
        organization_id: context.organizationId,
        conversation_id: conversationId,
        message_id: messageId,
        contact_id: conversation.contact_id ?? null,
        channel: "whatsapp",
        mode,
        status: "blocked",
        blocked_reason: blockCheck.reason,
        metadata: { groupBlocked: true },
      });

      return NextResponse.json({
        ok: true,
        blocked: true,
        blockedReason: blockCheck.reason,
        suggestion: null,
        logId: null,
        mode,
      });
    }

    // Load last messages for context
    const { data: messages } = await db
      .from("whatsapp_messages")
      .select("id, body, direction, message_type, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    const lastInbound = messages?.find((m) => m.direction === "inbound");
    const userMessage = lastInbound?.body || "";
    const messageType = lastInbound?.message_type || null;

    // Generate suggestion
    const suggest = generateSuggestedReply(userMessage, messageType);
    const classify = classifyWhatsAppMessage(userMessage);

    const contextLines = (messages || [])
      .slice(0, 5)
      .reverse()
      .map((m) => `[${m.direction === "inbound" ? "cliente" : "atendente"}] ${m.body || ""}`)
      .join("\n");

    const prompt = `Contexto da conversa:\n${contextLines}\n\nÚltima mensagem do cliente: ${userMessage}`;

    // Insert log
    const { data: log, error: logError } = await db
      .from("ai_response_logs")
      .insert({
        tenant_id: context.tenantId,
        organization_id: context.organizationId,
        conversation_id: conversationId,
        message_id: messageId ?? lastInbound?.id ?? null,
        contact_id: conversation.contact_id ?? null,
        channel: "whatsapp",
        mode,
        prompt,
        user_message: userMessage,
        suggested_response: suggest.suggestion,
        status: "suggested",
        risk_level: suggest.riskLevel,
        intent: suggest.intent,
        blocked_reason: suggest.blockedReason,
        metadata: {
          messageType,
          classifiedIntent: classify.intent,
          messagesContext: (messages || []).length,
        },
      })
      .select("id")
      .single();

    if (logError) throw logError;

    return NextResponse.json({
      ok: true,
      blocked: false,
      suggestion: suggest.suggestion,
      logId: log.id,
      mode,
      riskLevel: suggest.riskLevel,
      intent: suggest.intent,
      blockedReason: suggest.blockedReason,
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao gerar sugestão." },
      { status: 500 },
    );
  }
}

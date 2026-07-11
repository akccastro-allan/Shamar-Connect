import { NextRequest, NextResponse } from "next/server";
import { isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { requireOwnedWhatsappSession } from "../../_auth";

type ConversationRow = {
  id: string;
  tenant_id: string;
  organization_id: string;
  channel_id: string | null;
  external_chat_id: string | null;
  contact_id: string | null;
  name: string | null;
  status: string | null;
  is_group: boolean | null;
  requires_human: boolean | null;
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

type AutomationDecision = {
  intent: string;
  replyBody: string | null;
  requiresHuman: boolean;
  pendingReason: string | null;
  eventType: string;
  description: string;
};

const HUMAN_WORDS = [
  "atendente",
  "humano",
  "pessoa",
  "falar com alguém",
  "falar com alguem",
  "vendedor",
  "consultor",
  "suporte",
];

const URGENT_WORDS = ["urgente", "reclama", "problema", "cancelar", "cancelamento", "reembolso", "processo", "procon"];
const QUOTE_WORDS = ["orçamento", "orcamento", "valor", "preço", "preco", "quanto", "cotação", "cotacao", "peça", "peca"];
const SCHEDULE_WORDS = ["agendar", "agenda", "horário", "horario", "marcar", "revisão", "revisao"];
const FINANCE_WORDS = ["boleto", "segunda via", "financeiro", "pagamento", "nota", "nf", "pix", "cobrança", "cobranca"];

function normalizeText(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function isAfter(a?: string | null, b?: string | null) {
  if (!a) return false;
  if (!b) return true;
  return new Date(a).getTime() > new Date(b).getTime();
}

function getLatest(messages: MessageRow[], direction?: "inbound" | "outbound") {
  return messages.find((message) => !direction || message.direction === direction) || null;
}

function isGroupChat(conversation: ConversationRow) {
  return Boolean(conversation.is_group) || Boolean(conversation.external_chat_id?.endsWith("@g.us"));
}

function isOutsideBusinessHours(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const weekday = parts.find((part) => part.type === "weekday")?.value || "";
  const isSunday = weekday.toLowerCase().startsWith("sun");

  return isSunday || hour < 8 || hour >= 18;
}

function menuReply() {
  return [
    "Olá! Seja bem-vindo(a). Para agilizar seu atendimento, escolha uma opção:",
    "",
    "1️⃣ Orçamento",
    "2️⃣ Agendamento",
    "3️⃣ Financeiro / segunda via",
    "4️⃣ Falar com atendente",
    "",
    "Se preferir, descreva em uma frase o que você precisa.",
  ].join("\n");
}

function decideAutomation(latestInbound: MessageRow, inboundCount: number): AutomationDecision {
  const text = normalizeText(latestInbound.body);
  const messageType = normalizeText(latestInbound.message_type || "text");
  const hasMedia = Boolean(latestInbound.has_media);

  if (hasMedia || !["text", "chat"].includes(messageType)) {
    const isSticker = messageType === "sticker";
    return {
      intent: isSticker ? "sticker" : "media",
      replyBody: "Recebi sua mensagem e vou encaminhar para um atendente verificar com atenção.",
      requiresHuman: true,
      pendingReason: isSticker ? "sticker_requires_human" : "media_requires_human",
      eventType: "automation.media_handoff",
      description: isSticker ? "Figurinha recebida e encaminhada para atendimento humano." : "Mídia recebida e encaminhada para atendimento humano.",
    };
  }

  if (includesAny(text, URGENT_WORDS)) {
    return {
      intent: "urgent",
      replyBody: "Entendi. Vou priorizar seu atendimento e encaminhar para um atendente agora.",
      requiresHuman: true,
      pendingReason: "urgent_requires_human",
      eventType: "automation.urgent_handoff",
      description: "Mensagem com indício de urgência/reclamação encaminhada para humano.",
    };
  }

  if (text === "4" || includesAny(text, HUMAN_WORDS)) {
    return {
      intent: "human",
      replyBody: "Certo. Vou encaminhar você para um atendente. Seu atendimento ficará na fila por ordem de chegada.",
      requiresHuman: true,
      pendingReason: "customer_requested_human",
      eventType: "automation.human_requested",
      description: "Cliente pediu atendimento humano.",
    };
  }

  if (text === "1" || includesAny(text, QUOTE_WORDS)) {
    return {
      intent: "quote",
      replyBody: [
        "Perfeito. Para orçamento, envie por favor:",
        "",
        "1. Modelo do veículo",
        "2. Ano",
        "3. Peça ou serviço desejado",
        "4. Foto, se tiver",
        "",
        "Assim que recebermos, um atendente confirma disponibilidade e valor.",
      ].join("\n"),
      requiresHuman: true,
      pendingReason: "quote_needs_human",
      eventType: "automation.quote_triage",
      description: "Cliente direcionado para fluxo de orçamento.",
    };
  }

  if (text === "2" || includesAny(text, SCHEDULE_WORDS)) {
    return {
      intent: "scheduling",
      replyBody: [
        "Certo. Para agendamento, me envie:",
        "",
        "1. Nome",
        "2. Serviço desejado",
        "3. Melhor dia",
        "4. Melhor horário",
        "",
        "Um atendente vai confirmar a disponibilidade.",
      ].join("\n"),
      requiresHuman: true,
      pendingReason: "scheduling_needs_confirmation",
      eventType: "automation.scheduling_triage",
      description: "Cliente direcionado para fluxo de agendamento.",
    };
  }

  if (text === "3" || includesAny(text, FINANCE_WORDS)) {
    return {
      intent: "finance",
      replyBody: "Entendi. Para localizar seu atendimento, envie o nome completo do titular ou CPF/CNPJ. Depois disso, um atendente vai conferir.",
      requiresHuman: true,
      pendingReason: "finance_needs_human",
      eventType: "automation.finance_triage",
      description: "Cliente direcionado para fluxo financeiro.",
    };
  }

  if (isOutsideBusinessHours()) {
    return {
      intent: "after_hours",
      replyBody: [
        "Olá! No momento estamos fora do horário de atendimento.",
        "Atendemos de segunda a sexta das 8h às 18h e aos sábados das 8h às 14h.",
        "",
        "Seu contato foi registrado e será atendido por ordem de chegada no próximo horário comercial.",
        "",
        "Para adiantar, envie nome, serviço desejado e detalhes do pedido.",
      ].join("\n"),
      requiresHuman: true,
      pendingReason: "after_hours_followup",
      eventType: "automation.after_hours_reply",
      description: "Resposta automática fora do horário comercial.",
    };
  }

  if (inboundCount <= 1 || text.length <= 8) {
    return {
      intent: "menu",
      replyBody: menuReply(),
      requiresHuman: false,
      pendingReason: null,
      eventType: "automation.menu_sent",
      description: "Menu inicial enviado automaticamente.",
    };
  }

  return {
    intent: "fallback",
    replyBody: "Recebi sua mensagem. Vou encaminhar para um atendente para evitar qualquer erro no atendimento.",
    requiresHuman: true,
    pendingReason: "automation_uncertain",
    eventType: "automation.fallback_handoff",
    description: "Automação não classificou com segurança e encaminhou para humano.",
  };
}

async function persistOutboundMessage(
  db: ReturnType<typeof createSupabaseWriteClient>,
  conversation: ConversationRow,
  sent: { id: string; status: "queued" | "sent" },
  body: string,
  metadata: Record<string, unknown>,
) {
  const now = new Date().toISOString();

  const { error: messageError } = await db.from("whatsapp_messages").upsert({
    tenant_id: conversation.tenant_id,
    organization_id: conversation.organization_id,
    external_message_id: sent.id,
    provider: "whatsapp_web",
    channel_id: conversation.channel_id,
    conversation_id: conversation.id,
    contact_id: conversation.contact_id || null,
    direction: "outbound",
    from_id: null,
    to_id: conversation.external_chat_id,
    body,
    message_type: "text",
    raw_payload: { providerResult: sent, sentFrom: "safe_automation", ...metadata },
    has_media: false,
    media_count: 0,
    media_summary: null,
    created_at: now,
  }, { onConflict: "channel_id,external_message_id" });

  if (messageError) throw messageError;

  return now;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.max(1, Math.min(Number(searchParams.get("limit") || 50), 200));
    const dryRun = searchParams.get("dryRun") === "1" || searchParams.get("dryRun") === "true";

    // sessionId selects which gateway sends messages and which conversations to process.
    // Defaults to hall-main for backward compatibility.
    const sessionId = searchParams.get("sessionId") || "hall-main";
    const session = await requireOwnedWhatsappSession(sessionId);
    if (!session.ok) return session.response;
    const { context, db, resolved, channelId } = session;

    // Verify gateway is ready before processing any conversations
    const gatewayStatus = await resolved.client.getStatus().catch(() => null);
    const gatewayReady = gatewayStatus?.status === "ready" || gatewayStatus?.status === "authenticated";
    if (!gatewayReady && !dryRun) {
      return NextResponse.json({
        ok: false,
        error: `Gateway ${resolved.sessionId} não está pronto (status: ${gatewayStatus?.status ?? "unreachable"}). Conecte o WhatsApp antes de rodar a automação.`,
        gatewayStatus: gatewayStatus?.status ?? "unreachable",
      }, { status: 503 });
    }

    let conversationsQuery = db
      .from("whatsapp_conversations")
      .select("id, tenant_id, organization_id, channel_id, external_chat_id, contact_id, name, status, is_group, requires_human")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("provider", "whatsapp_web")
      .not("external_chat_id", "is", null)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    conversationsQuery = conversationsQuery.eq("channel_id", channelId);

    const { data: conversations, error: conversationsError } = await conversationsQuery;

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
        .limit(limit * 20);

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

    const latestInboundIds = messages
      .filter((message) => message.direction === "inbound")
      .map((message) => message.id);

    let alreadyProcessedInboundIds = new Set<string>();
    if (latestInboundIds.length > 0) {
      const deduplicationCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: eventRows, error: eventsError } = await db
        .from("whatsapp_conversation_events")
        .select("metadata")
        .eq("tenant_id", context.tenantId)
        .eq("organization_id", context.organizationId)
        .eq("event_source", "safe_automation")
        .gte("created_at", deduplicationCutoff)
        .limit(5000);

      if (eventsError) throw eventsError;

      alreadyProcessedInboundIds = new Set(
        (eventRows || [])
          .map((event: { metadata: { latestInboundId?: string } | null }) => {
            const metadata = event.metadata as { latestInboundId?: string } | null;
            return metadata?.latestInboundId || null;
          })
          .filter(Boolean) as string[],
      );
    }

    const processed: object[] = [];
    const skipped: object[] = [];
    const failed: object[] = [];

    for (const conversation of rows) {
      const conversationMessages = messagesByConversation.get(conversation.id) || [];
      const latestInbound = getLatest(conversationMessages, "inbound");
      const latestOutbound = getLatest(conversationMessages, "outbound");
      const inboundCount = conversationMessages.filter((message) => message.direction === "inbound").length;

      if (!latestInbound) {
        skipped.push({ conversationId: conversation.id, name: conversation.name, reason: "no_inbound_message" });
        continue;
      }

      if (!isAfter(latestInbound.created_at, latestOutbound?.created_at)) {
        skipped.push({ conversationId: conversation.id, name: conversation.name, reason: "already_answered" });
        continue;
      }

      if (alreadyProcessedInboundIds.has(latestInbound.id)) {
        skipped.push({ conversationId: conversation.id, name: conversation.name, reason: "already_processed_latest_inbound" });
        continue;
      }

      if (!conversation.external_chat_id) {
        skipped.push({ conversationId: conversation.id, name: conversation.name, reason: "missing_external_chat_id" });
        continue;
      }

      // Groups are never replied to automatically — mark requires_human and skip sending
      if (isGroupChat(conversation)) {
        if (!dryRun) {
          try {
            const now = new Date().toISOString();
            const slaDueAt = new Date(new Date(latestInbound.created_at).getTime() + 15 * 60 * 1000).toISOString();
            const slaStatus = new Date(slaDueAt).getTime() < Date.now() ? "breached" : "pending";

            await db
              .from("whatsapp_conversations")
              .update({
                requires_human: true,
                pending_reason: "group_lead_source_only",
                sla_status: slaStatus,
                sla_due_at: slaDueAt,
                last_message_at: latestInbound.created_at,
                updated_at: now,
              })
              .eq("id", conversation.id)
              .eq("tenant_id", context.tenantId)
              .eq("organization_id", context.organizationId);

            await db.from("whatsapp_conversation_events").insert({
              tenant_id: context.tenantId,
              organization_id: context.organizationId,
              conversation_id: conversation.id,
              event_type: "automation.group_skipped",
              event_source: "safe_automation",
              description: "Grupo ignorado pela automacao. Somente leitura e captacao de leads.",
              metadata: {
                latestInboundId: latestInbound.id,
                latestInboundAt: latestInbound.created_at,
                dryRun,
              },
            });
          } catch (groupError) {
            failed.push({
              conversationId: conversation.id,
              name: conversation.name,
              reason: "group_handoff_db_error",
              error: groupError instanceof Error ? groupError.message : String(groupError),
            });
            continue;
          }
        }

        skipped.push({
          conversationId: conversation.id,
          name: conversation.name,
          externalChatId: conversation.external_chat_id,
          latestInboundId: latestInbound.id,
          reason: "group_lead_source_only",
          replied: false,
          skippedReason: "group_lead_source_only",
          requiresHuman: true,
          pendingReason: "group_lead_source_only",
          dryRun,
        });
        continue;
      }

      const decision = decideAutomation(latestInbound, inboundCount);
      let sentMessageId: string | null = null;
      let sentAt: string | null = null;

      try {
        if (!dryRun) {
          // Register attempt before sending so failures are traceable
          await db.from("whatsapp_conversation_events").insert({
            tenant_id: context.tenantId,
            organization_id: context.organizationId,
            conversation_id: conversation.id,
            event_type: "automation_attempt",
            event_source: "safe_automation",
            description: "Automação iniciando processamento.",
            metadata: {
              intent: decision.intent,
              latestInboundId: latestInbound.id,
              latestInboundAt: latestInbound.created_at,
              dryRun,
            },
          });
        }

        if (decision.replyBody && !dryRun) {
          const sent = await resolved.client.sendMessage({
            to: conversation.external_chat_id,
            body: decision.replyBody,
          });
          sentMessageId = sent.id;
          sentAt = await persistOutboundMessage(db, conversation, sent, decision.replyBody, {
            automationIntent: decision.intent,
            latestInboundId: latestInbound.id,
          });
        }

        if (!dryRun) {
          const now = new Date().toISOString();

          const conversationPatch: Record<string, unknown> = {
            last_message_at: sentAt || latestInbound.created_at,
            updated_at: now,
          };

          if (sentAt) {
            conversationPatch.last_outbound_at = sentAt;
            conversationPatch.last_message_direction = "outbound";
          }

          // Only update human/SLA fields if the decision says so; never clear human flag via bot
          if (decision.requiresHuman) {
            conversationPatch.requires_human = true;
            conversationPatch.pending_reason = decision.pendingReason;
            conversationPatch.sla_status = "pending";
          } else if (!decision.requiresHuman && sentAt) {
            // Bot handled it fully (e.g. menu) — safe to mark ok
            conversationPatch.requires_human = false;
            conversationPatch.pending_reason = null;
            conversationPatch.sla_status = "ok";
            conversationPatch.sla_due_at = null;
          }

          const { error: updateError } = await db
            .from("whatsapp_conversations")
            .update(conversationPatch)
            .eq("id", conversation.id)
            .eq("tenant_id", context.tenantId)
            .eq("organization_id", context.organizationId);

          if (updateError) throw updateError;

          const { error: eventError } = await db.from("whatsapp_conversation_events").insert({
            tenant_id: context.tenantId,
            organization_id: context.organizationId,
            conversation_id: conversation.id,
            event_type: sentMessageId ? "automation_sent" : decision.eventType,
            event_source: "safe_automation",
            description: decision.description,
            metadata: {
              intent: decision.intent,
              latestInboundId: latestInbound.id,
              latestInboundAt: latestInbound.created_at,
              sentMessageId,
              dryRun,
              requiresHuman: decision.requiresHuman,
              pendingReason: decision.pendingReason,
            },
          });

          if (eventError) throw eventError;
        }

        processed.push({
          conversationId: conversation.id,
          name: conversation.name,
          externalChatId: conversation.external_chat_id,
          latestInboundId: latestInbound.id,
          intent: decision.intent,
          replied: Boolean(decision.replyBody),
          sentMessageId,
          requiresHuman: decision.requiresHuman,
          pendingReason: decision.pendingReason,
          dryRun,
        });
      } catch (conversationError) {
        // Record failure event if possible, but don't abort remaining conversations
        try {
          if (!dryRun) {
            await db.from("whatsapp_conversation_events").insert({
              tenant_id: context.tenantId,
              organization_id: context.organizationId,
              conversation_id: conversation.id,
              event_type: "automation_failed",
              event_source: "safe_automation",
              description: "Falha ao processar automação para esta conversa.",
              metadata: {
                latestInboundId: latestInbound.id,
                error: conversationError instanceof Error ? conversationError.message : String(conversationError),
                dryRun,
              },
            });
          }
        } catch {
          // Ignore secondary failure — the primary error is already recorded below
        }

        failed.push({
          conversationId: conversation.id,
          name: conversation.name,
          error: conversationError instanceof Error ? conversationError.message : String(conversationError),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      checkedAt: new Date().toISOString(),
      dryRun,
      scannedConversations: rows.length,
      processed: processed.length,
      skipped: skipped.length,
      repliesSent: (processed as Array<{ sentMessageId: string | null }>).filter((item) => item.sentMessageId).length,
      requiresHuman: (processed as Array<{ requiresHuman: boolean }>).filter((item) => item.requiresHuman).length,
      failed: failed.length,
      items: processed,
      skippedItems: skipped,
      errorItems: failed,
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to process WhatsApp automation" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

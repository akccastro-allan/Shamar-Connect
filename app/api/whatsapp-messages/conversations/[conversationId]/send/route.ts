import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { normalizeProvider } from "@/lib/providers/provider-aliases";
import { dispatchOutboxItem } from "@/lib/outbox/send";
import { recordQueueEvent } from "@/lib/queues/lips-queue";
import { assertQueueTransition } from "@/lib/queues/lips-routing";

type Params = { params: Promise<{ conversationId: string }> };

const BR_PHONE = /^55[1-9][0-9]{9,10}$/;

type Db = ReturnType<typeof createSupabaseWriteClient>;

// @lid não recebe mensagens: recupera o número real (@c.us) do histórico.
async function resolveRealNumberFromHistory(db: Db, conversationId: string): Promise<string | null> {
  const { data: conv } = await db
    .from("whatsapp_conversations")
    .select("contact_id, crm_contacts:contact_id(phone)")
    .eq("id", conversationId)
    .maybeSingle();
  const contactPhone = String(
    (conv as { crm_contacts?: { phone?: string | null } } | null)?.crm_contacts?.phone ?? "",
  ).replace(/\D/g, "");
  if (BR_PHONE.test(contactPhone)) return contactPhone;

  const { data } = await db
    .from("whatsapp_messages")
    .select("raw_payload, from_id, to_id, direction")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(100);

  for (const m of data ?? []) {
    const payload = (m.raw_payload ?? {}) as { phone?: unknown };
    const ph = String(payload.phone ?? "").replace(/\D/g, "");
    if (BR_PHONE.test(ph)) return ph;
  }
  for (const m of data ?? []) {
    if (m.direction !== "outbound" || typeof m.to_id !== "string" || !m.to_id.endsWith("@c.us")) continue;
    const d = m.to_id.replace(/@.*/, "").replace(/\D/g, "");
    if (BR_PHONE.test(d)) return d;
  }
  return null;
}

/**
 * Resolve o canal pelo qual responder. Se a conversa já tem channel_id, usa.
 * Senão, tenta o ÚNICO canal da empresa para aquele provider e faz backfill.
 * Sem canal claro → null (o chamador falha explicitamente).
 */
async function resolveConversationChannel(
  db: Db,
  conversation: { id: string; channel_id: string | null; provider: string | null; organization_id: string },
): Promise<string | null> {
  if (conversation.channel_id) return conversation.channel_id;

  const provider = normalizeProvider(conversation.provider) || "whatsapp_web_legacy";
  const dbProvider = provider === "whatsapp_web_legacy" ? "whatsapp_web" : provider;

  const { data: channels } = await db
    .from("channels")
    .select("id")
    .eq("organization_id", conversation.organization_id)
    .eq("provider", dbProvider)
    .limit(2);

  if (!channels || channels.length !== 1) return null; // 0 ou ambíguo
  const channelId = channels[0].id;
  await db.from("whatsapp_conversations").update({ channel_id: channelId }).eq("id", conversation.id);
  return channelId;
}

export async function POST(request: NextRequest, context: Params) {
  try {
    const appContext = await getRequiredAppContext();
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
      .select("id, tenant_id, organization_id, external_chat_id, contact_id, provider, is_group, channel_id, queue_status, assigned_user_id, assigned_to, first_human_response_at, first_human_response_seconds, queue_entered_at")
      .eq("id", conversationId)
      .eq("tenant_id", appContext.tenantId)
      .eq("organization_id", appContext.organizationId)
      .maybeSingle();

    if (conversationError) throw conversationError;
    if (!conversation) {
      return NextResponse.json({ ok: false, error: "Conversa não encontrada." }, { status: 404 });
    }
    if (!conversation.external_chat_id) {
      return NextResponse.json({ ok: false, error: "Conversa sem destino externo." }, { status: 400 });
    }
    if (conversation.is_group) {
      return NextResponse.json({ ok: false, error: "Não é possível enviar mensagens para grupos." }, { status: 400 });
    }
    const assignee = conversation.assigned_user_id ?? conversation.assigned_to;
    assertQueueTransition({ from: conversation.queue_status, to: "awaiting_customer", hasAssignee: Boolean(assignee) });

    // North Star: nada sai sem canal. Resolve/backfill o canal da conversa.
    const channelId = await resolveConversationChannel(db, conversation);
    if (!channelId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Não foi possível identificar por qual canal responder. Verifique a conexão desta empresa em Configurações.",
          code: "unresolved_channel",
        },
        { status: 409 },
      );
    }

    // Destino: @lid não recebe; recupera número real (@c.us).
    let target = conversation.external_chat_id;
    if (target.endsWith("@lid")) {
      const realNumber = await resolveRealNumberFromHistory(db, conversation.id);
      if (realNumber) target = `${realNumber}@c.us`;
    }

    const now = new Date().toISOString();

    // 1) Mensagem outbound LOCAL (sempre visível na conversa), status inicial queued.
    const { data: localMessage, error: messageError } = await db
      .from("whatsapp_messages")
      .insert({
        provider: conversation.provider,
        channel_id: channelId,
        tenant_id: conversation.tenant_id,
        organization_id: conversation.organization_id,
        conversation_id: conversation.id,
        contact_id: conversation.contact_id || null,
        direction: "outbound",
        delivery_status: "queued",
        from_id: null,
        to_id: conversation.external_chat_id,
        body: messageBody,
        message_type: "text",
        raw_payload: { sentFrom: "whatsapp_service_center" },
        created_at: now,
      })
      .select("id")
      .single();
    if (messageError) throw messageError;

    // 2) Item de fila (outbox) ligado à mensagem local.
    const { data: outbox, error: outboxError } = await db
      .from("message_outbox")
      .insert({
        tenant_id: conversation.tenant_id,
        organization_id: conversation.organization_id,
        channel_id: channelId,
        conversation_id: conversation.id,
        message_id: localMessage.id,
        to_external_id: target,
        body: messageBody,
        message_type: "text",
        status: "queued",
        created_by: appContext.appUserId,
        created_at: now,
      })
      .select("id, channel_id, message_id, to_external_id, body, attempts")
      .single();
    if (outboxError) throw outboxError;

    // 3) Tenta enviar 1x na hora (UX instantânea). Falha fica na fila p/ o worker.
    const result = await dispatchOutboxItem(db, outbox);

    // 4) Conversa: resposta humana limpa fila/SLA.
    await db
      .from("whatsapp_conversations")
      .update({
        last_message_at: now,
        last_outbound_at: now,
        last_message_direction: "outbound",
        queue_status: "awaiting_customer",
        assigned_user_id: assignee,
        assigned_to: assignee,
        requires_human: false,
        pending_reason: null,
        sla_status: "completed",
        sla_due_at: null,
        first_human_response_at: conversation.first_human_response_at ?? now,
        first_human_response_seconds: conversation.first_human_response_seconds ?? (conversation.first_human_response_at || !conversation.queue_entered_at ? null : Math.max(0, Math.round((new Date(now).getTime() - new Date(conversation.queue_entered_at).getTime()) / 1000))),
        last_human_message_at: now,
        updated_at: now,
      })
      .eq("id", conversation.id);

    if (conversation.tenant_id && conversation.organization_id) {
      await recordQueueEvent(db, {
        tenantId: conversation.tenant_id,
        organizationId: conversation.organization_id,
        conversationId: conversation.id,
        actorType: "user",
        actorId: appContext.appUserId,
        eventType: "human_replied",
        newState: "awaiting_customer",
        description: "Atendente enviou resposta manual.",
        metadata: { messageId: localMessage.id, deliveryStatus: result, bodyLength: messageBody.length },
      });
    }

    // Relê a mensagem com o status final para a UI.
    const { data: savedMessage } = await db
      .from("whatsapp_messages")
      .select("id, external_message_id, direction, delivery_status, from_id, to_id, body, message_type, created_at")
      .eq("id", localMessage.id)
      .single();

    // Mensagem sempre fica visível na conversa; delivered indica se já saiu.
    return NextResponse.json({ ok: true, delivered: result === "sent", message: savedMessage });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    const raw = error instanceof Error ? error.message : "";
    if (/not ready|client is not ready|409|disconnected|idle|session/i.test(raw)) {
      return NextResponse.json(
        { ok: false, error: "Seu WhatsApp está desconectado. Vá em Configurações → Conexão WhatsApp e reconecte para enviar mensagens.", code: "whatsapp_disconnected" },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: false, error: raw || "Falha ao enviar mensagem" }, { status: 500 });
  }
}

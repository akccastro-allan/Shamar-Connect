import { NextRequest, NextResponse } from "next/server";
import { createWhatsappGatewayClient, isAllowedSessionId, whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import { sendTextMessage as cloudSendText } from "@/lib/providers/whatsapp-cloud-client";
import { sendText as socialSendText } from "@/lib/providers/meta-social-client";
import { sendText as evolutionSendText } from "@/lib/providers/evolution-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

type Params = { params: Promise<{ conversationId: string }> };

const BR_PHONE = /^55[1-9][0-9]{9,10}$/;

// Reforço @lid: o WhatsApp não entrega mensagens endereçadas a um @lid. Quando a
// conversa está chaveada por @lid, recuperamos o número real (@c.us) a partir do
// histórico — o gateway grava o número resolvido em raw_payload.phone, e mensagens
// antigas trazem o destinatário em to_id/from_id @c.us. Assim o envio funciona
// mesmo sem depender da resolução no gateway.
async function resolveRealNumberFromHistory(
  db: ReturnType<typeof createSupabaseWriteClient>,
  conversationId: string,
): Promise<string | null> {
  // 0) Telefone real já salvo no contato da conversa (caminho mais confiável).
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
  // Fallback: o número do cliente aparece como to_id de mensagens enviadas (outbound).
  for (const m of data ?? []) {
    if (m.direction !== "outbound" || typeof m.to_id !== "string" || !m.to_id.endsWith("@c.us")) continue;
    const d = m.to_id.replace(/@.*/, "").replace(/\D/g, "");
    if (BR_PHONE.test(d)) return d;
  }
  return null;
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

    // Scope the conversation to the logged-in tenant/org (isolation).
    const { data: conversation, error: conversationError } = await db
      .from("whatsapp_conversations")
      .select("id, tenant_id, organization_id, external_chat_id, contact_id, provider, is_group, channel_id")
      .eq("id", conversationId)
      .eq("tenant_id", appContext.tenantId)
      .eq("organization_id", appContext.organizationId)
      .maybeSingle();

    if (conversationError) throw conversationError;
    if (!conversation) {
      return NextResponse.json({ ok: false, error: "Conversa não encontrada." }, { status: 404 });
    }
    if (!conversation.external_chat_id) {
      return NextResponse.json({ ok: false, error: "Conversa sem chat ID externo." }, { status: 400 });
    }
    if (conversation.is_group) {
      return NextResponse.json({ ok: false, error: "Não é possível enviar mensagens para grupos." }, { status: 400 });
    }

    // Route by provider
    let sentId: string;
    let sentProvider: string;

    if (conversation.provider === "whatsapp_cloud") {
      const result = await cloudSendText(conversation.external_chat_id, messageBody);
      sentId = result.messageId;
      sentProvider = "whatsapp_cloud";
    } else if (conversation.provider === "instagram" || conversation.provider === "messenger") {
      // DM social: usa o token da conta conectada da empresa (social_accounts).
      const { data: account } = await db
        .from("social_accounts")
        .select("access_token")
        .eq("provider", conversation.provider)
        .eq("tenant_id", conversation.tenant_id)
        .eq("organization_id", conversation.organization_id)
        .eq("status", "active")
        .maybeSingle();

      if (!account?.access_token) {
        return NextResponse.json(
          { ok: false, error: "Conta social não conectada para esta empresa." },
          { status: 400 },
        );
      }

      const result = await socialSendText(account.access_token, conversation.external_chat_id, messageBody);
      sentId = result.messageId;
      sentProvider = conversation.provider;
    } else if (conversation.provider === "evolution") {
      // Evolution (Baileys): envia para o número real (sem @lid).
      const result = await evolutionSendText(conversation.external_chat_id, messageBody);
      sentId = result.messageId;
      sentProvider = "evolution";
    } else {
      // Resolve the gateway session that OWNS this conversation's channel.
      // Without this the default session (hall-main) is used and replies from
      // other tenants fail with "client is not ready".
      let sessionId: string | null = null;

      if (conversation.channel_id) {
        const { data: ch } = await db
          .from("channels")
          .select("session_id")
          .eq("id", conversation.channel_id)
          .maybeSingle();
        sessionId = ch?.session_id ?? null;
      }

      if (!sessionId) {
        const { data: ch } = await db
          .from("channels")
          .select("session_id")
          .eq("tenant_id", conversation.tenant_id)
          .eq("organization_id", conversation.organization_id)
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

      // @lid não recebe mensagens: tenta enviar para o número real (@c.us)
      // recuperado do histórico; se não achar, mantém o destino original e deixa
      // o gateway resolver.
      let target = conversation.external_chat_id;
      if (target.endsWith("@lid")) {
        const realNumber = await resolveRealNumberFromHistory(db, conversation.id);
        if (realNumber) target = `${realNumber}@c.us`;
      }

      const result = await gatewayClient.sendMessage({
        to: target,
        body: messageBody,
      });
      sentId = result.id;
      sentProvider = "whatsapp_web";
    }

    const sent = { id: sentId, provider: sentProvider };

    const now = new Date().toISOString();

    const { data: savedMessage, error: messageError } = await db
      .from("whatsapp_messages")
      .upsert({
        external_message_id: sent.id,
        provider: sentProvider,
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
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    const raw = error instanceof Error ? error.message : "";
    // Erro técnico de sessão desconectada → mensagem clara e acionável.
    if (/not ready|client is not ready|409|disconnected|idle|session/i.test(raw)) {
      return NextResponse.json(
        { ok: false, error: "Seu WhatsApp está desconectado. Vá em Configurações → Conexão WhatsApp e reconecte para enviar mensagens.", code: "whatsapp_disconnected" },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: false, error: raw || "Falha ao enviar mensagem" }, { status: 500 });
  }
}

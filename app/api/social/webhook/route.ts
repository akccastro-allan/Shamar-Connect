/**
 * Webhook Meta Messaging — Instagram Direct + Facebook Messenger
 *
 * GET  — verificação hub (subscribe)
 * POST — DMs recebidas
 *
 * Registrar esta URL no app Meta (produtos Messenger e Instagram):
 *   https://seu-dominio.com/api/social/webhook
 *
 * O tenant da empresa é resolvido pela conta conectada em `social_accounts`
 * (entry.id == external_account_id). DMs aparecem na Central de Atendimento
 * porque a lista filtra só por tenant/org, sem filtro de provider.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhook,
  validateSignature,
  parseSocialWebhookPayload,
  getUserProfile,
  type SocialInboundMessage,
} from "@/lib/providers/meta-social-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET — verificação
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = verifyWebhook(
    searchParams.get("hub.mode"),
    searchParams.get("hub.verify_token"),
    searchParams.get("hub.challenge"),
  );

  if (challenge) return new Response(challenge, { status: 200 });
  return NextResponse.json({ ok: false, error: "Webhook verification failed." }, { status: 403 });
}

// ---------------------------------------------------------------------------
// POST — DMs recebidas
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!validateSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const db = createSupabaseWriteClient();
  const now = new Date().toISOString();

  const messages = parseSocialWebhookPayload(body);

  // Sempre registra o evento bruto para auditoria/diagnóstico.
  const { data: savedEvent } = await db
    .from("provider_events")
    .insert({
      provider: messages[0]?.provider || "social",
      event: "webhook.received",
      payload: body as Record<string, unknown>,
      processing_status: "pending",
      created_at: now,
    })
    .select("id")
    .single();

  if (!messages.length) {
    return NextResponse.json({ ok: true, note: "acknowledged_non_message_event" });
  }

  const processed: string[] = [];
  const errors: string[] = [];

  for (const msg of messages) {
    try {
      await processInboundMessage(db, msg, now);
      processed.push(msg.messageId);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${msg.messageId}: ${errMsg}`);
      console.error("[social-webhook] Falha ao processar DM", msg.messageId, errMsg);
    }
  }

  if (savedEvent?.id) {
    await db
      .from("provider_events")
      .update({
        processing_status: errors.length ? "error" : "processed",
        processing_error: errors.length ? errors.join("; ") : null,
        processed_at: new Date().toISOString(),
        processed_payload: { processedMessages: processed.length, errors },
      })
      .eq("id", savedEvent.id);
  }

  // Sempre 200 para a Meta não reenviar.
  return NextResponse.json({ ok: true, processedMessages: processed.length, errors: errors.length });
}

// ---------------------------------------------------------------------------
// Processamento
// ---------------------------------------------------------------------------

async function processInboundMessage(
  db: ReturnType<typeof createSupabaseWriteClient>,
  msg: SocialInboundMessage,
  now: string,
) {
  const { provider, accountId, senderId, messageId, body, messageType, timestamp, rawPayload } = msg;

  // Resolve a empresa dona da conta (entry.id == external_account_id).
  const { data: account } = await db
    .from("social_accounts")
    .select("tenant_id, organization_id, access_token")
    .eq("provider", provider)
    .eq("external_account_id", accountId)
    .eq("status", "active")
    .maybeSingle();

  if (!account) {
    throw new Error(`Conta ${provider} ${accountId} não conectada (social_accounts).`);
  }

  const tenantId = account.tenant_id;
  const organizationId = account.organization_id;

  // Nome do contato via Graph API (DM não traz telefone).
  const profile = await getUserProfile(account.access_token, senderId);
  const displayName = profile.name || senderId;

  // 1. Contato
  const { data: contact, error: contactError } = await db
    .from("crm_contacts")
    .upsert(
      {
        tenant_id: tenantId,
        organization_id: organizationId,
        phone: senderId, // sem telefone real; usamos o id como chave estável
        name: displayName,
        source: provider,
        updated_at: now,
      },
      { onConflict: "phone" },
    )
    .select("id")
    .single();

  if (contactError) throw contactError;
  const contactId = contact?.id || null;

  // 2. Conversa
  const { data: conversation, error: convError } = await db
    .from("whatsapp_conversations")
    .upsert(
      {
        tenant_id: tenantId,
        organization_id: organizationId,
        external_chat_id: senderId,
        provider,
        contact_id: contactId,
        name: displayName,
        is_group: false,
        last_message_at: now,
        last_inbound_at: now,
        last_message_direction: "inbound",
        requires_human: true,
        pending_reason: "new_inbound_message",
        sla_status: "pending",
        updated_at: now,
      },
      { onConflict: "external_chat_id" },
    )
    .select("id")
    .single();

  if (convError) throw convError;
  const conversationId = conversation?.id || null;

  // 3. Mensagem (idempotente por external_message_id)
  const msgTimestamp = timestamp ? new Date(timestamp).toISOString() : now;

  const { error: msgError } = await db.from("whatsapp_messages").upsert(
    {
      tenant_id: tenantId,
      organization_id: organizationId,
      external_message_id: messageId,
      provider,
      conversation_id: conversationId,
      contact_id: contactId,
      direction: "inbound",
      from_id: senderId,
      to_id: accountId,
      body,
      message_type: messageType,
      raw_payload: rawPayload,
      created_at: msgTimestamp,
    },
    { onConflict: "external_message_id" },
  );

  if (msgError) throw msgError;
}

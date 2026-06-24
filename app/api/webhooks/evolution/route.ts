/**
 * Webhook da Evolution API (Baileys) — provider "evolution".
 *
 * Configure na instância Evolution o webhook apontando para:
 *   https://<app>/api/webhooks/evolution
 *
 * MVP por env (uma instância da Lips). O tenant/org vêm de
 * EVOLUTION_TENANT_ID / EVOLUTION_ORGANIZATION_ID. As DMs aparecem na Central
 * porque a lista filtra só por tenant/org, sem filtro de provider.
 */

import { NextRequest, NextResponse } from "next/server";
import { parseEvolutionWebhook, getEvolutionConfig, type EvolutionInbound } from "@/lib/providers/evolution-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  // Health/verify simples.
  return NextResponse.json({ ok: true, service: "evolution-webhook" });
}

export async function POST(request: NextRequest) {
  const cfg = getEvolutionConfig();

  // Valida a apikey (header apikey ou query) quando configurada.
  const headerKey = request.headers.get("apikey") || new URL(request.url).searchParams.get("apikey");
  if (cfg.apiKey && headerKey && headerKey !== cfg.apiKey) {
    return NextResponse.json({ ok: false, error: "Invalid apikey." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const db = createSupabaseWriteClient();
  const now = new Date().toISOString();
  const messages = parseEvolutionWebhook(body);

  await db.from("provider_events").insert({
    provider: "evolution",
    event: "webhook.received",
    payload: body as Record<string, unknown>,
    organization_id: cfg.organizationId || null,
    tenant_id: cfg.tenantId || null,
    processing_status: "pending",
    created_at: now,
  });

  if (!messages.length) {
    return NextResponse.json({ ok: true, note: "acknowledged_non_message_event" });
  }

  if (!cfg.tenantId || !cfg.organizationId) {
    // Sem tenant configurado não há onde gravar — apenas reconhece.
    return NextResponse.json({ ok: true, note: "no_tenant_configured" });
  }

  const errors: string[] = [];
  let processed = 0;

  for (const msg of messages) {
    try {
      await persistInbound(db, msg, cfg.tenantId, cfg.organizationId, now);
      processed += 1;
    } catch (err) {
      errors.push(`${msg.messageId}: ${err instanceof Error ? err.message : String(err)}`);
      console.error("[evolution-webhook]", err);
    }
  }

  // Sempre 200 para a Evolution não reenviar em loop.
  return NextResponse.json({ ok: true, processed, errors: errors.length });
}

async function persistInbound(
  db: ReturnType<typeof createSupabaseWriteClient>,
  msg: EvolutionInbound,
  tenantId: string,
  organizationId: string,
  now: string,
) {
  const displayName = msg.pushName || msg.senderId;

  // Os índices únicos são compostos e parciais; por isso fazemos buscar-e-gravar
  // manual em vez de onConflict (que não casa com índice parcial).

  // 1. Contato (único por organization_id + phone). Grupo não tem contato.
  let contactId: string | null = null;
  if (!msg.isGroup && msg.senderId) {
    const { data: existing } = await db
      .from("crm_contacts")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("phone", msg.senderId)
      .maybeSingle();

    if (existing?.id) {
      contactId = existing.id;
      await db.from("crm_contacts").update({ name: displayName, updated_at: now }).eq("id", existing.id);
    } else {
      const { data: created, error } = await db
        .from("crm_contacts")
        .insert({ tenant_id: tenantId, organization_id: organizationId, phone: msg.senderId, name: displayName, source: "evolution", updated_at: now })
        .select("id")
        .single();
      if (error) throw error;
      contactId = created?.id ?? null;
    }
  }

  // 2. Conversa (única por organization_id + provider + external_chat_id).
  const convFields = {
    name: displayName,
    contact_id: contactId,
    is_group: msg.isGroup,
    last_message_at: now,
    last_inbound_at: now,
    last_message_direction: "inbound",
    requires_human: !msg.isGroup,
    pending_reason: msg.isGroup ? null : "new_inbound_message",
    sla_status: "pending",
    updated_at: now,
  };

  let conversationId: string | null = null;
  const { data: existingConv } = await db
    .from("whatsapp_conversations")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("provider", "evolution")
    .eq("external_chat_id", msg.externalChatId)
    .maybeSingle();

  if (existingConv?.id) {
    conversationId = existingConv.id;
    await db.from("whatsapp_conversations").update(convFields).eq("id", existingConv.id);
  } else {
    const { data: created, error } = await db
      .from("whatsapp_conversations")
      .insert({ tenant_id: tenantId, organization_id: organizationId, external_chat_id: msg.externalChatId, provider: "evolution", ...convFields })
      .select("id")
      .single();
    if (error) throw error;
    conversationId = created?.id ?? null;
  }

  // 3. Mensagem (única por provider + external_message_id) — ignora se já existe.
  const { data: existingMsg } = await db
    .from("whatsapp_messages")
    .select("id")
    .eq("provider", "evolution")
    .eq("external_message_id", msg.messageId)
    .maybeSingle();

  if (existingMsg?.id) return;

  const msgTimestamp = msg.timestamp ? new Date(msg.timestamp).toISOString() : now;
  const { error: msgError } = await db.from("whatsapp_messages").insert({
    tenant_id: tenantId,
    organization_id: organizationId,
    external_message_id: msg.messageId,
    provider: "evolution",
    conversation_id: conversationId,
    contact_id: contactId,
    direction: "inbound",
    from_id: msg.senderId,
    to_id: null,
    body: msg.body,
    message_type: msg.messageType,
    raw_payload: msg.rawPayload,
    created_at: msgTimestamp,
  });
  if (msgError) throw msgError;
}

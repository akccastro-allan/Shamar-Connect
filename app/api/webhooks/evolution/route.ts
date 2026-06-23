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

  // Contato (só para conversa individual; grupo não tem contato único).
  let contactId: string | null = null;
  if (!msg.isGroup && msg.senderId) {
    const { data: contact, error } = await db
      .from("crm_contacts")
      .upsert(
        { tenant_id: tenantId, organization_id: organizationId, phone: msg.senderId, name: displayName, source: "evolution", updated_at: now },
        { onConflict: "phone" },
      )
      .select("id")
      .single();
    if (error) throw error;
    contactId = contact?.id ?? null;
  }

  const { data: conversation, error: convError } = await db
    .from("whatsapp_conversations")
    .upsert(
      {
        tenant_id: tenantId,
        organization_id: organizationId,
        external_chat_id: msg.externalChatId,
        provider: "evolution",
        contact_id: contactId,
        name: displayName,
        is_group: msg.isGroup,
        last_message_at: now,
        last_inbound_at: now,
        last_message_direction: "inbound",
        requires_human: !msg.isGroup,
        pending_reason: msg.isGroup ? null : "new_inbound_message",
        sla_status: "pending",
        updated_at: now,
      },
      { onConflict: "external_chat_id" },
    )
    .select("id")
    .single();
  if (convError) throw convError;

  const msgTimestamp = msg.timestamp ? new Date(msg.timestamp).toISOString() : now;

  const { error: msgError } = await db.from("whatsapp_messages").upsert(
    {
      tenant_id: tenantId,
      organization_id: organizationId,
      external_message_id: msg.messageId,
      provider: "evolution",
      conversation_id: conversation?.id ?? null,
      contact_id: contactId,
      direction: "inbound",
      from_id: msg.senderId,
      to_id: null,
      body: msg.body,
      message_type: msg.messageType,
      raw_payload: msg.rawPayload,
      created_at: msgTimestamp,
    },
    { onConflict: "external_message_id" },
  );
  if (msgError) throw msgError;
}

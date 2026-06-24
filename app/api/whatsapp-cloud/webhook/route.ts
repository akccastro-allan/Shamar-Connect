/**
 * Webhook Meta WhatsApp Cloud API — canal "WhatsApp oficial".
 *
 * GET  — verificação (hub challenge).
 * POST — mensagens recebidas + atualizações de status (entregue/lido/falhou).
 *
 * Marco 1: o canal é resolvido pelo número conectado (metadata.phone_number_id)
 * → channels.phone_number_id. Sem canal reconhecido, não vira atendimento.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhook,
  validateSignature,
  parseCloudWebhookPayload,
} from "@/lib/providers/whatsapp-cloud-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { resolveChannelFromWebhook } from "@/lib/inbox/resolve-channel";
import { ingestInboundMessage, recordUnresolvedEvent } from "@/lib/inbox/persist-inbound";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  const parsed = parseCloudWebhookPayload(body);

  if (!parsed) {
    return NextResponse.json({ ok: true, note: "acknowledged_non_message_event" });
  }

  // Resolve canal pelo número conectado.
  const channel = await resolveChannelFromWebhook(db, "meta_whatsapp", {
    phoneNumberId: parsed.phoneNumberId,
  });
  if (!channel) {
    await recordUnresolvedEvent(db, "meta_whatsapp", body);
    return NextResponse.json({ ok: true, note: "unresolved_channel" });
  }

  let processed = 0;
  let duplicates = 0;
  const errors: string[] = [];

  for (const m of parsed.messages) {
    try {
      const result = await ingestInboundMessage(db, channel, {
        externalEventId: m.waMessageId,
        externalChatId: m.from,
        externalMessageId: m.waMessageId,
        body: m.body,
        messageType: m.messageType,
        timestampMs: m.timestamp ? m.timestamp * 1000 : 0,
        isGroup: false,
        senderExternalId: m.from,
        identityType: "phone",
        displayName: m.contactName,
        rawPayload: m.rawPayload,
      });
      if (result === "processed") processed += 1;
      else duplicates += 1;
    } catch (err) {
      errors.push(`${m.waMessageId}: ${err instanceof Error ? err.message : String(err)}`);
      console.error("[whatsapp-cloud-webhook]", err instanceof Error ? err.message : err);
    }
  }

  // Atualizações de status de entrega (sent/delivered/read/failed) na mensagem local.
  for (const s of parsed.statuses) {
    try {
      await applyDeliveryStatus(db, channel.channelId, s.waMessageId, s.status, s.timestamp);
    } catch (err) {
      console.error("[whatsapp-cloud-webhook] status", err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ ok: true, processed, duplicates, errors: errors.length });
}

async function applyDeliveryStatus(
  db: ReturnType<typeof createSupabaseWriteClient>,
  channelId: string,
  externalMessageId: string,
  status: string,
  timestampSec: number,
) {
  const ts = timestampSec ? new Date(timestampSec * 1000).toISOString() : new Date().toISOString();
  const patch: Record<string, unknown> = { delivery_status: status };
  if (status === "sent") patch.sent_at = ts;
  else if (status === "delivered") patch.delivered_at = ts;
  else if (status === "read") patch.read_at = ts;
  else if (status === "failed") patch.failed_at = ts;

  await db
    .from("whatsapp_messages")
    .update(patch)
    .eq("channel_id", channelId)
    .eq("external_message_id", externalMessageId);
}

/**
 * Meta WhatsApp Cloud API webhook
 *
 * GET  — hub verification (subscribe flow)
 * POST — incoming messages + delivery status updates
 *
 * Register this URL in Meta Business > WhatsApp > Configuration:
 *   https://your-domain.com/api/whatsapp-cloud/webhook
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhook,
  validateSignature,
  parseCloudWebhookPayload,
  type CloudInboundMessage,
} from "@/lib/providers/whatsapp-cloud-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET — webhook verification
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const validChallenge = verifyWebhook(mode, token, challenge);

  if (validChallenge) {
    // Meta expects a plain text response with just the challenge value
    return new Response(validChallenge, { status: 200 });
  }

  return NextResponse.json({ ok: false, error: "Webhook verification failed." }, { status: 403 });
}

// ---------------------------------------------------------------------------
// POST — incoming events
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Validate signature if APP_SECRET is configured
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

  // Persist raw provider event regardless of parse result
  const { data: savedEvent } = await db
    .from("provider_events")
    .insert({
      provider: "whatsapp_cloud",
      event: "webhook.received",
      payload: body as Record<string, unknown>,
      processing_status: "pending",
      created_at: now,
    })
    .select("id")
    .single();

  const parsed = parseCloudWebhookPayload(body);

  if (!parsed) {
    // Not a whatsapp_business_account event (e.g. test ping) — just acknowledge
    return NextResponse.json({ ok: true, note: "acknowledged_non_message_event" });
  }

  const processedMessageIds: string[] = [];
  const errors: string[] = [];

  for (const msg of parsed.messages) {
    try {
      await processInboundMessage(db, msg, now);
      processedMessageIds.push(msg.waMessageId);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${msg.waMessageId}: ${errMsg}`);
      console.error("[whatsapp-cloud-webhook] Failed to process message", msg.waMessageId, errMsg);
    }
  }

  // Update provider_event as processed
  if (savedEvent?.id) {
    await db
      .from("provider_events")
      .update({
        processing_status: errors.length ? "error" : "processed",
        processing_error: errors.length ? errors.join("; ") : null,
        processed_at: new Date().toISOString(),
        processed_payload: {
          processedMessages: processedMessageIds.length,
          statusUpdates: parsed.statuses.length,
          errors,
        },
      })
      .eq("id", savedEvent.id);
  }

  // Always return 200 so Meta doesn't retry
  return NextResponse.json({
    ok: true,
    processedMessages: processedMessageIds.length,
    errors: errors.length,
  });
}

// ---------------------------------------------------------------------------
// Message processing
// ---------------------------------------------------------------------------

async function processInboundMessage(
  db: ReturnType<typeof createSupabaseWriteClient>,
  msg: CloudInboundMessage,
  now: string,
) {
  const { from, waMessageId, body, messageType, contactName, timestamp, rawPayload } = msg;

  if (!from) throw new Error("missing 'from' field");

  // Normalize phone — Cloud API sends without + e.g. "5511999999999"
  const phone = from.replace(/\D/g, "");

  // 1. Upsert CRM contact
  const { data: contact, error: contactError } = await db
    .from("crm_contacts")
    .upsert(
      {
        phone,
        name: contactName || phone,
        source: "whatsapp_cloud",
        updated_at: now,
      },
      { onConflict: "phone" },
    )
    .select("id")
    .single();

  if (contactError) throw contactError;

  const contactId = contact?.id || null;

  // 2. Upsert conversation (external_chat_id = phone for Cloud API, no @c.us suffix)
  const { data: conversation, error: convError } = await db
    .from("whatsapp_conversations")
    .upsert(
      {
        external_chat_id: phone,
        provider: "whatsapp_cloud",
        contact_id: contactId,
        name: contactName || phone,
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

  // 3. Upsert message (idempotent on external_message_id)
  const msgTimestamp = timestamp ? new Date(timestamp * 1000).toISOString() : now;

  const { error: msgError } = await db
    .from("whatsapp_messages")
    .upsert(
      {
        external_message_id: waMessageId,
        provider: "whatsapp_cloud",
        conversation_id: conversationId,
        contact_id: contactId,
        direction: "inbound",
        from_id: phone,
        to_id: null,
        body: body,
        message_type: messageType,
        raw_payload: rawPayload as Record<string, unknown>,
        created_at: msgTimestamp,
      },
      { onConflict: "external_message_id" },
    );

  if (msgError) throw msgError;
}

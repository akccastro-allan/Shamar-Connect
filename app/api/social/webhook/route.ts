/**
 * Webhook Meta Messaging — Instagram Direct + Facebook Messenger.
 *
 * GET  — verificação (hub challenge).
 * POST — DMs recebidas.
 *
 * Marco 1: o canal (empresa/marca) é resolvido pela conta conectada
 * (entry.id == social_accounts.external_account_id → channel_id). IDs sociais
 * (PSID) ficam em contact_identities, nunca em crm_contacts.phone.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhook,
  validateSignature,
  parseSocialWebhookPayload,
} from "@/lib/providers/meta-social-client";
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
  const messages = parseSocialWebhookPayload(body);

  if (!messages.length) {
    return NextResponse.json({ ok: true, note: "acknowledged_non_message_event" });
  }

  let processed = 0;
  let duplicates = 0;
  let unresolved = 0;
  const errors: string[] = [];

  for (const m of messages) {
    try {
      const channel = await resolveChannelFromWebhook(db, m.provider, { accountId: m.accountId });
      if (!channel) {
        await recordUnresolvedEvent(db, m.provider === "instagram" ? "meta_instagram" : "meta_messenger", body);
        unresolved += 1;
        continue;
      }

      const result = await ingestInboundMessage(db, channel, {
        externalEventId: m.messageId,
        externalChatId: m.senderId,
        externalMessageId: m.messageId,
        body: m.body,
        messageType: m.messageType,
        timestampMs: m.timestamp,
        isGroup: false,
        senderExternalId: m.senderId,
        identityType: m.provider === "instagram" ? "ig_psid" : "fb_psid",
        displayName: null,
        rawPayload: m.rawPayload,
      });
      if (result === "processed") processed += 1;
      else duplicates += 1;
    } catch (err) {
      errors.push(`${m.messageId}: ${err instanceof Error ? err.message : String(err)}`);
      console.error("[social-webhook]", err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ ok: true, processed, duplicates, unresolved, errors: errors.length });
}

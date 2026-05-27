import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import type { ProviderSyncedMessage } from "@/types/messaging-provider";

function onlyDigits(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

async function saveOneMessage(db: ReturnType<typeof createSupabaseWriteClient>, message: ProviderSyncedMessage) {
  const phone = onlyDigits(message.phone || message.from);
  let contactId = null;

  if (phone) {
    const { data: contact, error: contactError } = await db
      .from("crm_contacts")
      .upsert({
        phone,
        name: message.contactName || phone,
        source: "whatsapp_web_selected_message",
        updated_at: new Date().toISOString(),
      }, { onConflict: "phone" })
      .select("id")
      .single();

    if (contactError) throw contactError;
    contactId = contact?.id || null;
  }

  const { data: conversation, error: conversationError } = await db
    .from("whatsapp_conversations")
    .upsert({
      external_chat_id: message.chatId,
      provider: "whatsapp_web",
      contact_id: contactId,
      name: message.chatName || message.contactName || message.chatId,
      is_group: Boolean(message.isGroup),
      last_message_at: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "external_chat_id" })
    .select("id")
    .single();

  if (conversationError) throw conversationError;

  if (!message.id) return false;

  const { error: messageError } = await db
    .from("whatsapp_messages")
    .upsert({
      external_message_id: message.id,
      provider: "whatsapp_web",
      conversation_id: conversation?.id || null,
      contact_id: contactId,
      direction: message.direction,
      from_id: message.from || null,
      to_id: message.to || null,
      body: message.body || null,
      message_type: message.type || "text",
      raw_payload: message || {},
      created_at: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString(),
    }, { onConflict: "external_message_id" });

  if (messageError) throw messageError;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages = Array.isArray(body?.messages) ? body.messages as ProviderSyncedMessage[] : [];

    if (messages.length === 0) {
      return NextResponse.json({ ok: false, error: "messages is required" }, { status: 400 });
    }

    const db = createSupabaseWriteClient();
    let saved = 0;

    for (const message of messages) {
      const didSave = await saveOneMessage(db, message);
      if (didSave) saved += 1;
    }

    return NextResponse.json({ ok: true, received: messages.length, saved });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to save selected messages" }, { status: 500 });
  }
}

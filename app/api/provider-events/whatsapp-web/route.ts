import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function normalizePhone(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

async function upsertContact(client: ReturnType<typeof createSupabaseWriteClient>, payload: any) {
  const phone = normalizePhone(payload?.phone || payload?.from);
  if (!phone) return null;

  const name = payload?.contactName || payload?.name || phone;
  const { data, error } = await client
    .from("crm_contacts")
    .upsert({ phone, name, source: "whatsapp_web" }, { onConflict: "phone" })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

async function upsertConversation(client: ReturnType<typeof createSupabaseWriteClient>, payload: any, contactId?: string) {
  const externalChatId = payload?.from || payload?.chatId || payload?.groupId;
  if (!externalChatId) return null;

  const { data, error } = await client
    .from("whatsapp_conversations")
    .upsert({
      external_chat_id: externalChatId,
      provider: "whatsapp_web",
      contact_id: contactId || null,
      name: payload?.contactName || payload?.groupName || payload?.from || externalChatId,
      is_group: Boolean(payload?.isGroup),
      last_message_at: new Date().toISOString(),
    }, { onConflict: "external_chat_id" })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

async function saveMessage(client: ReturnType<typeof createSupabaseWriteClient>, payload: any, conversationId?: string, contactId?: string) {
  if (!payload?.id && !payload?.body) return;

  const { error } = await client
    .from("whatsapp_messages")
    .upsert({
      external_message_id: payload?.id || undefined,
      provider: "whatsapp_web",
      conversation_id: conversationId || null,
      contact_id: contactId || null,
      direction: "inbound",
      from_id: payload?.from || null,
      to_id: payload?.to || null,
      body: payload?.body || null,
      message_type: "text",
      raw_payload: payload || {},
      created_at: payload?.timestamp ? new Date(Number(payload.timestamp) * 1000).toISOString() : new Date().toISOString(),
    }, { onConflict: "external_message_id" });

  if (error) throw error;
}

async function saveGroup(client: ReturnType<typeof createSupabaseWriteClient>, payload: any) {
  const groupId = payload?.groupId;
  if (!groupId) return;

  const { error } = await client
    .from("whatsapp_groups")
    .upsert({
      external_group_id: groupId,
      provider: "whatsapp_web",
      name: payload?.groupName || groupId,
      participant_count: Number(payload?.total || 0),
      last_synced_at: new Date().toISOString(),
    }, { onConflict: "external_group_id" });

  if (error) throw error;
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.SHAMARCONNECT_WEBHOOK_TOKEN || "";
  const token = getBearerToken(request);

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const client = createSupabaseWriteClient();
    const event = body?.event || "unknown";
    const payload = body?.payload || {};

    const { error: eventError } = await client.from("provider_events").insert({
      provider: body?.provider || "whatsapp_web",
      event,
      payload: body || {},
    });

    if (eventError) throw eventError;

    if (event === "message.received") {
      const contact = await upsertContact(client, payload);
      const conversation = await upsertConversation(client, payload, contact?.id);
      await saveMessage(client, payload, conversation?.id, contact?.id);
    }

    if (event === "group.participants.extracted") {
      await saveGroup(client, payload);
    }

    return NextResponse.json({ ok: true, event });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Webhook processing failed" }, { status: 500 });
  }
}

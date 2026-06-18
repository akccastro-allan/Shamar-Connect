import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import type { ProviderChatSummary, ProviderSyncedMessage } from "@/types/messaging-provider";

function normalizePhone(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

type AppContext = Awaited<ReturnType<typeof getRequiredAppContext>>;
type SupabaseWriteClient = ReturnType<typeof createSupabaseWriteClient>;

async function upsertContact(
  client: SupabaseWriteClient,
  context: AppContext,
  phone: string,
  name?: string,
) {
  if (!phone) return null;

  const { data: existingContact, error: contactLookupError } = await client
    .from("crm_contacts")
    .select("id")
    .eq("tenant_id", context.tenantId)
    .eq("organization_id", context.organizationId)
    .eq("phone", phone)
    .maybeSingle();

  if (contactLookupError) throw contactLookupError;

  if (existingContact?.id) {
    const { data: updatedContact, error: updateContactError } = await client
      .from("crm_contacts")
      .update({
        name: name || phone,
        source: "whatsapp_web_history",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingContact.id)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .select("id")
      .single();

    if (updateContactError) throw updateContactError;
    return updatedContact?.id || existingContact.id;
  }

  const { data: createdContact, error: createContactError } = await client
    .from("crm_contacts")
    .insert({
      tenant_id: context.tenantId,
      organization_id: context.organizationId,
      phone,
      name: name || phone,
      source: "whatsapp_web_history",
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (createContactError) throw createContactError;
  return createdContact?.id || null;
}

async function upsertConversation(
  client: SupabaseWriteClient,
  context: AppContext,
  payload: {
    externalChatId: string;
    name: string;
    isGroup: boolean;
    contactId: string | null;
    lastMessageAt?: string | null;
    unreadCount?: number;
  },
) {
  const { data: existingConversation, error: conversationLookupError } = await client
    .from("whatsapp_conversations")
    .select("id")
    .eq("tenant_id", context.tenantId)
    .eq("organization_id", context.organizationId)
    .eq("provider", "whatsapp_web")
    .eq("external_chat_id", payload.externalChatId)
    .maybeSingle();

  if (conversationLookupError) throw conversationLookupError;

  const conversationPayload = {
    tenant_id: context.tenantId,
    organization_id: context.organizationId,
    provider: "whatsapp_web",
    external_chat_id: payload.externalChatId,
    contact_id: payload.contactId,
    name: payload.name,
    is_group: payload.isGroup,
    unread_count: payload.unreadCount || 0,
    last_message_at: payload.lastMessageAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existingConversation?.id) {
    const { data: updatedConversation, error: updateConversationError } = await client
      .from("whatsapp_conversations")
      .update(conversationPayload)
      .eq("id", existingConversation.id)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .select("id")
      .single();

    if (updateConversationError) throw updateConversationError;
    return updatedConversation?.id || existingConversation.id;
  }

  const { data: createdConversation, error: createConversationError } = await client
    .from("whatsapp_conversations")
    .insert(conversationPayload)
    .select("id")
    .single();

  if (createConversationError) throw createConversationError;
  return createdConversation?.id || null;
}

async function upsertMessage(
  client: SupabaseWriteClient,
  context: AppContext,
  message: ProviderSyncedMessage,
  conversationId: string,
  contactId: string | null,
) {
  const externalMessageId = String(message.id || "").trim();
  if (!externalMessageId) return false;

  const { data: existingMessage, error: messageLookupError } = await client
    .from("whatsapp_messages")
    .select("id")
    .eq("tenant_id", context.tenantId)
    .eq("organization_id", context.organizationId)
    .eq("provider", "whatsapp_web")
    .eq("external_message_id", externalMessageId)
    .maybeSingle();

  if (messageLookupError) throw messageLookupError;

  const messagePayload = {
    tenant_id: context.tenantId,
    organization_id: context.organizationId,
    external_message_id: externalMessageId,
    provider: "whatsapp_web",
    conversation_id: conversationId,
    contact_id: contactId,
    direction: message.direction || "inbound",
    from_id: message.from || null,
    to_id: message.to || null,
    body: message.body || null,
    message_type: message.type || "text",
    raw_payload: message,
    created_at: message.timestamp
      ? new Date(Number(message.timestamp) * 1000).toISOString()
      : new Date().toISOString(),
  };

  if (existingMessage?.id) {
    const { error: updateMessageError } = await client
      .from("whatsapp_messages")
      .update(messagePayload)
      .eq("id", existingMessage.id)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId);

    if (updateMessageError) throw updateMessageError;
    return false;
  }

  const { error: insertMessageError } = await client
    .from("whatsapp_messages")
    .insert(messagePayload);

  if (insertMessageError) throw insertMessageError;
  return true;
}

async function syncChat(
  client: SupabaseWriteClient,
  context: AppContext,
  chat: ProviderChatSummary,
  limit: number,
) {
  const messages = await whatsappWebGatewayClient.listChatMessages(chat.id, limit);
  const latestMessage = messages[0];
  const phone = normalizePhone(latestMessage?.phone || latestMessage?.from || latestMessage?.to || chat.id);
  const contactId = phone ? await upsertContact(client, context, phone, latestMessage?.contactName || chat.name || phone) : null;

  const lastMessageAt = latestMessage?.timestamp
    ? new Date(Number(latestMessage.timestamp) * 1000).toISOString()
    : chat.lastMessageAt || null;

  const conversationId = await upsertConversation(client, context, {
    externalChatId: chat.id,
    name: chat.name || latestMessage?.chatName || latestMessage?.contactName || chat.id,
    isGroup: Boolean(chat.isGroup),
    contactId,
    lastMessageAt,
    unreadCount: chat.unreadCount || 0,
  });

  let savedMessages = 0;

  if (conversationId) {
    for (const message of messages) {
      const messagePhone = normalizePhone(message.phone || message.from || message.to || phone);
      const messageContactId = messagePhone
        ? await upsertContact(client, context, messagePhone, message.contactName || chat.name || messagePhone)
        : contactId;

      const inserted = await upsertMessage(client, context, message, conversationId, messageContactId);
      if (inserted) savedMessages += 1;
    }
  }

  return { chatId: chat.id, scanned: messages.length, savedMessages, conversationId };
}

async function syncChats(chatIds?: string[], messageLimit = 50, chatLimit = 20) {
  const context = await getRequiredAppContext();
  const client = createSupabaseWriteClient();
  const allChats = await whatsappWebGatewayClient.listChats();
  const selectedChats = Array.isArray(chatIds) && chatIds.length > 0
    ? allChats.filter((chat) => chatIds.includes(chat.id))
    : allChats.slice(0, chatLimit);

  const results = [];

  for (const chat of selectedChats) {
    results.push(await syncChat(client, context, chat, messageLimit));
  }

  return {
    ok: true,
    totalGatewayChats: allChats.length,
    syncedChats: results.length,
    savedMessages: results.reduce((sum, item) => sum + item.savedMessages, 0),
    results,
  };
}

export async function GET() {
  try {
    const result = await syncChats(undefined, 30, 20);
    return NextResponse.json(result);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to sync chat messages" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const chatIds = Array.isArray(body?.chatIds)
      ? body.chatIds.map(String)
      : body?.chatId
        ? [String(body.chatId)]
        : undefined;
    const messageLimit = Math.min(Number(body?.limit || 50), 200);
    const chatLimit = Math.min(Number(body?.chatLimit || 20), 100);

    const result = await syncChats(chatIds, messageLimit, chatLimit);
    return NextResponse.json(result);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to sync chat messages" },
      { status: 500 },
    );
  }
}

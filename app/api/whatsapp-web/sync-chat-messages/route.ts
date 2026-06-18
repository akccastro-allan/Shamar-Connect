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

type SyncMessageError = {
  chatId: string;
  messageId?: string;
  step: string;
  error: string;
};

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

function resolveMessageType(message: ProviderSyncedMessage) {
  return message.mediaType || message.type || (message.hasMedia ? "media" : "text");
}

function resolveMessageBody(message: ProviderSyncedMessage) {
  const text = String(message.body || "").trim();
  if (text) return text;

  const type = resolveMessageType(message);
  const mimeType = message.mimeType || message.media?.mimetype || "";

  if (type === "sticker") return "[Figurinha recebida]";
  if (type === "image") return "[Imagem recebida]";
  if (type === "audio" || type === "ptt") return "[Áudio recebido]";
  if (type === "video") return "[Vídeo recebido]";
  if (type === "document") return "[Documento recebido]";
  if (message.hasMedia) return mimeType ? `[Mídia recebida: ${mimeType}]` : "[Mídia recebida]";

  return null;
}

function resolveMediaSummary(message: ProviderSyncedMessage) {
  if (!message.hasMedia) return null;

  const type = resolveMessageType(message);
  const mimeType = message.mimeType || message.media?.mimetype || "";
  const label = type === "sticker" ? "Figurinha" : type || "Mídia";

  return mimeType ? `${label} (${mimeType})` : label;
}

function sanitizeRawPayload(message: ProviderSyncedMessage) {
  const payload = JSON.parse(JSON.stringify(message)) as Record<string, unknown>;
  const media = payload.media as Record<string, unknown> | undefined;

  if (media && typeof media === "object" && typeof media.data === "string") {
    const data = media.data;
    delete media.data;
    media.dataOmitted = true;
    media.dataLength = data.length;
  }

  return payload;
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
    body: resolveMessageBody(message),
    message_type: resolveMessageType(message),
    raw_payload: sanitizeRawPayload(message),
    has_media: Boolean(message.hasMedia),
    media_count: message.hasMedia ? 1 : 0,
    media_summary: resolveMediaSummary(message),
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
  const errors: SyncMessageError[] = [];

  if (conversationId) {
    for (const message of messages) {
      try {
        const messagePhone = normalizePhone(message.phone || message.from || message.to || phone);
        const messageContactId = messagePhone
          ? await upsertContact(client, context, messagePhone, message.contactName || chat.name || messagePhone)
          : contactId;

        const inserted = await upsertMessage(client, context, message, conversationId, messageContactId);
        if (inserted) savedMessages += 1;
      } catch (error) {
        errors.push({
          chatId: chat.id,
          messageId: message.id,
          step: "upsertMessage",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return { chatId: chat.id, scanned: messages.length, savedMessages, conversationId, errors };
}

async function syncChats(chatIds?: string[], messageLimit = 50, chatLimit = 20) {
  const context = await getRequiredAppContext();
  const client = createSupabaseWriteClient();
  const allChats = await whatsappWebGatewayClient.listChats();
  const selectedChats = Array.isArray(chatIds) && chatIds.length > 0
    ? allChats.filter((chat) => chatIds.includes(chat.id))
    : allChats.slice(0, chatLimit);

  const results = [];
  const chatErrors = [];

  for (const chat of selectedChats) {
    try {
      results.push(await syncChat(client, context, chat, messageLimit));
    } catch (error) {
      chatErrors.push({
        chatId: chat.id,
        step: "syncChat",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const messageErrors = results.flatMap((item) => item.errors || []);

  return {
    ok: chatErrors.length === 0 && messageErrors.length === 0,
    partial: chatErrors.length > 0 || messageErrors.length > 0,
    totalGatewayChats: allChats.length,
    syncedChats: results.length,
    failedChats: chatErrors.length,
    failedMessages: messageErrors.length,
    savedMessages: results.reduce((sum, item) => sum + item.savedMessages, 0),
    results,
    chatErrors,
    messageErrors: messageErrors.slice(0, 20),
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chatId = searchParams.get("chatId");
    const limit = Math.min(Number(searchParams.get("limit") || 30), 200);
    const chatLimit = Math.min(Number(searchParams.get("chatLimit") || 20), 100);
    const result = await syncChats(chatId ? [chatId] : undefined, limit, chatLimit);
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

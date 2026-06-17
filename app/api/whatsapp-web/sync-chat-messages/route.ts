import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

function normalizePhone(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const body = await request.json();

    const chatId = String(body?.chatId || "");
    const limit = Math.min(Number(body?.limit || 50), 200);

    if (!chatId) {
      return NextResponse.json({ ok: false, error: "chatId is required" }, { status: 400 });
    }

    const client = createSupabaseWriteClient();
    const messages = await whatsappWebGatewayClient.listChatMessages(chatId, limit);

    let savedMessages = 0;

    for (const message of messages) {
      const phone = normalizePhone(message.phone || message.from || message.to);
      let contactId: string | null = null;

      if (phone) {
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
              name: message.contactName || phone,
              source: "whatsapp_web_history",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingContact.id)
            .eq("tenant_id", context.tenantId)
            .eq("organization_id", context.organizationId)
            .select("id")
            .single();

          if (updateContactError) throw updateContactError;
          contactId = updatedContact?.id || existingContact.id;
        } else {
          const { data: createdContact, error: createContactError } = await client
            .from("crm_contacts")
            .insert({
              tenant_id: context.tenantId,
              organization_id: context.organizationId,
              phone,
              name: message.contactName || phone,
              source: "whatsapp_web_history",
              updated_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (createContactError) throw createContactError;
          contactId = createdContact?.id || null;
        }
      }

      const externalChatId = message.chatId || chatId;

      const { data: existingConversation, error: conversationLookupError } = await client
        .from("whatsapp_conversations")
        .select("id")
        .eq("tenant_id", context.tenantId)
        .eq("organization_id", context.organizationId)
        .eq("provider", "whatsapp_web")
        .eq("external_chat_id", externalChatId)
        .maybeSingle();

      if (conversationLookupError) throw conversationLookupError;

      const conversationPayload = {
        tenant_id: context.tenantId,
        organization_id: context.organizationId,
        provider: "whatsapp_web",
        external_chat_id: externalChatId,
        contact_id: contactId,
        name: message.chatName || message.contactName || externalChatId,
        is_group: Boolean(message.isGroup),
        last_message_at: message.timestamp
          ? new Date(Number(message.timestamp) * 1000).toISOString()
          : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let conversationId: string | null = null;

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
        conversationId = updatedConversation?.id || existingConversation.id;
      } else {
        const { data: createdConversation, error: createConversationError } = await client
          .from("whatsapp_conversations")
          .insert(conversationPayload)
          .select("id")
          .single();

        if (createConversationError) throw createConversationError;
        conversationId = createdConversation?.id || null;
      }

      if (!conversationId) continue;

      const externalMessageId = String(message.id || "").trim();
      if (!externalMessageId) continue;

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
      } else {
        const { error: insertMessageError } = await client
          .from("whatsapp_messages")
          .insert(messagePayload);

        if (insertMessageError) throw insertMessageError;
      }

      savedMessages += 1;
    }

    return NextResponse.json({ ok: true, chatId, scanned: messages.length, savedMessages });
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


import type { MessagingProviderAdapter, MessagingStatus, MessagingTextPayload, NormalizedIncomingMessage } from "@/lib/messaging/types";

function getMetaToken() {
  return process.env.META_WHATSAPP_TOKEN || "";
}

function getMetaPhoneNumberId() {
  return process.env.META_WHATSAPP_PHONE_NUMBER_ID || "";
}

function getMetaBusinessAccountId() {
  return process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID || "";
}

function isMetaConfigured() {
  return Boolean(getMetaToken() && getMetaPhoneNumberId());
}

async function metaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getMetaToken();

  if (!token) {
    throw new Error("META_WHATSAPP_TOKEN is not configured.");
  }

  const response = await fetch(`https://graph.facebook.com/v20.0${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Meta WhatsApp API error ${response.status}: ${JSON.stringify(data)}`);
  }

  return data as T;
}

export const metaWhatsappProvider: MessagingProviderAdapter = {
  key: "meta_whatsapp",

  async getStatus(): Promise<MessagingStatus> {
    if (!isMetaConfigured()) {
      return {
        provider: "meta_whatsapp",
        status: "not_configured",
        configured: false,
        phone: null,
        phoneNumberId: getMetaPhoneNumberId() || null,
        businessAccountId: getMetaBusinessAccountId() || null,
        error: "META_WHATSAPP_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID are required.",
      };
    }

    try {
      const phoneNumberId = getMetaPhoneNumberId();
      const data = await metaFetch<{ display_phone_number?: string; verified_name?: string; id?: string }>(`/${phoneNumberId}?fields=display_phone_number,verified_name`);

      return {
        provider: "meta_whatsapp",
        status: "ready",
        configured: true,
        phone: data.display_phone_number || null,
        phoneNumberId,
        businessAccountId: getMetaBusinessAccountId() || null,
      };
    } catch (error) {
      return {
        provider: "meta_whatsapp",
        status: "error",
        configured: true,
        phone: null,
        phoneNumberId: getMetaPhoneNumberId() || null,
        businessAccountId: getMetaBusinessAccountId() || null,
        error: error instanceof Error ? error.message : "Erro ao consultar Meta WhatsApp API",
      };
    }
  },

  async sendTextMessage(payload: MessagingTextPayload) {
    if (!payload.to || !payload.body) {
      throw new Error("to and body are required.");
    }

    const phoneNumberId = getMetaPhoneNumberId();
    if (!phoneNumberId) {
      throw new Error("META_WHATSAPP_PHONE_NUMBER_ID is not configured.");
    }

    const data = await metaFetch<{ messages?: Array<{ id?: string }> }>(`/${phoneNumberId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: payload.to,
        type: "text",
        text: {
          preview_url: false,
          body: payload.body,
        },
      }),
    });

    return {
      id: data.messages?.[0]?.id || crypto.randomUUID(),
      status: "sent" as const,
      provider: "meta_whatsapp" as const,
      raw: data,
    };
  },

  normalizeIncomingMessage(payload: unknown): NormalizedIncomingMessage[] {
    const normalized: NormalizedIncomingMessage[] = [];
    const root = payload as any;
    const entries = Array.isArray(root?.entry) ? root.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change?.value;
        const phoneNumberId = value?.metadata?.phone_number_id;
        const messages = Array.isArray(value?.messages) ? value.messages : [];

        for (const message of messages) {
          normalized.push({
            provider: "meta_whatsapp",
            externalMessageId: message.id,
            externalChatId: message.from,
            from: message.from,
            to: phoneNumberId,
            body: message?.text?.body || "",
            messageType: message.type || "unknown",
            timestamp: message.timestamp ? Number(message.timestamp) : undefined,
            raw: message,
          });
        }
      }
    }

    return normalized;
  },
};

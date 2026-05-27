import type { MessagingProviderClient, ProviderChatSummary, ProviderGroupParticipant, ProviderGroupSummary, ProviderMessagePayload, ProviderStatus, ProviderSyncedMessage } from "@/types/messaging-provider";

function getGatewayBaseUrl() {
  return process.env.WHATSAPP_WEB_GATEWAY_URL?.replace(/\/$/, "") || "";
}

function getGatewayToken() {
  return process.env.WHATSAPP_WEB_GATEWAY_TOKEN || "";
}

async function gatewayFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getGatewayBaseUrl();
  if (!baseUrl) {
    throw new Error("WHATSAPP_WEB_GATEWAY_URL is not configured.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(getGatewayToken() ? { authorization: `Bearer ${getGatewayToken()}` } : {}),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WhatsApp Web Gateway error ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export const whatsappWebGatewayClient: MessagingProviderClient = {
  getStatus() {
    return gatewayFetch<ProviderStatus>("/status");
  },

  connect() {
    return gatewayFetch<ProviderStatus>("/connect", { method: "POST" });
  },

  getQr() {
    return gatewayFetch<ProviderStatus>("/qr");
  },

  sendMessage(payload: ProviderMessagePayload) {
    return gatewayFetch<{ id: string; status: "queued" | "sent" }>("/send-message", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  listChats() {
    return gatewayFetch<ProviderChatSummary[]>("/chats");
  },

  listGroups() {
    return gatewayFetch<ProviderGroupSummary[]>("/groups");
  },

  listGroupParticipants(groupId: string) {
    return gatewayFetch<ProviderGroupParticipant[]>(`/groups/${encodeURIComponent(groupId)}/participants`);
  },

  listChatMessages(chatId: string, limit = 50) {
    return gatewayFetch<ProviderSyncedMessage[]>(`/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}`);
  },

  logout() {
    return gatewayFetch<ProviderStatus>("/logout", { method: "POST" });
  },
};

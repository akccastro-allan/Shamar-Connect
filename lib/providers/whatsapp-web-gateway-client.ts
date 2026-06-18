import type {
  MessagingProviderClient,
  ProviderChatSummary,
  ProviderGroupParticipant,
  ProviderGroupSummary,
  ProviderMessagePayload,
  ProviderStatus,
  ProviderSyncedMessage,
} from "@/types/messaging-provider";

function getGatewayBaseUrl() {
  return process.env.WHATSAPP_WEB_GATEWAY_URL?.replace(/\/$/, "") || "";
}

function getGatewayToken() {
  return process.env.WHATSAPP_WEB_GATEWAY_TOKEN || "";
}

function buildGatewayUrls(baseUrl: string, path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const primaryUrl = `${baseUrl}${normalizedPath}`;

  if (baseUrl.endsWith("/api") || normalizedPath.startsWith("/api/")) {
    return [primaryUrl];
  }

  return [primaryUrl, `${baseUrl}/api${normalizedPath}`];
}

async function gatewayFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getGatewayBaseUrl();
  if (!baseUrl) {
    throw new Error("WHATSAPP_WEB_GATEWAY_URL is not configured.");
  }

  const urls = buildGatewayUrls(baseUrl, path);
  let lastErrorBody = "";
  let lastStatus = 0;

  for (const url of urls) {
    const response = await fetch(url, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(getGatewayToken() ? { authorization: `Bearer ${getGatewayToken()}` } : {}),
        ...(init?.headers || {}),
      },
      cache: "no-store",
    });

    if (response.ok) {
      return response.json() as Promise<T>;
    }

    lastStatus = response.status;
    lastErrorBody = await response.text();

    if (response.status !== 404) {
      break;
    }
  }

  throw new Error(`WhatsApp Web Gateway error ${lastStatus}: ${lastErrorBody}`);
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

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
  const rawBaseUrl = process.env.WHATSAPP_WEB_GATEWAY_URL?.replace(/\/$/, "") || "";

  // The Railway WhatsApp gateway exposes session routes at the root, e.g.
  // /sessions/:sessionId/status. Older ShamarConnect deployments sometimes
  // configured the base URL with a trailing /api, so normalize that here.
  return rawBaseUrl.replace(/\/api$/, "");
}

function getGatewayToken() {
  return process.env.WHATSAPP_WEB_GATEWAY_TOKEN || "";
}

function getDefaultSessionId() {
  return process.env.WHATSAPP_WEB_GATEWAY_SESSION_ID || "hall-main";
}

function withDefaultSession(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedPath.startsWith("/sessions/")) {
    return normalizedPath;
  }

  const sessionId = encodeURIComponent(getDefaultSessionId());
  return `/sessions/${sessionId}${normalizedPath}`;
}

async function gatewayFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getGatewayBaseUrl();
  if (!baseUrl) {
    throw new Error("WHATSAPP_WEB_GATEWAY_URL is not configured.");
  }

  const sessionPath = withDefaultSession(path);
  const url = `${baseUrl}${sessionPath}`;

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

  const errorBody = await response.text();
  throw new Error(`WhatsApp Web Gateway error ${response.status}: ${errorBody}`);
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

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

  if (!rawBaseUrl) return "";
  return rawBaseUrl.endsWith("/api") ? rawBaseUrl : `${rawBaseUrl}/api`;
}

function getGatewayToken() {
  return process.env.WHATSAPP_WEB_GATEWAY_TOKEN || "";
}

function getDefaultSessionId() {
  return process.env.WHATSAPP_WEB_GATEWAY_SESSION_ID || "hall-main";
}

type OpenWaSession = {
  id?: string;
  name?: string;
  status?: string;
  phone?: string | null;
  pushName?: string | null;
  lastError?: string | null;
};

type OpenWaQrResponse = OpenWaSession & {
  qrCode?: string;
  qr?: string;
  pairingCode?: string;
};

type OpenWaMessageResponse = {
  messageId?: string;
  id?: string;
  timestamp?: number;
};

const sessionIdCache = new Map<string, string>();

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && Array.isArray((value as { data?: unknown }).data)) return (value as { data: T[] }).data;
  if (value && typeof value === "object" && Array.isArray((value as { sessions?: unknown }).sessions)) {
    return (value as { sessions: T[] }).sessions;
  }
  if (value && typeof value === "object" && Array.isArray((value as { chats?: unknown }).chats)) return (value as { chats: T[] }).chats;
  if (value && typeof value === "object" && Array.isArray((value as { groups?: unknown }).groups)) return (value as { groups: T[] }).groups;
  if (value && typeof value === "object" && Array.isArray((value as { messages?: unknown }).messages)) {
    return (value as { messages: T[] }).messages;
  }
  return [];
}

function normalizeStatus(session: OpenWaSession, qrCode?: string): ProviderStatus {
  const status = String(session.status || "idle");
  const mapped: ProviderStatus["status"] =
    status === "created"
      ? "idle"
      : status === "initializing"
        ? "connecting"
        : status === "qr_ready"
          ? "qr"
          : status === "authenticating"
            ? "authenticated"
            : status === "ready"
              ? "ready"
              : status === "failed"
                ? "error"
                : status === "disconnected"
                  ? "disconnected"
                  : "idle";

  return {
    provider: "whatsapp_web",
    status: mapped,
    phone: session.phone || undefined,
    qrCode,
    error: session.lastError || undefined,
  };
}

function normalizeChatId(value: string) {
  const trimmed = value.trim();
  if (trimmed.includes("@")) return trimmed;
  return `${trimmed.replace(/\D/g, "")}@c.us`;
}

async function openWaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getGatewayBaseUrl();
  if (!baseUrl) throw new Error("WHATSAPP_WEB_GATEWAY_URL is not configured.");

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${baseUrl}${normalizedPath}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(getGatewayToken() ? { "x-api-key": getGatewayToken(), authorization: `Bearer ${getGatewayToken()}` } : {}),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (response.status === 204) return undefined as T;
  if (response.ok) return response.json() as Promise<T>;
  const errorBody = await response.text();
  throw new Error(`OpenWA error ${response.status}: ${errorBody}`);
}

async function resolveOpenWaSessionId(sessionName: string) {
  const cached = sessionIdCache.get(sessionName);
  if (cached) return cached;

  const sessions = asArray<OpenWaSession>(await openWaFetch<unknown>("/sessions"));
  const existing = sessions.find((session) => session.name === sessionName || session.id === sessionName);
  if (existing?.id) {
    sessionIdCache.set(sessionName, existing.id);
    return existing.id;
  }

  try {
    const created = await openWaFetch<OpenWaSession>("/sessions", {
      method: "POST",
      body: JSON.stringify({ name: sessionName }),
    });
    const id = created.id || created.name || sessionName;
    sessionIdCache.set(sessionName, id);
    return id;
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("409")) throw error;
    const refreshed = asArray<OpenWaSession>(await openWaFetch<unknown>("/sessions"));
    const session = refreshed.find((item) => item.name === sessionName || item.id === sessionName);
    if (session?.id) {
      sessionIdCache.set(sessionName, session.id);
      return session.id;
    }
    throw error;
  }
}

async function openWaSessionFetch<T>(sessionName: string, path: string, init?: RequestInit): Promise<T> {
  const sessionId = await resolveOpenWaSessionId(sessionName);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return openWaFetch<T>(`/sessions/${encodeURIComponent(sessionId)}${normalizedPath}`, init);
}

async function getSessionStatus(sessionName: string) {
  const session = await openWaSessionFetch<OpenWaSession>(sessionName, "");
  return normalizeStatus(session);
}

async function startSession(sessionName: string) {
  try {
    const session = await openWaSessionFetch<OpenWaSession>(sessionName, "/start", { method: "POST" });
    return normalizeStatus(session);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("400")) throw error;
    return getSessionStatus(sessionName);
  }
}

async function getSessionQr(sessionName: string) {
  const qr = await openWaSessionFetch<OpenWaQrResponse>(sessionName, "/qr");
  return normalizeStatus(qr, qr.qrCode || qr.qr);
}

async function sendSessionMessage(sessionName: string, payload: ProviderMessagePayload) {
  const response = await openWaSessionFetch<OpenWaMessageResponse>(sessionName, "/messages/send-text", {
    method: "POST",
    body: JSON.stringify({ chatId: normalizeChatId(payload.to), text: payload.body }),
  });

  return { id: String(response.messageId || response.id || `openwa_${Date.now()}`), status: "sent" as const };
}

async function stopSession(sessionName: string) {
  const session = await openWaSessionFetch<OpenWaSession>(sessionName, "/stop", { method: "POST" });
  return normalizeStatus(session);
}

export const ALLOWED_SESSION_IDS = [
  "hall-main",
  "lips-main",
  "viciados-main",
  "mkshalom-main",
  "oriahfin-main",
  "shamar-main",
  "shamarerp-main",
  "shamarkids-main",
] as const;
export type AllowedSessionId = (typeof ALLOWED_SESSION_IDS)[number];

export function isAllowedSessionId(value: unknown): value is AllowedSessionId {
  return ALLOWED_SESSION_IDS.includes(value as AllowedSessionId);
}

// Factory: creates a gateway client scoped to a specific session.
// The default export (whatsappWebGatewayClient) uses the env-configured session.
export function createWhatsappGatewayClient(sessionId: AllowedSessionId): MessagingProviderClient {
  return {
    getStatus: () => getSessionStatus(sessionId),
    connect: () => startSession(sessionId),
    getQr: () => getSessionQr(sessionId),
    sendMessage: (payload: ProviderMessagePayload) => sendSessionMessage(sessionId, payload),
    listChats: async () => asArray<ProviderChatSummary>(await openWaSessionFetch<unknown>(sessionId, "/chats")),
    listGroups: async () => asArray<ProviderGroupSummary>(await openWaSessionFetch<unknown>(sessionId, "/groups")),
    listGroupParticipants: (groupId: string) =>
      openWaSessionFetch<ProviderGroupParticipant[]>(sessionId, `/groups/${encodeURIComponent(groupId)}/participants`),
    listChatMessages: (chatId: string, limit = 50) =>
      openWaSessionFetch<ProviderSyncedMessage[]>(sessionId, `/messages?chatId=${encodeURIComponent(chatId)}&limit=${limit}`),
    logout: () => stopSession(sessionId),
  };
}

const defaultClient = createWhatsappGatewayClient(getDefaultSessionId() as AllowedSessionId);

export const whatsappWebGatewayClient: MessagingProviderClient = {
  getStatus() {
    return defaultClient.getStatus();
  },

  connect() {
    return defaultClient.connect();
  },

  getQr() {
    return defaultClient.getQr();
  },

  sendMessage(payload: ProviderMessagePayload) {
    return defaultClient.sendMessage(payload);
  },

  listChats() {
    return defaultClient.listChats();
  },

  listGroups() {
    return defaultClient.listGroups();
  },

  listGroupParticipants(groupId: string) {
    return defaultClient.listGroupParticipants(groupId);
  },

  listChatMessages(chatId: string, limit = 50) {
    return defaultClient.listChatMessages(chatId, limit);
  },

  logout() {
    return defaultClient.logout();
  },
};

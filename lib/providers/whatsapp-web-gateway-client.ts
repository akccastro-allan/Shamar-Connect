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

type OpenWaChat = {
  id?: string;
  chatId?: string;
  name?: string;
  formattedTitle?: string;
  title?: string;
  isGroup?: boolean;
  unreadCount?: number;
  timestamp?: number;
  lastMessageAt?: string;
};

type OpenWaMessage = {
  id?: string;
  messageId?: string;
  chatId?: string;
  from?: string;
  to?: string;
  body?: string;
  caption?: string;
  type?: string;
  timestamp?: number;
  t?: number;
  fromMe?: boolean;
  isGroup?: boolean;
  contactName?: string;
  pushName?: string;
  sender?: { name?: string; pushname?: string };
  hasMedia?: boolean;
  mimetype?: string;
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

function normalizeChat(chat: OpenWaChat): ProviderChatSummary {
  const id = String(chat.id || chat.chatId || "");
  return {
    id,
    name: String(chat.name || chat.formattedTitle || chat.title || id),
    isGroup: Boolean(chat.isGroup) || id.endsWith("@g.us"),
    unreadCount: Number(chat.unreadCount || 0),
    lastMessageAt: chat.lastMessageAt || (chat.timestamp ? new Date(Number(chat.timestamp) * 1000).toISOString() : undefined),
  };
}

function normalizeMessage(message: OpenWaMessage, fallbackChatId: string): ProviderSyncedMessage {
  const chatId = String(message.chatId || fallbackChatId);
  const from = String(message.from || "");
  const to = String(message.to || "");
  const timestamp = Number(message.timestamp || message.t || Math.floor(Date.now() / 1000));
  const contactName = message.contactName || message.pushName || message.sender?.pushname || message.sender?.name;
  const type = String(message.type || "text");

  return {
    id: String(message.id || message.messageId || `${chatId}_${timestamp}`),
    chatId,
    chatName: contactName || chatId,
    isGroup: Boolean(message.isGroup) || chatId.endsWith("@g.us"),
    from,
    to,
    body: String(message.body || message.caption || ""),
    timestamp,
    direction: message.fromMe ? "outbound" : "inbound",
    contactName,
    phone: normalizeChatId(message.fromMe ? to || chatId : from || chatId).replace(/\D/g, ""),
    type,
    hasMedia: Boolean(message.hasMedia),
    mediaType: type,
    mimeType: message.mimetype,
  };
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

const LEGACY_SESSION_IDS = [
  "hall-main",
  "lips-main",
  "viciados-main",
  "mkshalom-main",
  "oriahfin-main",
  "shamar-main",
  "shamarerp-main",
  "shamarkids-main",
] as const;

const NUMBERED_SESSION_PREFIXES = [
  "hall",
  "lips",
  "viciados",
  "mkshalom",
  "oriahfin",
  "shamar",
  "shamarerp",
  "shamarkids",
] as const;

const SESSION_NUMBER_SUFFIXES = ["01", "02", "03", "04", "05", "06", "07", "08", "09"] as const;

type LegacySessionId = (typeof LEGACY_SESSION_IDS)[number];
type NumberedSessionPrefix = (typeof NUMBERED_SESSION_PREFIXES)[number];
type SessionNumberSuffix = (typeof SESSION_NUMBER_SUFFIXES)[number];
type NumberedSessionId = `${NumberedSessionPrefix}-${SessionNumberSuffix}`;

const NUMBERED_SESSION_IDS: NumberedSessionId[] = NUMBERED_SESSION_PREFIXES.flatMap((prefix) =>
  SESSION_NUMBER_SUFFIXES.map((suffix) => `${prefix}-${suffix}` as NumberedSessionId),
);

export const ALLOWED_SESSION_IDS: readonly (LegacySessionId | NumberedSessionId)[] = [
  ...LEGACY_SESSION_IDS,
  ...NUMBERED_SESSION_IDS,
];
export type AllowedSessionId = (typeof ALLOWED_SESSION_IDS)[number];

const ALLOWED_SESSION_ID_SET = new Set<string>(ALLOWED_SESSION_IDS);

export function isAllowedSessionId(value: unknown): value is AllowedSessionId {
  return typeof value === "string" && ALLOWED_SESSION_ID_SET.has(value);
}

// Factory: creates a gateway client scoped to a specific session.
// The default export (whatsappWebGatewayClient) uses the env-configured session.
export function createWhatsappGatewayClient(sessionId: AllowedSessionId): MessagingProviderClient {
  return {
    getStatus: () => getSessionStatus(sessionId),
    connect: () => startSession(sessionId),
    getQr: () => getSessionQr(sessionId),
    sendMessage: (payload: ProviderMessagePayload) => sendSessionMessage(sessionId, payload),
    listChats: async () => asArray<OpenWaChat>(await openWaSessionFetch<unknown>(sessionId, "/chats")).map(normalizeChat).filter((chat) => chat.id),
    listGroups: async () =>
      asArray<OpenWaChat>(await openWaSessionFetch<unknown>(sessionId, "/groups"))
        .map((group) => {
          const chat = normalizeChat(group);
          return { id: chat.id, name: chat.name, participantCount: undefined };
        })
        .filter((group) => group.id),
    listGroupParticipants: (groupId: string) =>
      openWaSessionFetch<ProviderGroupParticipant[]>(sessionId, `/groups/${encodeURIComponent(groupId)}/participants`),
    listChatMessages: (chatId: string, limit = 50) =>
      openWaSessionFetch<unknown>(sessionId, `/messages/${encodeURIComponent(chatId)}/history?limit=${limit}`).then((payload) =>
        asArray<OpenWaMessage>(payload).map((message) => normalizeMessage(message, chatId)),
      ),
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

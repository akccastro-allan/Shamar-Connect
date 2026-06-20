import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import QRCode from "qrcode";
import pkg from "whatsapp-web.js";

const { Client, LocalAuth } = pkg;

const PORT = Number(process.env.PORT || 8787);
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "change-me";
const SESSION_PATH = process.env.SESSION_PATH || "/data/.wwebjs_auth";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const SHAMARCONNECT_WEBHOOK_URL = process.env.SHAMARCONNECT_WEBHOOK_URL || "";
const SHAMARCONNECT_WEBHOOK_TOKEN = process.env.SHAMARCONNECT_WEBHOOK_TOKEN || "";
const DEFAULT_ENDPOINT_KEY = process.env.DEFAULT_ENDPOINT_KEY || "";
const CLIENTS_JSON = process.env.CLIENTS_JSON || "[]";

const app = express();
app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGIN === "*" ? true : ALLOWED_ORIGIN }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("tiny"));

const sessions = new Map();

function parseClients() {
  try {
    const parsed = JSON.parse(CLIENTS_JSON);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((client) => ({
        id: String(client.id || client.sessionId || client.slug || "").trim(),
        name: String(client.name || client.id || client.sessionId || "").trim(),
        endpointKey: String(client.endpointKey || client.endpoint_key || DEFAULT_ENDPOINT_KEY || "").trim(),
        enabled: client.enabled !== false,
      }))
      .filter((client) => client.id && client.endpointKey && client.enabled);
  } catch (error) {
    console.error("Invalid CLIENTS_JSON", error);
    return [];
  }
}

const configuredClients = parseClients();

function requireToken(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== GATEWAY_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function normalizePhoneFromWid(id = "") {
  return String(id).replace(/@(c\.us|g\.us|lid)$/, "");
}

function digitsOnly(value = "") {
  return String(value).replace(/\D/g, "");
}

// Resolve the real phone number of the other party. The WhatsApp WID can be a
// @lid (LinkedID) alias that hides the real number, so prefer the resolved
// Contact.number; fall back to the WID only when it is a real @c.us number.
function resolveContactPhone(message, contact, from, to) {
  if (!message.fromMe) {
    if (contact?.number) return digitsOnly(contact.number);
    if (contact?.id?.server === "c.us" && contact?.id?.user) return digitsOnly(contact.id.user);
  }
  const wid = message.fromMe ? to : from;
  if (typeof wid === "string" && wid.endsWith("@c.us")) return digitsOnly(wid);
  return normalizePhoneFromWid(wid);
}

function getMessageDirection(message) {
  return message.fromMe ? "outbound" : "inbound";
}

function createInitialStatus(clientConfig) {
  return {
    sessionId: clientConfig.id,
    name: clientConfig.name,
    endpointKey: clientConfig.endpointKey,
    provider: "whatsapp_web",
    status: "idle",
    phone: undefined,
    qrCode: undefined,
    pairingCode: undefined,
    lastSyncAt: undefined,
    error: undefined,
  };
}

function safeClientSummary(session) {
  return {
    sessionId: session.config.id,
    name: session.config.name,
    endpointKey: session.config.endpointKey,
    status: session.status.status,
    phone: session.status.phone,
    lastSyncAt: session.status.lastSyncAt,
    error: session.status.error,
  };
}

function setStatus(session, nextStatus) {
  session.status = {
    ...session.status,
    ...nextStatus,
    lastSyncAt: new Date().toISOString(),
  };
}

async function notifyShamarConnect(session, event, payload = {}) {
  if (!SHAMARCONNECT_WEBHOOK_URL) return;

  try {
    await fetch(SHAMARCONNECT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-webhook-endpoint-key": session.config.endpointKey,
        ...(SHAMARCONNECT_WEBHOOK_TOKEN ? { "x-whatsapp-gateway-key": SHAMARCONNECT_WEBHOOK_TOKEN } : {}),
      },
      body: JSON.stringify({
        event,
        provider: "whatsapp_web",
        endpoint_key: session.config.endpointKey,
        sessionId: session.config.id,
        clientName: session.config.name,
        payload,
        createdAt: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error(`Failed to notify ShamarConnect for session ${session.config.id}`, error);
  }
}

async function mapMessage(message, chat) {
  const contact = await message.getContact().catch(() => null);
  const from = message.from;
  const to = message.to;
  const hasMedia = Boolean(message.hasMedia);
  const media = hasMedia
    ? await message.downloadMedia().catch(() => null)
    : null;

  const mapped = {
    id: message.id?._serialized,
    chatId: chat?.id?._serialized || from,
    chatName: chat?.name,
    isGroup: Boolean(chat?.isGroup || from?.endsWith("@g.us")),
    from,
    to,
    body: message.body,
    timestamp: message.timestamp,
    direction: getMessageDirection(message),
    contactName: contact?.pushname || contact?.name,
    phone: resolveContactPhone(message, contact, from, to),
    type: message.type || "text",
    hasMedia,
  };

  if (media) {
    mapped.media = {
      mimetype: media.mimetype,
      filename: media.filename,
      data: media.data,
    };
    mapped.mediaType = message.type || "unknown";
    mapped.mimeType = media.mimetype;
    mapped.fileName = media.filename;
  }

  if (message.location) {
    mapped.latitude = message.location.latitude;
    mapped.longitude = message.location.longitude;
    mapped.description = message.location.description;
    mapped.type = "location";
  }

  if (message.vCards?.length) {
    mapped.type = "contact";
    mapped.vCards = message.vCards;
  }

  return mapped;
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    const error = new Error(`Session ${sessionId} not found.`);
    error.statusCode = 404;
    throw error;
  }
  return session;
}

function createSession(clientConfig) {
  const existing = sessions.get(clientConfig.id);
  if (existing) return existing;

  const session = {
    config: clientConfig,
    client: null,
    latestQrText: null,
    latestQrDataUrl: null,
    initialized: false,
    status: createInitialStatus(clientConfig),
  };

  session.client = new Client({
    authStrategy: new LocalAuth({ clientId: clientConfig.id, dataPath: SESSION_PATH }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    },
  });

  session.client.on("qr", async (qr) => {
    session.latestQrText = qr;
    session.latestQrDataUrl = await QRCode.toDataURL(qr);
    setStatus(session, { status: "qr", qrCode: session.latestQrDataUrl, error: undefined });
    await notifyShamarConnect(session, "connection.qr_received", { qrCode: session.latestQrDataUrl });
  });

  session.client.on("authenticated", async () => {
    setStatus(session, { status: "authenticated", error: undefined });
    await notifyShamarConnect(session, "connection.authenticated");
  });

  session.client.on("ready", async () => {
    const info = session.client.info;
    setStatus(session, { status: "ready", phone: info?.wid?.user, qrCode: undefined, error: undefined });
    await notifyShamarConnect(session, "connection.ready", { phone: info?.wid?.user });
  });

  session.client.on("auth_failure", async (message) => {
    setStatus(session, { status: "error", error: message });
    await notifyShamarConnect(session, "connection.auth_failure", { message });
  });

  session.client.on("disconnected", async (reason) => {
    setStatus(session, { status: "disconnected", error: reason });
    await notifyShamarConnect(session, "connection.disconnected", { reason });
    session.initialized = false;
  });

  session.client.on("message", async (message) => {
    const chat = await message.getChat().catch(() => null);
    const payload = await mapMessage(message, chat);
    await notifyShamarConnect(session, "message.received", payload);
  });

  session.client.on("message_create", async (message) => {
    if (!message.fromMe) return;
    const chat = await message.getChat().catch(() => null);
    const payload = await mapMessage(message, chat);
    await notifyShamarConnect(session, "message.received", payload);
  });

  session.client.on("message_revoke_everyone", async (_after, before) => {
    await notifyShamarConnect(session, "message_revoke", {
      id: before?.id?._serialized,
      from: before?.from,
      to: before?.to,
      body: before?.body,
      timestamp: before?.timestamp,
      type: before?.type || "unknown",
    });
  });

  sessions.set(clientConfig.id, session);
  return session;
}

async function initializeSession(session) {
  if (session.initialized) return session;
  setStatus(session, { status: "connecting", error: undefined });
  session.initialized = true;
  await session.client.initialize();
  return session;
}

async function destroySession(session, logout = false) {
  if (logout) {
    await session.client.logout().catch(() => null);
  }
  await session.client.destroy().catch(() => null);
  sessions.delete(session.config.id);
}

for (const clientConfig of configuredClients) {
  createSession(clientConfig);
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "shamar-whatsapp-web-gateway", sessions: sessions.size }));

app.get("/sessions", requireToken, (_req, res) => {
  res.json([...sessions.values()].map(safeClientSummary));
});

app.post("/sessions/:sessionId/connect", requireToken, async (req, res) => {
  const session = getSession(req.params.sessionId);
  await initializeSession(session);
  res.json(safeClientSummary(session));
});

app.post("/sessions/connect-all", requireToken, async (_req, res) => {
  const results = [];
  for (const session of sessions.values()) {
    await initializeSession(session);
    results.push(safeClientSummary(session));
  }
  res.json(results);
});

app.get("/sessions/:sessionId/status", requireToken, (req, res) => {
  const session = getSession(req.params.sessionId);
  res.json(session.status);
});

app.get("/sessions/:sessionId/qr", requireToken, (req, res) => {
  const session = getSession(req.params.sessionId);
  res.json({ ...session.status, qrCode: session.latestQrDataUrl, qrText: session.latestQrText });
});

app.post("/sessions/:sessionId/send-message", requireToken, async (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session.client || session.status.status !== "ready") {
    return res.status(409).json({ error: "WhatsApp client is not ready." });
  }

  const { to, body } = req.body || {};
  if (!to || !body) {
    return res.status(400).json({ error: "Fields to and body are required." });
  }

  const chatId = String(to).includes("@") ? String(to) : `${String(to).replace(/\D/g, "")}@c.us`;
  const message = await session.client.sendMessage(chatId, String(body));
  res.json({ id: message.id?._serialized, status: "sent" });
});

app.get("/sessions/:sessionId/chats", requireToken, async (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session.client || session.status.status !== "ready") {
    return res.status(409).json({ error: "WhatsApp client is not ready." });
  }

  const chats = await session.client.getChats();
  res.json(chats.slice(0, 100).map((chat) => ({
    id: chat.id?._serialized,
    name: chat.name,
    isGroup: Boolean(chat.isGroup),
    unreadCount: chat.unreadCount,
    lastMessageAt: chat.timestamp ? new Date(chat.timestamp * 1000).toISOString() : undefined,
  })));
});

app.get("/sessions/:sessionId/chats/:chatId/messages", requireToken, async (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session.client || session.status.status !== "ready") {
    return res.status(409).json({ error: "WhatsApp client is not ready." });
  }

  const chatId = decodeURIComponent(req.params.chatId);
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const chat = await session.client.getChatById(chatId).catch(() => null);

  if (!chat) {
    return res.status(404).json({ error: "Chat not found." });
  }

  const messages = await chat.fetchMessages({ limit });
  const mapped = await Promise.all(messages.map((message) => mapMessage(message, chat)));
  res.json(mapped);
});

app.get("/sessions/:sessionId/groups", requireToken, async (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session.client || session.status.status !== "ready") {
    return res.status(409).json({ error: "WhatsApp client is not ready." });
  }

  const chats = await session.client.getChats();
  res.json(chats.filter((chat) => chat.isGroup).map((chat) => ({
    id: chat.id?._serialized,
    name: chat.name,
    participantCount: chat.participants?.length || 0,
  })));
});

app.get("/sessions/:sessionId/groups/:groupId/participants", requireToken, async (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session.client || session.status.status !== "ready") {
    return res.status(409).json({ error: "WhatsApp client is not ready." });
  }

  const groupId = decodeURIComponent(req.params.groupId);
  const chat = await session.client.getChatById(groupId);
  if (!chat?.isGroup) {
    return res.status(404).json({ error: "Group not found." });
  }

  const participants = await Promise.all((chat.participants || []).map(async (participant) => {
    const contact = await session.client.getContactById(participant.id?._serialized).catch(() => null);
    return {
      id: participant.id?._serialized,
      name: contact?.pushname || contact?.name,
      phone: normalizePhoneFromWid(participant.id?._serialized),
      isAdmin: Boolean(participant.isAdmin || participant.isSuperAdmin),
      sourceGroupId: groupId,
      sourceGroupName: chat.name,
    };
  }));

  await notifyShamarConnect(session, "group.participants.extracted", { groupId, groupName: chat.name, total: participants.length });
  res.json(participants);
});

app.post("/sessions/:sessionId/logout", requireToken, async (req, res) => {
  const session = getSession(req.params.sessionId);
  await destroySession(session, true);
  const freshSession = createSession(session.config);
  setStatus(freshSession, { status: "disconnected", phone: undefined, qrCode: undefined });
  res.json(freshSession.status);
});

app.post("/sessions/:sessionId/restart", requireToken, async (req, res) => {
  const session = getSession(req.params.sessionId);
  await destroySession(session, false);
  const freshSession = createSession(session.config);
  await initializeSession(freshSession);
  res.json(safeClientSummary(freshSession));
});

app.listen(PORT, () => {
  console.log(`Shamar WhatsApp Web Gateway running on port ${PORT}`);
  console.log(`Configured sessions: ${configuredClients.map((client) => client.id).join(", ") || "none"}`);
});

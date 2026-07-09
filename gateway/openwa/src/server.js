import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import QRCode from "qrcode";
import { create } from "@open-wa/wa-automate";

process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason instanceof Error ? reason.message : reason);
});

process.on("uncaughtException", (error) => {
  console.error("uncaughtException:", error instanceof Error ? error.message : error);
});

const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.OPENWA_API_KEY || process.env.GATEWAY_TOKEN || process.env.API_KEY || "";
const DEFAULT_SESSION_ID = process.env.OPENWA_SESSION_ID || "lips-main";
const SESSION_IDS = parseSessionIds(process.env.OPENWA_SESSIONS || DEFAULT_SESSION_ID);
const SESSION_DATA_PATH = process.env.SESSION_DATA_PATH || "/data/openwa";
const WEBHOOK_URL = process.env.SHAMARCONNECT_WEBHOOK_URL || "";
const WEBHOOK_SECRET = process.env.OPENWA_WEBHOOK_SECRET || process.env.SHAMARCONNECT_WEBHOOK_TOKEN || "";
const AUTO_START = process.env.AUTO_START !== "false";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

const app = express();
app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGIN === "*" ? true : ALLOWED_ORIGIN }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("tiny"));

const sessions = new Map();

function parseSessionIds(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function requireToken(req, res, next) {
  const auth = req.headers.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const token = req.headers["x-api-key"] || bearer;

  if (!API_KEY || token !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

function getOrCreateSession(sessionId) {
  const id = String(sessionId || DEFAULT_SESSION_ID).trim() || DEFAULT_SESSION_ID;
  if (!sessions.has(id)) {
    sessions.set(id, {
      sessionId: id,
      client: null,
      initializing: null,
      latestQrText: null,
      latestQrDataUrl: null,
      status: "idle",
      phone: null,
      error: null,
      startedAt: null,
      updatedAt: new Date().toISOString(),
    });
  }
  return sessions.get(id);
}

function publicStatus(session) {
  return {
    success: true,
    sessionId: session.sessionId,
    provider: "openwa",
    status: session.status,
    phone: session.phone,
    error: session.error,
    updatedAt: session.updatedAt,
  };
}

function setStatus(session, status, extra = {}) {
  Object.assign(session, {
    status,
    error: extra.error ?? null,
    phone: extra.phone ?? session.phone,
    updatedAt: new Date().toISOString(),
  });
}

async function notifyShamarConnect(session, event, payload = {}) {
  if (!WEBHOOK_URL) return;

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(WEBHOOK_SECRET ? { "x-openwa-webhook-secret": WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify({
        event,
        provider: "openwa",
        sessionId: session.sessionId,
        data: payload,
        createdAt: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error(`webhook failed for ${event}:`, error instanceof Error ? error.message : error);
  }
}

function getTextFromMessage(message) {
  return message?.body || message?.caption || message?.content || "";
}

function toBaileysLikePayload(message) {
  const remoteJid = message.chatId || message.from || message.to || "";
  const fromMe = Boolean(message.fromMe || message.self);
  const id = String(message.id || message._serialized || `${Date.now()}`);

  return {
    key: {
      remoteJid,
      fromMe,
      id,
    },
    message: {
      conversation: getTextFromMessage(message),
    },
    messageTimestamp: message.t || message.timestamp || Math.floor(Date.now() / 1000),
    pushName: message.sender?.pushname || message.sender?.name || message.notifyName || message.chat?.name || null,
    raw: message,
  };
}

async function initializeSession(session) {
  if (session.client) return session;
  if (session.initializing) return session.initializing;

  setStatus(session, "connecting");
  session.startedAt = new Date().toISOString();

  session.initializing = create({
    sessionId: session.sessionId,
    multiDevice: true,
    headless: true,
    popup: false,
    qrTimeout: 0,
    authTimeout: 0,
    cacheEnabled: false,
    useChrome: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
    sessionDataPath: SESSION_DATA_PATH,
    chromiumArgs: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    qrCallback: async (qr) => {
      session.latestQrText = qr;
      session.latestQrDataUrl = await QRCode.toDataURL(qr);
      setStatus(session, "qr");
      await notifyShamarConnect(session, "session.status", { status: "qr" });
    },
  })
    .then(async (client) => {
      session.client = client;
      setStatus(session, "connected", { phone: client?.me?._serialized || client?.me?.user || null });
      session.latestQrText = null;
      session.latestQrDataUrl = null;

      await notifyShamarConnect(session, "session.status", { status: "connected", phone: session.phone });

      client.onMessage(async (message) => {
        if (message?.isGroupMsg || String(message?.chatId || message?.from || "").endsWith("@g.us")) return;
        await notifyShamarConnect(session, "message.received", toBaileysLikePayload(message));
      });

      client.onStateChanged(async (state) => {
        const normalized = String(state || "").toLowerCase();
        if (normalized.includes("disconnect") || normalized.includes("conflict")) {
          setStatus(session, "disconnected", { error: String(state) });
        }
        await notifyShamarConnect(session, "session.status", { status: session.status, state });
      });

      return session;
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(session, "error", { error: message });
      session.client = null;
      console.error(`OpenWA session ${session.sessionId} failed:`, message);
      throw error;
    })
    .finally(() => {
      session.initializing = null;
    });

  return session.initializing;
}

function createRouter(prefix = "") {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true, service: "shamar-openwa-gateway", sessions: sessions.size });
  });

  router.get("/sessions", requireToken, (_req, res) => {
    res.json([...sessions.values()].map(publicStatus));
  });

  router.post("/sessions/connect-all", requireToken, async (_req, res) => {
    const results = [];
    for (const session of sessions.values()) {
      try {
        await initializeSession(session);
        results.push(publicStatus(session));
      } catch (error) {
        results.push({ ...publicStatus(session), error: error instanceof Error ? error.message : "connect failed" });
      }
    }
    res.json(results);
  });

  router.get("/sessions/:sessionId/status", requireToken, (req, res) => {
    const session = getOrCreateSession(req.params.sessionId);
    res.json(publicStatus(session));
  });

  router.post("/sessions/:sessionId/connect", requireToken, async (req, res) => {
    const session = getOrCreateSession(req.params.sessionId);
    try {
      await initializeSession(session);
      res.json(publicStatus(session));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to connect session" });
    }
  });

  router.get("/sessions/:sessionId/qr", requireToken, async (req, res) => {
    const session = getOrCreateSession(req.params.sessionId);
    if (!session.client && !session.initializing) {
      initializeSession(session).catch(() => null);
    }
    res.json({
      ...publicStatus(session),
      qr: session.latestQrDataUrl,
      qrCode: session.latestQrDataUrl,
      qrText: session.latestQrText,
    });
  });

  async function sendTextMessage(req, res) {
    const session = getOrCreateSession(req.params.sessionId);
    if (!session.client || session.status !== "connected") {
      return res.status(409).json({ error: "OpenWA session is not connected." });
    }

    const chatId = String(req.body?.chatId || req.body?.to || "").trim();
    const text = String(req.body?.text || req.body?.body || "").trim();
    if (!chatId || !text) return res.status(400).json({ error: "chatId and text are required." });

    try {
      const target = chatId.includes("@") ? chatId : `${chatId.replace(/\D/g, "")}@c.us`;
      const id = await session.client.sendText(target, text);
      res.json({ id: String(id || `openwa_${Date.now()}`), status: "sent", chatId: target, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("send-text failed:", error instanceof Error ? error.message : error);
      res.status(500).json({ error: "Failed to send WhatsApp message." });
    }
  }

  router.post("/sessions/:sessionId/messages/send-text", requireToken, sendTextMessage);
  router.post("/sessions/:sessionId/send-message", requireToken, sendTextMessage);

  router.get("/sessions/:sessionId/chats", requireToken, async (req, res) => {
    const session = getOrCreateSession(req.params.sessionId);
    if (!session.client || session.status !== "connected") {
      return res.status(409).json({ error: "OpenWA session is not connected." });
    }
    const chats = await session.client.getAllChats();
    res.json({ chats: chats.slice(0, 100), count: chats.length });
  });

  router.get("/sessions/:sessionId/groups", requireToken, async (req, res) => {
    const session = getOrCreateSession(req.params.sessionId);
    if (!session.client || session.status !== "connected") {
      return res.status(409).json({ error: "OpenWA session is not connected." });
    }
    const chats = await session.client.getAllChats();
    const groups = chats
      .filter((chat) => chat.isGroup || String(chat.id || chat.chatId || "").endsWith("@g.us"))
      .map((chat) => ({
        id: chat.id || chat.chatId,
        name: chat.name || chat.formattedTitle || chat.contact?.name || "Grupo",
        participantCount: chat.groupMetadata?.participants?.length,
      }));
    res.json(groups);
  });

  router.post("/sessions/:sessionId/logout", requireToken, async (req, res) => {
    const session = getOrCreateSession(req.params.sessionId);
    if (session.client) await session.client.logout().catch(() => null);
    session.client = null;
    setStatus(session, "disconnected");
    res.json(publicStatus(session));
  });

  return { prefix, router };
}

for (const { prefix, router } of [createRouter(""), createRouter("/api")]) {
  app.use(prefix, router);
}

app.listen(PORT, () => {
  console.log(`Shamar OpenWA Gateway running on port ${PORT}`);
  console.log(`Configured sessions: ${SESSION_IDS.join(", ") || DEFAULT_SESSION_ID}`);
  console.log(`Session data path: ${SESSION_DATA_PATH}`);
  for (const sessionId of SESSION_IDS.length ? SESSION_IDS : [DEFAULT_SESSION_ID]) {
    const session = getOrCreateSession(sessionId);
    if (AUTO_START) initializeSession(session).catch(() => null);
  }
});

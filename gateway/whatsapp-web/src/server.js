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

const app = express();
app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGIN === "*" ? true : ALLOWED_ORIGIN }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("tiny"));

let client;
let latestQrText = null;
let latestQrDataUrl = null;
let status = {
  provider: "whatsapp_web",
  status: "idle",
  phone: undefined,
  qrCode: undefined,
  pairingCode: undefined,
  lastSyncAt: undefined,
  error: undefined,
};

function requireToken(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== GATEWAY_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function setStatus(nextStatus) {
  status = {
    ...status,
    ...nextStatus,
    lastSyncAt: new Date().toISOString(),
  };
}

async function notifyShamarConnect(event, payload = {}) {
  if (!SHAMARCONNECT_WEBHOOK_URL) return;

  try {
    await fetch(SHAMARCONNECT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(SHAMARCONNECT_WEBHOOK_TOKEN ? { authorization: `Bearer ${SHAMARCONNECT_WEBHOOK_TOKEN}` } : {}),
      },
      body: JSON.stringify({ event, provider: "whatsapp_web", payload, createdAt: new Date().toISOString() }),
    });
  } catch (error) {
    console.error("Failed to notify ShamarConnect", error);
  }
}

function normalizePhoneFromWid(id = "") {
  return id.replace("@c.us", "").replace("@g.us", "");
}

function getClient() {
  if (client) return client;

  setStatus({ status: "connecting", error: undefined });

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    },
  });

  client.on("qr", async (qr) => {
    latestQrText = qr;
    latestQrDataUrl = await QRCode.toDataURL(qr);
    setStatus({ status: "qr", qrCode: latestQrDataUrl });
    await notifyShamarConnect("connection.qr_received", { qrCode: latestQrDataUrl });
  });

  client.on("authenticated", async () => {
    setStatus({ status: "authenticated" });
    await notifyShamarConnect("connection.authenticated");
  });

  client.on("ready", async () => {
    const info = client.info;
    setStatus({ status: "ready", phone: info?.wid?.user, qrCode: undefined, error: undefined });
    await notifyShamarConnect("connection.ready", { phone: info?.wid?.user });
  });

  client.on("auth_failure", async (message) => {
    setStatus({ status: "error", error: message });
    await notifyShamarConnect("connection.auth_failure", { message });
  });

  client.on("disconnected", async (reason) => {
    setStatus({ status: "disconnected", error: reason });
    await notifyShamarConnect("connection.disconnected", { reason });
    client = undefined;
  });

  client.on("message", async (message) => {
    const contact = await message.getContact().catch(() => null);
    await notifyShamarConnect("message.received", {
      id: message.id?._serialized,
      from: message.from,
      to: message.to,
      body: message.body,
      timestamp: message.timestamp,
      contactName: contact?.pushname || contact?.name,
      phone: normalizePhoneFromWid(message.from),
      isGroup: message.from?.endsWith("@g.us"),
    });
  });

  return client;
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "shamar-whatsapp-web-gateway" }));

app.get("/status", requireToken, (_req, res) => res.json(status));

app.post("/connect", requireToken, async (_req, res) => {
  const instance = getClient();
  if (status.status === "idle" || status.status === "connecting") {
    await instance.initialize();
  }
  res.json(status);
});

app.get("/qr", requireToken, (_req, res) => {
  res.json({ ...status, qrCode: latestQrDataUrl, qrText: latestQrText });
});

app.post("/send-message", requireToken, async (req, res) => {
  if (!client || status.status !== "ready") {
    return res.status(409).json({ error: "WhatsApp client is not ready." });
  }

  const { to, body } = req.body || {};
  if (!to || !body) {
    return res.status(400).json({ error: "Fields to and body are required." });
  }

  const chatId = String(to).includes("@") ? String(to) : `${String(to).replace(/\D/g, "")}@c.us`;
  const message = await client.sendMessage(chatId, String(body));
  res.json({ id: message.id?._serialized, status: "sent" });
});

app.get("/chats", requireToken, async (_req, res) => {
  if (!client || status.status !== "ready") {
    return res.status(409).json({ error: "WhatsApp client is not ready." });
  }

  const chats = await client.getChats();
  res.json(chats.slice(0, 100).map((chat) => ({
    id: chat.id?._serialized,
    name: chat.name,
    isGroup: Boolean(chat.isGroup),
    unreadCount: chat.unreadCount,
    lastMessageAt: chat.timestamp ? new Date(chat.timestamp * 1000).toISOString() : undefined,
  })));
});

app.get("/groups", requireToken, async (_req, res) => {
  if (!client || status.status !== "ready") {
    return res.status(409).json({ error: "WhatsApp client is not ready." });
  }

  const chats = await client.getChats();
  res.json(chats.filter((chat) => chat.isGroup).map((chat) => ({
    id: chat.id?._serialized,
    name: chat.name,
    participantCount: chat.participants?.length || 0,
  })));
});

app.get("/groups/:groupId/participants", requireToken, async (req, res) => {
  if (!client || status.status !== "ready") {
    return res.status(409).json({ error: "WhatsApp client is not ready." });
  }

  const groupId = decodeURIComponent(req.params.groupId);
  const chat = await client.getChatById(groupId);
  if (!chat?.isGroup) {
    return res.status(404).json({ error: "Group not found." });
  }

  const participants = await Promise.all((chat.participants || []).map(async (participant) => {
    const contact = await client.getContactById(participant.id?._serialized).catch(() => null);
    return {
      id: participant.id?._serialized,
      name: contact?.pushname || contact?.name,
      phone: normalizePhoneFromWid(participant.id?._serialized),
      isAdmin: Boolean(participant.isAdmin || participant.isSuperAdmin),
      sourceGroupId: groupId,
      sourceGroupName: chat.name,
    };
  }));

  await notifyShamarConnect("group.participants.extracted", { groupId, groupName: chat.name, total: participants.length });
  res.json(participants);
});

app.post("/logout", requireToken, async (_req, res) => {
  if (client) {
    await client.logout().catch(() => null);
    await client.destroy().catch(() => null);
  }
  client = undefined;
  latestQrText = null;
  latestQrDataUrl = null;
  setStatus({ status: "disconnected", phone: undefined, qrCode: undefined });
  res.json(status);
});

app.listen(PORT, () => {
  console.log(`Shamar WhatsApp Web Gateway running on port ${PORT}`);
});

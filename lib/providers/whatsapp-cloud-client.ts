/**
 * WhatsApp Business Platform (Cloud API) — Meta Graph API v19.0
 * Provider: whatsapp_cloud
 *
 * Env vars required:
 *   WHATSAPP_CLOUD_ACCESS_TOKEN        — permanent system user token or page token
 *   WHATSAPP_CLOUD_PHONE_NUMBER_ID     — phone number ID from Meta Business
 *   WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID — WABA ID
 *   WHATSAPP_CLOUD_VERIFY_TOKEN        — arbitrary secret for webhook verification
 *   WHATSAPP_CLOUD_APP_SECRET          — (optional) for X-Hub-Signature-256 validation
 *
 * Never expose these env vars to client components.
 */

import { createHmac } from "crypto";

const GRAPH_API_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ---------------------------------------------------------------------------
// Config helpers (server-only)
// ---------------------------------------------------------------------------

export function getCloudConfig() {
  return {
    accessToken: process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID || "",
    businessAccountId: process.env.WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID || "",
    verifyToken: process.env.WHATSAPP_CLOUD_VERIFY_TOKEN || "",
    appSecret: process.env.WHATSAPP_CLOUD_APP_SECRET || "",
  };
}

export function isCloudConfigured(): boolean {
  const cfg = getCloudConfig();
  return Boolean(cfg.accessToken && cfg.phoneNumberId && cfg.verifyToken);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CloudSendResult = {
  messageId: string;
  status: "queued" | "sent";
};

export type CloudPhoneStatus = {
  id: string;
  displayPhoneNumber: string;
  verifiedName: string;
  qualityRating: string;
  status: string;
};

export type CloudTemplateComponent = {
  type: "header" | "body" | "button";
  parameters?: Array<{ type: "text"; text: string }>;
  sub_type?: string;
  index?: number;
};

// ---------------------------------------------------------------------------
// Low-level fetch
// ---------------------------------------------------------------------------

async function cloudFetch<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string,
): Promise<T> {
  const cfg = getCloudConfig();
  const token = accessToken || cfg.accessToken;

  if (!token) throw new Error("WHATSAPP_CLOUD_ACCESS_TOKEN is not configured.");

  const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (response.ok) return response.json() as Promise<T>;

  const errorBody = await response.text();
  throw new Error(`Cloud API error ${response.status}: ${errorBody}`);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a plain text message to a phone number (E.164 without +, e.g. 5511999999999).
 * Never call this for automatic broadcasts — only for human-triggered replies.
 */
export async function sendTextMessage(
  to: string,
  body: string,
  override?: { accessToken?: string; phoneNumberId?: string },
): Promise<CloudSendResult> {
  const cfg = getCloudConfig();
  const phoneNumberId = override?.phoneNumberId || cfg.phoneNumberId;
  if (!phoneNumberId) throw new Error("WHATSAPP_CLOUD_PHONE_NUMBER_ID is not configured.");

  const result = await cloudFetch<{
    messages?: Array<{ id: string }>;
    error?: { message: string };
  }>(`/${phoneNumberId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body },
    }),
  }, override?.accessToken);

  if (!result.messages?.[0]?.id) {
    throw new Error(`Cloud API send failed: ${result.error?.message || "no message ID returned"}`);
  }

  return { messageId: result.messages[0].id, status: "sent" };
}

/**
 * Send an approved template message.
 * Templates must be pre-approved by Meta before use.
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  components: CloudTemplateComponent[] = [],
): Promise<CloudSendResult> {
  const cfg = getCloudConfig();
  if (!cfg.phoneNumberId) throw new Error("WHATSAPP_CLOUD_PHONE_NUMBER_ID is not configured.");

  const result = await cloudFetch<{
    messages?: Array<{ id: string }>;
    error?: { message: string };
  }>(`/${cfg.phoneNumberId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    }),
  });

  if (!result.messages?.[0]?.id) {
    throw new Error(`Template send failed: ${result.error?.message || "no message ID returned"}`);
  }

  return { messageId: result.messages[0].id, status: "sent" };
}

/**
 * Get the configured phone number's status from Meta.
 */
export async function getPhoneNumberStatus(): Promise<CloudPhoneStatus> {
  const cfg = getCloudConfig();
  if (!cfg.phoneNumberId) throw new Error("WHATSAPP_CLOUD_PHONE_NUMBER_ID is not configured.");

  const result = await cloudFetch<{
    id: string;
    display_phone_number: string;
    verified_name: string;
    quality_rating: string;
    status: string;
  }>(`/${cfg.phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,status`);

  return {
    id: result.id,
    displayPhoneNumber: result.display_phone_number,
    verifiedName: result.verified_name,
    qualityRating: result.quality_rating,
    status: result.status,
  };
}

// ---------------------------------------------------------------------------
// Webhook helpers
// ---------------------------------------------------------------------------

/**
 * Validate GET webhook verification from Meta.
 * Returns the challenge string if valid, null otherwise.
 */
export function verifyWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null,
): string | null {
  const cfg = getCloudConfig();
  if (mode === "subscribe" && token === cfg.verifyToken && challenge) {
    return challenge;
  }
  return null;
}

/**
 * Validate X-Hub-Signature-256 on incoming POST payloads.
 * Requires WHATSAPP_CLOUD_APP_SECRET to be set in production.
 */
export function validateSignature(rawBody: string, signature: string | null): boolean {
  const cfg = getCloudConfig();
  if (!cfg.appSecret) return process.env.NODE_ENV !== "production";

  if (!signature?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", cfg.appSecret).update(rawBody, "utf8").digest("hex");
  const received = signature.slice("sha256=".length);

  // Timing-safe compare via length check + compare
  if (expected.length !== received.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  }
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Payload parsing helpers (for webhook POST handler)
// ---------------------------------------------------------------------------

export type CloudInboundMessage = {
  waMessageId: string;       // wamid.XXXXX
  from: string;              // phone number, e.g. "5511999999999"
  contactName: string | null;
  body: string | null;
  messageType: string;       // text | image | audio | video | document | sticker | etc.
  timestamp: number;         // unix epoch
  rawPayload: Record<string, unknown>;
};

export type CloudStatusUpdate = {
  waMessageId: string;
  status: string; // sent | delivered | read | failed
  timestamp: number;
  recipientPhone: string;
};

export type ParsedCloudWebhook = {
  businessAccountId: string;
  phoneNumberId: string;
  displayPhone: string;
  messages: CloudInboundMessage[];
  statuses: CloudStatusUpdate[];
};

export function parseCloudWebhookPayload(body: unknown): ParsedCloudWebhook | null {
  if (!body || typeof body !== "object") return null;

  const raw = body as Record<string, unknown>;
  if (raw["object"] !== "whatsapp_business_account") return null;

  const entries = Array.isArray(raw["entry"]) ? (raw["entry"] as unknown[]) : [];
  if (!entries.length) return null;

  const entry = entries[0] as Record<string, unknown>;
  const businessAccountId = String(entry["id"] || "");

  const changes = Array.isArray(entry["changes"]) ? (entry["changes"] as unknown[]) : [];
  if (!changes.length) return null;

  const change = changes[0] as Record<string, unknown>;
  const value = (change["value"] || {}) as Record<string, unknown>;

  const metadata = (value["metadata"] || {}) as Record<string, unknown>;
  const phoneNumberId = String(metadata["phone_number_id"] || "");
  const displayPhone = String(metadata["display_phone_number"] || "");

  // Build a contact name map
  const contactsRaw = Array.isArray(value["contacts"]) ? (value["contacts"] as unknown[]) : [];
  const contactNameByPhone = new Map<string, string>();
  for (const c of contactsRaw) {
    const ct = c as Record<string, unknown>;
    const waId = String(ct["wa_id"] || "");
    const profile = (ct["profile"] || {}) as Record<string, unknown>;
    const name = String(profile["name"] || "");
    if (waId && name) contactNameByPhone.set(waId, name);
  }

  // Parse inbound messages
  const messagesRaw = Array.isArray(value["messages"]) ? (value["messages"] as unknown[]) : [];
  const messages: CloudInboundMessage[] = [];

  for (const m of messagesRaw) {
    const msg = m as Record<string, unknown>;
    const from = String(msg["from"] || "");
    const waMessageId = String(msg["id"] || "");
    const messageType = String(msg["type"] || "text");
    const timestamp = Number(msg["timestamp"] || 0);

    let body: string | null = null;
    if (messageType === "text") {
      const textObj = (msg["text"] || {}) as Record<string, unknown>;
      body = String(textObj["body"] || "") || null;
    } else if (messageType === "image" || messageType === "video" || messageType === "audio" || messageType === "document") {
      const mediaObj = (msg[messageType] || {}) as Record<string, unknown>;
      body = String(mediaObj["caption"] || `[${messageType}]`) || `[${messageType}]`;
    } else if (messageType === "sticker") {
      body = "[sticker]";
    } else if (messageType === "location") {
      body = "[localização]";
    } else if (messageType === "interactive") {
      const ia = (msg["interactive"] || {}) as Record<string, unknown>;
      const btnReply = (ia["button_reply"] || {}) as Record<string, unknown>;
      const listReply = (ia["list_reply"] || {}) as Record<string, unknown>;
      body = String(btnReply["title"] || listReply["title"] || "[interativo]");
    }

    messages.push({
      waMessageId,
      from,
      contactName: contactNameByPhone.get(from) || null,
      body,
      messageType,
      timestamp,
      rawPayload: msg,
    });
  }

  // Parse status updates
  const statusesRaw = Array.isArray(value["statuses"]) ? (value["statuses"] as unknown[]) : [];
  const statuses: CloudStatusUpdate[] = statusesRaw.map((s) => {
    const st = s as Record<string, unknown>;
    return {
      waMessageId: String(st["id"] || ""),
      status: String(st["status"] || ""),
      timestamp: Number(st["timestamp"] || 0),
      recipientPhone: String(st["recipient_id"] || ""),
    };
  });

  return { businessAccountId, phoneNumberId, displayPhone, messages, statuses };
}

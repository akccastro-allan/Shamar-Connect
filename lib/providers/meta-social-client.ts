/**
 * Meta Messaging — Instagram Direct e Facebook Messenger (Graph API v20.0)
 * Providers: "instagram" e "messenger"
 *
 * Diferente do WhatsApp Cloud (token único em env), aqui cada empresa conecta
 * sua própria conta na tabela `social_accounts`, então o token de página é
 * passado por parâmetro (nunca lido de env). Apenas o verify token e o app
 * secret do webhook vêm de env, pois são do app Meta (compartilhados):
 *
 *   META_SOCIAL_VERIFY_TOKEN  — segredo arbitrário para verificação do webhook
 *   META_APP_SECRET           — (opcional) valida X-Hub-Signature-256
 *                               (cai para WHATSAPP_CLOUD_APP_SECRET se o app for o mesmo)
 *
 * Nunca exponha estas variáveis a componentes client.
 */

import { createHmac } from "crypto";

const GRAPH_API_VERSION = "v20.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export type SocialProvider = "instagram" | "messenger";

export function getSocialWebhookConfig() {
  return {
    verifyToken: process.env.META_SOCIAL_VERIFY_TOKEN || "",
    appSecret: process.env.META_APP_SECRET || process.env.WHATSAPP_CLOUD_APP_SECRET || "",
  };
}

// ---------------------------------------------------------------------------
// Facebook Login (OAuth) — fluxo "Conectar com Facebook"
// ---------------------------------------------------------------------------

export function getOAuthConfig() {
  return {
    appId: process.env.META_APP_ID || "",
    appSecret: process.env.META_APP_SECRET || process.env.WHATSAPP_CLOUD_APP_SECRET || "",
  };
}

export function isOAuthConfigured(): boolean {
  const cfg = getOAuthConfig();
  return Boolean(cfg.appId && cfg.appSecret);
}

// Permissões necessárias para receber/responder DMs de Página e Instagram.
const OAUTH_SCOPES = [
  "pages_show_list",
  "pages_messaging",
  "pages_manage_metadata",
  "business_management",
  "instagram_basic",
  "instagram_manage_messages",
].join(",");

/** Monta a URL do diálogo de login da Meta. */
export function buildLoginUrl(redirectUri: string, state: string): string {
  const cfg = getOAuthConfig();
  const params = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: redirectUri,
    state,
    scope: OAUTH_SCOPES,
    response_type: "code",
  });
  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

/** Troca o code do callback por um user access token. */
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const cfg = getOAuthConfig();
  const params = new URLSearchParams({
    client_id: cfg.appId,
    client_secret: cfg.appSecret,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`, { cache: "no-store" });
  const data = (await res.json()) as { access_token?: string; error?: { message: string } };
  if (!res.ok || !data.access_token) {
    throw new Error(`Falha ao trocar code: ${data.error?.message || res.status}`);
  }
  return data.access_token;
}

export type ManagedPage = {
  id: string;
  name: string;
  accessToken: string;
  instagram?: { id: string; username: string | null } | null;
};

/** Lista as Páginas que o usuário administra, com token e IG vinculado. */
export async function listManagedPages(userAccessToken: string): Promise<ManagedPage[]> {
  const res = await fetch(
    `${GRAPH_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(userAccessToken)}`,
    { cache: "no-store" },
  );
  const data = (await res.json()) as {
    data?: Array<{
      id: string;
      name: string;
      access_token: string;
      instagram_business_account?: { id: string; username?: string };
    }>;
    error?: { message: string };
  };
  if (!res.ok || !data.data) {
    throw new Error(`Falha ao listar páginas: ${data.error?.message || res.status}`);
  }
  return data.data.map((p) => ({
    id: p.id,
    name: p.name,
    accessToken: p.access_token,
    instagram: p.instagram_business_account
      ? { id: p.instagram_business_account.id, username: p.instagram_business_account.username || null }
      : null,
  }));
}

// ---------------------------------------------------------------------------
// Webhook helpers
// ---------------------------------------------------------------------------

/** Verificação GET do webhook. Retorna o challenge se válido, senão null. */
export function verifyWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null,
): string | null {
  const cfg = getSocialWebhookConfig();
  if (mode === "subscribe" && cfg.verifyToken && token === cfg.verifyToken && challenge) {
    return challenge;
  }
  return null;
}

/**
 * Valida o X-Hub-Signature-256 dos POSTs. Em produção, META_APP_SECRET é obrigatório.
 */
export function validateSignature(rawBody: string, signature: string | null): boolean {
  const cfg = getSocialWebhookConfig();
  if (!cfg.appSecret) return process.env.NODE_ENV !== "production";
  if (!signature?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", cfg.appSecret).update(rawBody, "utf8").digest("hex");
  const received = signature.slice("sha256=".length);
  if (expected.length !== received.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  }
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Parsing do payload (Messenger / Instagram)
// ---------------------------------------------------------------------------

export type SocialInboundMessage = {
  provider: SocialProvider;
  accountId: string; // entry.id — Page id (messenger) ou IG account id (instagram)
  senderId: string;  // PSID (messenger) ou IGSID (instagram)
  messageId: string; // message.mid
  body: string | null;
  messageType: string; // text | attachment
  timestamp: number; // epoch ms
  rawPayload: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

/**
 * Normaliza o webhook do Messenger (object="page") e do Instagram
 * (object="instagram"). Ambos usam entry[].messaging[]. Ecos (mensagens que
 * nós mesmos enviamos) e eventos sem mensagem de texto são ignorados.
 */
export function parseSocialWebhookPayload(body: unknown): SocialInboundMessage[] {
  const raw = asRecord(body);
  const object = raw["object"];

  let provider: SocialProvider;
  if (object === "instagram") provider = "instagram";
  else if (object === "page") provider = "messenger";
  else return [];

  const entries = Array.isArray(raw["entry"]) ? (raw["entry"] as unknown[]) : [];
  const out: SocialInboundMessage[] = [];

  for (const entryRaw of entries) {
    const entry = asRecord(entryRaw);
    const accountId = String(entry["id"] || "");
    const messaging = Array.isArray(entry["messaging"]) ? (entry["messaging"] as unknown[]) : [];

    for (const evRaw of messaging) {
      const ev = asRecord(evRaw);
      const message = asRecord(ev["message"]);
      if (!message || Object.keys(message).length === 0) continue; // postback/delivery/read
      if (message["is_echo"] === true) continue; // mensagem enviada por nós

      const senderId = String(asRecord(ev["sender"])["id"] || "");
      const messageId = String(message["mid"] || "");
      if (!senderId || !messageId) continue;

      const text = message["text"] != null ? String(message["text"]) : null;
      const hasAttachments = Array.isArray(message["attachments"]) && (message["attachments"] as unknown[]).length > 0;

      out.push({
        provider,
        accountId,
        senderId,
        messageId,
        body: text ?? (hasAttachments ? "[anexo]" : null),
        messageType: text ? "text" : hasAttachments ? "attachment" : "unknown",
        timestamp: Number(ev["timestamp"] || 0),
        rawPayload: ev,
      });
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Graph API (envio / perfil) — token de página por parâmetro
// ---------------------------------------------------------------------------

async function graphFetch<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  if (!accessToken) throw new Error("Conta social sem access_token configurado.");
  const sep = path.includes("?") ? "&" : "?";
  const url = `${GRAPH_BASE}${path}${sep}access_token=${encodeURIComponent(accessToken)}`;

  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });

  if (response.ok) return response.json() as Promise<T>;
  const errorBody = await response.text();
  throw new Error(`Meta Graph API error ${response.status}: ${errorBody}`);
}

export type SocialSendResult = { messageId: string; recipientId: string };

/**
 * Envia uma mensagem de texto numa DM (resposta humana). Vale a janela de 24h
 * de mensagens padrão da Meta — fora dela a chamada falha.
 */
export async function sendText(accessToken: string, recipientId: string, text: string): Promise<SocialSendResult> {
  const result = await graphFetch<{ message_id?: string; recipient_id?: string; error?: { message: string } }>(
    "/me/messages",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        recipient: { id: recipientId },
        messaging_type: "RESPONSE",
        message: { text },
      }),
    },
  );

  if (!result.message_id) {
    throw new Error(`Falha ao enviar DM: ${result.error?.message || "sem message_id"}`);
  }
  return { messageId: result.message_id, recipientId: result.recipient_id || recipientId };
}

/** Busca o nome do contato pelo id (PSID/IGSID). Retorna null se não resolver. */
export async function getUserProfile(accessToken: string, userId: string): Promise<{ name: string | null }> {
  try {
    const data = await graphFetch<{ name?: string; username?: string }>(`/${userId}?fields=name,username`, accessToken);
    return { name: data.name || data.username || null };
  } catch {
    return { name: null };
  }
}

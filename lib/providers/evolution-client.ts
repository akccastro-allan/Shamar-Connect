/**
 * Evolution API (Baileys) — provider "evolution"
 *
 * Baileys é websocket (sem Chrome) → leve e estável. O número real chega no
 * remoteJid (ex.: "5521999999999@s.whatsapp.net"), sem o problema do @lid.
 *
 * MVP por env (uma instância — a da Lips). Multiempresa depois:
 *   EVOLUTION_API_URL          — base da instância Evolution (ex.: https://evo.seu-dominio)
 *   EVOLUTION_API_KEY          — apikey (GLOBAL_API_KEY)
 *   EVOLUTION_INSTANCE         — nome da instância
 *   EVOLUTION_TENANT_ID        — tenant dono dessa instância
 *   EVOLUTION_ORGANIZATION_ID  — organização dona dessa instância
 *
 * Compatível com Evolution API v2 (Node). Caminhos do evolution-go são
 * equivalentes; ajustar aqui se o payload divergir ao testar.
 */

export function getEvolutionConfig() {
  return {
    url: (process.env.EVOLUTION_API_URL || "").replace(/\/$/, ""),
    apiKey: process.env.EVOLUTION_API_KEY || "",
    instance: process.env.EVOLUTION_INSTANCE || "",
    tenantId: process.env.EVOLUTION_TENANT_ID || "",
    organizationId: process.env.EVOLUTION_ORGANIZATION_ID || "",
  };
}

export function isEvolutionConfigured(): boolean {
  const cfg = getEvolutionConfig();
  return Boolean(cfg.url && cfg.apiKey && cfg.instance);
}

async function evoFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cfg = getEvolutionConfig();
  if (!cfg.url || !cfg.apiKey) throw new Error("Evolution não configurada (EVOLUTION_API_URL / EVOLUTION_API_KEY).");

  const response = await fetch(`${cfg.url}${path}`, {
    ...init,
    headers: { "content-type": "application/json", apikey: cfg.apiKey, ...(init?.headers || {}) },
    cache: "no-store",
  });

  if (response.ok) return response.json() as Promise<T>;
  const errorBody = await response.text();
  throw new Error(`Evolution API error ${response.status}: ${errorBody}`);
}

// ---------------------------------------------------------------------------
// Envio
// ---------------------------------------------------------------------------

/**
 * Envia texto. `to` = número (com DDI) ou JID; normalizamos para dígitos.
 * `instance` permite escolher a instância do canal (Marco 1). Sem ela, cai no
 * EVOLUTION_INSTANCE do ENV (compat).
 */
export async function sendText(to: string, text: string, instance?: string): Promise<{ messageId: string }> {
  const cfg = getEvolutionConfig();
  const inst = instance || cfg.instance;
  const number = String(to).replace(/@.*/, "").replace(/\D/g, "");

  const data = await evoFetch<{ key?: { id?: string }; messageId?: string; error?: string }>(
    `/message/sendText/${encodeURIComponent(inst)}`,
    { method: "POST", body: JSON.stringify({ number, text }) },
  );

  const id = data?.key?.id || data?.messageId || "";
  if (!id) throw new Error(`Evolution: envio sem id (${JSON.stringify(data)})`);
  return { messageId: id };
}

// ---------------------------------------------------------------------------
// Conexão (status / QR) — para a tela de conectar
// ---------------------------------------------------------------------------

export async function getConnectionState(): Promise<{ state: string }> {
  const cfg = getEvolutionConfig();
  const data = await evoFetch<{ instance?: { state?: string }; state?: string }>(
    `/instance/connectionState/${encodeURIComponent(cfg.instance)}`,
  );
  return { state: data?.instance?.state || data?.state || "unknown" };
}

export async function getQrCode(): Promise<{ base64: string | null; code: string | null }> {
  const cfg = getEvolutionConfig();
  const data = await evoFetch<{ base64?: string; code?: string }>(
    `/instance/connect/${encodeURIComponent(cfg.instance)}`,
  );
  return { base64: data?.base64 || null, code: data?.code || null };
}

// ---------------------------------------------------------------------------
// Normalização do webhook (messages.upsert)
// ---------------------------------------------------------------------------

export type EvolutionInbound = {
  instance: string;
  senderId: string; // número real (dígitos)
  externalChatId: string; // remoteJid
  messageId: string;
  body: string | null;
  messageType: string;
  timestamp: number; // epoch ms
  isGroup: boolean;
  pushName: string | null;
  fromMe: boolean;
  rawPayload: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function extractText(message: Record<string, unknown>): string | null {
  if (typeof message["conversation"] === "string") return message["conversation"] as string;
  const ext = asRecord(message["extendedTextMessage"]);
  if (typeof ext["text"] === "string") return ext["text"] as string;
  const img = asRecord(message["imageMessage"]);
  if (img && Object.keys(img).length) return String(img["caption"] || "[imagem]");
  const aud = asRecord(message["audioMessage"]);
  if (aud && Object.keys(aud).length) return "[áudio]";
  const doc = asRecord(message["documentMessage"]);
  if (doc && Object.keys(doc).length) return String(doc["caption"] || "[documento]");
  if (asRecord(message["stickerMessage"]) && Object.keys(asRecord(message["stickerMessage"])).length) return "[figurinha]";
  return null;
}

/** Aceita evento único ou em lote. Ignora mensagens enviadas por nós (fromMe). */
export function parseEvolutionWebhook(body: unknown): EvolutionInbound[] {
  const raw = asRecord(body);
  const event = String(raw["event"] || "");
  if (event && event !== "messages.upsert") return [];

  const instance = String(raw["instance"] || "");
  const dataField = raw["data"];
  const items = Array.isArray(dataField) ? dataField : [dataField];
  const out: EvolutionInbound[] = [];

  for (const itemRaw of items) {
    const item = asRecord(itemRaw);
    const key = asRecord(item["key"]);
    const message = asRecord(item["message"]);
    if (!key || Object.keys(message).length === 0) continue;
    if (key["fromMe"] === true) continue;

    const remoteJid = String(key["remoteJid"] || "");
    if (!remoteJid) continue;
    const isGroup = remoteJid.endsWith("@g.us");
    const messageId = String(key["id"] || "");
    const tsRaw = Number(item["messageTimestamp"] || 0);

    out.push({
      instance,
      senderId: remoteJid.replace(/@.*/, "").replace(/\D/g, ""),
      externalChatId: remoteJid,
      messageId,
      body: extractText(message),
      messageType: typeof message["conversation"] === "string" || message["extendedTextMessage"] ? "text" : "media",
      timestamp: tsRaw > 1e12 ? tsRaw : tsRaw * 1000, // epoch s → ms quando necessário
      isGroup,
      pushName: item["pushName"] ? String(item["pushName"]) : null,
      fromMe: false,
      rawPayload: item,
    });
  }

  return out;
}

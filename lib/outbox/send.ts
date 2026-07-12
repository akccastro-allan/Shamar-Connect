/**
 * Marco 1 — Envio preso ao canal + fila (message_outbox).
 *
 * Regra: nada sai sem channel_id. O canal define o provider e as credenciais
 * (instância Evolution, número Meta, token da conta social, sessão do gateway).
 * Nunca usa instância/credencial global "padrão" para escolher por quem enviar.
 */

import type { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { normalizeProvider } from "@/lib/providers/provider-aliases";
import { sendText as evolutionSendText } from "@/lib/providers/evolution-client";
import { sendTextMessage as cloudSendText } from "@/lib/providers/whatsapp-cloud-client";
import { sendText as socialSendText } from "@/lib/providers/meta-social-client";
import {
  createWhatsappGatewayClient,
  isAllowedSessionId,
  whatsappWebGatewayClient,
} from "@/lib/providers/whatsapp-web-gateway-client";

type Db = ReturnType<typeof createSupabaseWriteClient>;

/**
 * Despacha uma mensagem pelo provider DO CANAL, usando a config do próprio canal.
 * Lança erro com mensagem clara em caso de falha.
 */
export async function sendMessageByChannel(
  db: Db,
  channelId: string,
  toExternalId: string,
  body: string,
): Promise<{ providerMessageId: string }> {
  const { data: channel } = await db
    .from("channels")
    .select("id, tenant_id, provider, external_instance, phone_number_id, session_id, gateway_id, status, metadata")
    .eq("id", channelId)
    .maybeSingle();

  if (!channel) throw new Error("Canal não encontrado.");
  const provider = normalizeProvider(channel.provider);

  if (provider === "evolution") {
    const r = await evolutionSendText(toExternalId, body, channel.external_instance || undefined);
    return { providerMessageId: r.messageId };
  }

  if (provider === "meta_whatsapp") {
    const { data: cred } = await db
      .from("channel_credentials")
      .select("access_token")
      .eq("channel_id", channelId)
      .maybeSingle();
    const r = await cloudSendText(toExternalId, body, {
      accessToken: cred?.access_token || undefined,
      phoneNumberId: channel.phone_number_id || undefined,
    });
    return { providerMessageId: r.messageId };
  }

  if (provider === "meta_instagram" || provider === "meta_messenger") {
    const { data: account } = await db
      .from("social_accounts")
      .select("access_token")
      .eq("channel_id", channelId)
      .eq("status", "active")
      .maybeSingle();
    if (!account?.access_token) throw new Error("Conta social não conectada para este canal.");
    const r = await socialSendText(account.access_token, toExternalId, body);
    return { providerMessageId: r.messageId };
  }

  // whatsapp_web_legacy (gateway por sessão do canal).
  const sessionId = channel.session_id;
  if (channel.gateway_id) {
    const metadata = channel.metadata && typeof channel.metadata === "object" && !Array.isArray(channel.metadata)
      ? channel.metadata as Record<string, unknown>
      : {};
    if (metadata.commandCenterInternal === true && channel.status !== "connected") {
      throw new Error("Sessão interna não está conectada.");
    }
    const { data: gateway } = await db
      .from("internal_messaging_gateways")
      .select("id, tenant_id, base_url, status")
      .eq("tenant_id", channel.tenant_id)
      .eq("id", channel.gateway_id)
      .maybeSingle();
    if (!gateway || gateway.status !== "active") throw new Error("Gateway interno não está ativo.");
    if (!sessionId || !isAllowedSessionId(sessionId)) throw new Error("Canal interno sem session ID válido.");
    const r = await createWhatsappGatewayClient(sessionId, { baseUrl: gateway.base_url }).sendMessage({ to: toExternalId, body });
    return { providerMessageId: r.id };
  }

  const client =
    sessionId && isAllowedSessionId(sessionId)
      ? createWhatsappGatewayClient(sessionId)
      : whatsappWebGatewayClient;
  const r = await client.sendMessage({ to: toExternalId, body });
  return { providerMessageId: r.id };
}

const BACKOFF_SECONDS = [30, 120, 600, 1800, 3600];

/** Marca a mensagem local + o item do outbox como enviados. */
async function markSent(db: Db, outboxId: string, messageId: string | null, providerMessageId: string) {
  const now = new Date().toISOString();
  await db
    .from("message_outbox")
    .update({ status: "sent", provider_message_id: providerMessageId, last_error: null, updated_at: now })
    .eq("id", outboxId);
  if (messageId) {
    await db
      .from("whatsapp_messages")
      .update({ delivery_status: "sent", sent_at: now, external_message_id: providerMessageId })
      .eq("id", messageId);
  }
}

/** Marca falha: incrementa tentativa, agenda retry, reflete na mensagem local. */
async function markFailed(db: Db, outboxId: string, messageId: string | null, attempts: number, error: string) {
  const now = new Date().toISOString();
  const delay = BACKOFF_SECONDS[Math.min(attempts, BACKOFF_SECONDS.length - 1)];
  const next = new Date(Date.now() + delay * 1000).toISOString();
  await db
    .from("message_outbox")
    .update({ status: "failed", attempts, last_error: error.slice(0, 500), scheduled_at: next, updated_at: now })
    .eq("id", outboxId);
  if (messageId) {
    await db
      .from("whatsapp_messages")
      .update({ delivery_status: "failed", failed_at: now, failure_message: error.slice(0, 500) })
      .eq("id", messageId);
  }
}

/**
 * Tenta enviar um item do outbox 1x. Atualiza outbox + mensagem local.
 * Retorna o status final desta tentativa.
 */
export async function dispatchOutboxItem(
  db: Db,
  item: {
    id: string;
    channel_id: string;
    message_id: string | null;
    to_external_id: string;
    body: string;
    attempts: number;
  },
): Promise<"sent" | "failed"> {
  await db.from("message_outbox").update({ status: "sending", updated_at: new Date().toISOString() }).eq("id", item.id);
  try {
    const { providerMessageId } = await sendMessageByChannel(db, item.channel_id, item.to_external_id, item.body);
    await markSent(db, item.id, item.message_id, providerMessageId);
    return "sent";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markFailed(db, item.id, item.message_id, item.attempts + 1, msg);
    return "failed";
  }
}

/** Worker: processa itens prontos (queued/failed com attempts<max e agendados). */
export async function processOutbox(db: Db, limit = 25): Promise<{ sent: number; failed: number }> {
  const nowIso = new Date().toISOString();
  const { data: items } = await db
    .from("message_outbox")
    .select("id, channel_id, message_id, to_external_id, body, attempts, max_attempts")
    .in("status", ["queued", "failed"])
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  let sent = 0;
  let failed = 0;
  for (const it of items || []) {
    if (it.attempts >= it.max_attempts) continue; // esgotado; fica como failed
    const r = await dispatchOutboxItem(db, it);
    if (r === "sent") sent += 1;
    else failed += 1;
  }
  return { sent, failed };
}

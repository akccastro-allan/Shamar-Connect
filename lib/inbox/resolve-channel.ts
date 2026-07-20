/**
 * Marco 1 — Resolução de canal a partir do webhook.
 *
 * Regra absoluta: o canal vem SEMPRE do conteúdo do webhook, nunca de ENV e
 * nunca "pega o primeiro canal do tenant". Sem canal resolvido, o evento é
 * registrado como unresolved_channel e NÃO vira atendimento.
 */

import type { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { normalizeProvider, type CanonicalProvider } from "../providers/provider-aliases.ts";

type Db = ReturnType<typeof createSupabaseWriteClient>;

export type ChannelResolution = {
  channelId: string;
  tenantId: string;
  organizationId: string;
  provider: CanonicalProvider;
};

export type ResolveHints = {
  /** Evolution: nome da instância (raw["instance"]). */
  instance?: string | null;
  /** Meta Cloud: metadata.phone_number_id do evento. */
  phoneNumberId?: string | null;
  /** IG/Messenger: entry.id (== social_accounts.external_account_id). */
  accountId?: string | null;
  /** WhatsApp Web legado: session_id do gateway. */
  sessionId?: string | null;
};

/**
 * Resolve o canal dono do evento. Retorna null quando nada casa — o chamador
 * deve gravar provider_event com processing_status='unresolved_channel' e parar.
 */
export async function resolveChannelFromWebhook(
  db: Db,
  rawProvider: string,
  hints: ResolveHints,
): Promise<ChannelResolution | null> {
  const provider = normalizeProvider(rawProvider);
  if (!provider) return null;

  if (provider === "evolution") {
    if (!hints.instance) return null;
    return byChannelQuery(db, provider, "external_instance", hints.instance);
  }

  if (provider === "meta_whatsapp") {
    if (!hints.phoneNumberId) return null;
    return byChannelQuery(db, provider, "phone_number_id", hints.phoneNumberId);
  }

  if (provider === "meta_instagram" || provider === "meta_messenger") {
    if (!hints.accountId) return null;
    return bySocialAccount(db, provider, hints.accountId);
  }

  if (provider === "whatsapp_web_legacy") {
    if (!hints.sessionId) return null;
    // Legado: session_id pode estar duplicado entre orgs (cruft -oriah). Se a
    // resolução for ambígua (>1 linha), tratamos como NÃO resolvido.
    return (await bySessionId(db, hints.sessionId)) || byLegacyExternalInstance(db, hints.sessionId);
  }

  return null;
}

async function byChannelQuery(
  db: Db,
  provider: CanonicalProvider,
  column: "external_instance" | "phone_number_id",
  value: string,
): Promise<ChannelResolution | null> {
  const { data } = await db
    .from("channels")
    .select("id, tenant_id, organization_id")
    .eq("provider", provider)
    .eq(column, value)
    .limit(2);

  if (!data || data.length !== 1) return null; // 0 = não existe; >1 = ambíguo
  const ch = data[0];
  if (!ch.tenant_id || !ch.organization_id) return null;
  return { channelId: ch.id, tenantId: ch.tenant_id, organizationId: ch.organization_id, provider };
}

async function bySocialAccount(
  db: Db,
  provider: CanonicalProvider,
  accountId: string,
): Promise<ChannelResolution | null> {
  const { data } = await db
    .from("social_accounts")
    .select("tenant_id, organization_id, channel_id")
    .eq("provider", provider === "meta_instagram" ? "instagram" : "messenger")
    .eq("external_account_id", accountId)
    .eq("status", "active")
    .limit(2);

  if (!data || data.length !== 1) return null;
  const acc = data[0];
  if (!acc.channel_id || !acc.tenant_id || !acc.organization_id) return null;
  return { channelId: acc.channel_id, tenantId: acc.tenant_id, organizationId: acc.organization_id, provider };
}

async function bySessionId(db: Db, sessionId: string): Promise<ChannelResolution | null> {
  console.log("[resolve-channel] bySessionId searching for:", sessionId);
  const { data } = await db
    .from("channels")
    .select("id, tenant_id, organization_id")
    .eq("session_id", sessionId)
    .limit(2);

  console.log("[resolve-channel] bySessionId found rows:", data?.length ?? 0);
  if (!data || data.length !== 1) return null; // ambíguo (duplicado entre orgs) = não resolve
  const ch = data[0];
  if (!ch.tenant_id || !ch.organization_id) return null;
  console.log("[resolve-channel] bySessionId resolved to channelId:", ch.id);
  return { channelId: ch.id, tenantId: ch.tenant_id, organizationId: ch.organization_id, provider: "whatsapp_web_legacy" };
}

async function byLegacyExternalInstance(db: Db, externalInstance: string): Promise<ChannelResolution | null> {
  console.log("[resolve-channel] byLegacyExternalInstance searching for:", externalInstance);
  const { data } = await db
    .from("channels")
    .select("id, tenant_id, organization_id, provider")
    .eq("external_instance", externalInstance)
    .limit(3);

  const matches = (data || []).filter((channel) => normalizeProvider(channel.provider) === "whatsapp_web_legacy");
  console.log("[resolve-channel] byLegacyExternalInstance found rows:", matches.length);
  if (matches.length !== 1) return null;

  const ch = matches[0];
  if (!ch.tenant_id || !ch.organization_id) return null;
  console.log("[resolve-channel] byLegacyExternalInstance resolved to channelId:", ch.id);
  return { channelId: ch.id, tenantId: ch.tenant_id, organizationId: ch.organization_id, provider: "whatsapp_web_legacy" };
}

/**
 * Marco 1 — Normalização de providers.
 *
 * Providers canônicos do roteamento por canal. Strings antigas gravadas em
 * conversas/mensagens/canais são normalizadas na leitura/resolução, SEM
 * reescrever os dados em massa (compatibilidade).
 */

export const CANONICAL_PROVIDERS = [
  "evolution",
  "meta_whatsapp",
  "meta_instagram",
  "meta_messenger",
  "whatsapp_web_legacy",
] as const;

export type CanonicalProvider = (typeof CANONICAL_PROVIDERS)[number];

export const PROVIDER_TYPES = ["official_api", "web_gateway"] as const;
export type ProviderType = (typeof PROVIDER_TYPES)[number];

const ALIASES: Record<string, CanonicalProvider> = {
  // legado -> canônico
  whatsapp_web: "whatsapp_web_legacy",
  whatsapp_web_legacy: "whatsapp_web_legacy",
  openwa: "whatsapp_web_legacy",
  whatsapp_cloud: "meta_whatsapp",
  meta_whatsapp: "meta_whatsapp",
  instagram: "meta_instagram",
  meta_instagram: "meta_instagram",
  messenger: "meta_messenger",
  meta_messenger: "meta_messenger",
  evolution: "evolution",
};

/** Normaliza qualquer string de provider para a forma canônica (ou null se desconhecida). */
export function normalizeProvider(value: string | null | undefined): CanonicalProvider | null {
  if (!value) return null;
  return ALIASES[value.trim().toLowerCase()] ?? null;
}

/** True se a string (após normalização) é um provider conhecido. */
export function isKnownProvider(value: string | null | undefined): boolean {
  return normalizeProvider(value) !== null;
}

/** Mapeia provider canônico para seu tipo (official_api | web_gateway). */
export function providerTypeOf(provider: CanonicalProvider): ProviderType {
  if (provider === "meta_whatsapp" || provider === "meta_instagram" || provider === "meta_messenger") {
    return "official_api";
  }
  return "web_gateway";
}

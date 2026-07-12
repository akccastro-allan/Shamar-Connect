import { buildSessionId, isValidSessionId, parseSessionId } from "../providers/session-id.ts";

export const INTERNAL_BUSINESSES = [
  { key: "moriah", label: "Moriah Systems", aliases: ["moriah", "moriah-systems"] },
  { key: "allan", label: "Allan / Pessoal", aliases: ["allan", "allan-pessoal", "pessoal"] },
  { key: "viciados", label: "Viciados em Trilhas", aliases: ["viciados", "viciados-em-trilhas"] },
  { key: "mkshalom", label: "MK Shalom", aliases: ["mkshalom", "mk-shalom"] },
  { key: "shamar-connect", label: "Shamar Connect", aliases: ["shamar", "shamar-connect", "shamarconnect"] },
  { key: "shamar-erp", label: "Shamar ERP", aliases: ["shamarerp", "shamar-erp"] },
  { key: "shamar-church", label: "Shamar Church", aliases: ["shamar-church", "shamarchurch"] },
  { key: "shamar-kids", label: "Shamar Kids", aliases: ["shamarkids", "shamar-kids"] },
  { key: "shamar-events", label: "Shamar Events", aliases: ["shamar-events", "shamarevents"] },
  { key: "oriahfin", label: "OriahFin", aliases: ["oriahfin", "oriah-fin"] },
] as const;

const BLOCKED_CLIENT_ALIASES = new Set(["lips", "hall", "hall-donous", "nutriflow", "nutri-flow"]);

export const INTERNAL_CHANNEL_TYPES = [
  "whatsapp_web",
  "whatsapp_official",
  "instagram",
  "facebook",
  "tiktok",
  "email",
  "website_chat",
] as const;

export const INTERNAL_CHANNEL_PURPOSES = [
  "support",
  "sales",
  "parents",
  "operations",
  "personal",
  "marketing",
  "community",
  "other",
] as const;

export const INTERNAL_CHANNEL_STATUSES = ["draft", "connecting", "connected", "disconnected", "error", "disabled"] as const;
export const INTERNAL_FEATURE_STAGES = ["hidden", "internal_alpha", "internal_active", "internal_approved", "disabled"] as const;
export const INTERNAL_SOCIAL_CONNECTION_STATUSES = ["not_connected", "connected", "token_expired", "connection_error"] as const;

export const INTERNAL_GATEWAYS = [
  {
    id: "gateway-01",
    name: "Gateway 01",
    slug: "gateway-01",
    baseUrl: null,
    environment: "production",
    status: "planned",
    version: null,
    maxSessions: 9,
    activeSessions: 0,
    lastHealthCheck: null,
    lastError: null,
  },
  {
    id: "gateway-02",
    name: "Gateway 02",
    slug: "gateway-02",
    baseUrl: null,
    environment: "production",
    status: "planned",
    version: null,
    maxSessions: 9,
    activeSessions: 0,
    lastHealthCheck: null,
    lastError: null,
  },
] as const;

export const INTERNAL_FEATURE_STAGE_CONFIG = {
  whatsapp_individual_internal: "internal_alpha",
  whatsapp_groups_internal: "internal_alpha",
  whatsapp_communities_internal: "internal_alpha",
  social_channels_internal: "internal_alpha",
  ai_internal: "hidden",
} as const;

export const INTERNAL_GROUP_MODEL = {
  fields: ["identifier", "name", "channelId", "sessionId", "participants", "administrators", "lastEventAt", "readStatus", "manualReplyReady"],
  sendingEnabled: false,
} as const;

export const INTERNAL_COMMUNITY_MODEL = {
  fields: ["community", "announcementGroup", "linkedGroups", "administrators", "metadata", "providerLimitations"],
  sendingEnabled: false,
} as const;

export const INTERNAL_SOCIAL_CONNECTION_MODEL = {
  fields: ["provider", "accountLabel", "externalAccountId", "pageId", "businessId", "status", "tokenStatus", "tokenExpiresAt", "lastEventAt", "lastError"],
  returnedSecrets: false,
} as const;

export const PLANNED_INTERNAL_CHANNELS = [
  { businessKey: "oriahfin", sessionId: "oriahfin-01", purpose: "support", channelType: "whatsapp_web", gatewayId: "gateway-01" },
  { businessKey: "viciados", sessionId: "viciados-01", purpose: "sales", channelType: "whatsapp_web", gatewayId: "gateway-01" },
  { businessKey: "mkshalom", sessionId: "mkshalom-01", purpose: "support", channelType: "whatsapp_web", gatewayId: "gateway-01" },
  { businessKey: "moriah", sessionId: "moriah-01", purpose: "operations", channelType: "whatsapp_web", gatewayId: "gateway-01" },
  { businessKey: "allan", sessionId: "allan-01", purpose: "personal", channelType: "whatsapp_web", gatewayId: "gateway-01" },
  { businessKey: "shamar-kids", sessionId: "shamar-kids-01", purpose: "parents", channelType: "whatsapp_web", gatewayId: "gateway-01" },
  { businessKey: "shamar-kids", sessionId: "shamar-kids-02", purpose: "support", channelType: "whatsapp_web", gatewayId: "gateway-01" },
] as const;

export type InternalBusinessKey = (typeof INTERNAL_BUSINESSES)[number]["key"];
export type InternalChannelType = (typeof INTERNAL_CHANNEL_TYPES)[number];
export type InternalChannelPurpose = (typeof INTERNAL_CHANNEL_PURPOSES)[number];
export type InternalChannelStatus = (typeof INTERNAL_CHANNEL_STATUSES)[number];
export type InternalFeatureStage = (typeof INTERNAL_FEATURE_STAGES)[number];
export type InternalGatewayId = (typeof INTERNAL_GATEWAYS)[number]["id"];
export type InternalSocialConnectionStatus = (typeof INTERNAL_SOCIAL_CONNECTION_STATUSES)[number];

type OrganizationLike = {
  id: string;
  name: string;
  slug?: string | null;
  metadata?: unknown;
};

type ChannelMetadata = Record<string, unknown>;

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "canal";
}

function metadataRecord(value: unknown): ChannelMetadata {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ChannelMetadata : {};
}

export function resolveInternalBusinessKey(organization: OrganizationLike): InternalBusinessKey | null {
  const metadata = metadataRecord(organization.metadata);
  const explicitKey = typeof metadata.commandCenterBusinessKey === "string" ? metadata.commandCenterBusinessKey : null;
  const candidates = [explicitKey, organization.slug, organization.name].filter(Boolean).map((item) => slugify(String(item)));

  if (candidates.some((candidate) => BLOCKED_CLIENT_ALIASES.has(candidate))) return null;

  for (const business of INTERNAL_BUSINESSES) {
    if (candidates.some((candidate) => (business.aliases as readonly string[]).includes(candidate))) return business.key;
  }

  return null;
}

export function getInternalBusinessLabel(key: string) {
  return INTERNAL_BUSINESSES.find((business) => business.key === key)?.label || key;
}

export function isInternalBusinessOrganization(organization: OrganizationLike) {
  return resolveInternalBusinessKey(organization) !== null;
}

export function isInternalChannelMetadata(metadata: unknown) {
  return metadataRecord(metadata).commandCenterInternal === true;
}

export function buildInternalChannelMetadata(input: {
  businessKey: InternalBusinessKey;
  channelType: InternalChannelType;
  accountLabel: string;
  externalAccountId?: string | null;
  purpose: InternalChannelPurpose;
  featureStage: InternalFeatureStage;
  gatewayId?: string | null;
  lastEventAt?: string | null;
  lastError?: string | null;
}) {
  return {
    commandCenterInternal: true,
    businessKey: input.businessKey,
    channelType: input.channelType,
    accountLabel: input.accountLabel,
    externalAccountId: input.externalAccountId || null,
    purpose: input.purpose,
    featureStage: input.featureStage,
    gatewayId: input.gatewayId || null,
    originContext: {
      businessKey: input.businessKey,
      channelType: input.channelType,
      accountLabel: input.accountLabel,
      gatewayId: input.gatewayId || null,
      purpose: input.purpose,
    },
    lastEventAt: input.lastEventAt || null,
    lastError: input.lastError || null,
    environment: "internal",
  };
}

export function resolveProviderForInternalChannel(channelType: InternalChannelType) {
  if (channelType === "whatsapp_web") return { provider: "openwa", providerType: "web_gateway" };
  if (channelType === "whatsapp_official") return { provider: "meta_whatsapp", providerType: "official_api" };
  if (channelType === "facebook") return { provider: "messenger", providerType: "official_api" };
  return { provider: channelType, providerType: "official_api" };
}

export function makeInternalChannelSlug(input: { businessKey: string; channelType: string; accountLabel: string }) {
  return slugify(`${input.businessKey}-${input.channelType}-${input.accountLabel}`);
}

export function isValidInternalWhatsappSessionId(sessionId: string, businessKey: InternalBusinessKey) {
  const parsed = parseSessionId(sessionId);
  return parsed?.companySlug === businessKey && isValidSessionId(sessionId);
}

export function isAllowedInternalGateway(value: string): value is InternalGatewayId {
  return INTERNAL_GATEWAYS.some((gateway) => gateway.id === value);
}

type ExistingSession = {
  sessionId: string | null;
  gatewayId: string | null;
};

export function getNextInternalSessionId(input: {
  businessKey: InternalBusinessKey;
  gatewayId: string;
  existingSessions: ExistingSession[];
}): { ok: true; sessionId: string; sequence: number } | { ok: false; error: string } {
  if (!isAllowedInternalGateway(input.gatewayId)) {
    return { ok: false, error: "Gateway interno inválido." };
  }

  const usedSequences = new Set<number>();
  for (const existing of input.existingSessions) {
    if (existing.gatewayId !== input.gatewayId || !existing.sessionId) continue;
    const parsed = parseSessionId(existing.sessionId);
    if (parsed?.companySlug === input.businessKey) usedSequences.add(parsed.sequence);
  }

  for (let sequence = 1; sequence <= 9; sequence += 1) {
    if (!usedSequences.has(sequence)) {
      return { ok: true, sessionId: buildSessionId(input.businessKey, sequence), sequence };
    }
  }

  return {
    ok: false,
    error: "Este gateway atingiu o limite de nove sessões para esta empresa. Selecione outro gateway.",
  };
}

export function validateInternalSessionRegistration(input: {
  businessKey: InternalBusinessKey;
  gatewayId: string;
  sessionId: string;
  existingSessions: ExistingSession[];
}): { ok: true } | { ok: false; error: string } {
  if (!isAllowedInternalGateway(input.gatewayId)) return { ok: false, error: "Gateway interno inválido." };
  if (!isValidInternalWhatsappSessionId(input.sessionId, input.businessKey)) {
    return { ok: false, error: "WhatsApp Web interno exige session ID no padrão <empresa>-01 até <empresa>-09." };
  }
  if (input.existingSessions.some((existing) => existing.gatewayId === input.gatewayId && existing.sessionId === input.sessionId)) {
    return { ok: false, error: "Este session ID já está cadastrado neste gateway." };
  }

  const sameCompanyOnGateway = input.existingSessions.filter((existing) => {
    if (existing.gatewayId !== input.gatewayId || !existing.sessionId) return false;
    return parseSessionId(existing.sessionId)?.companySlug === input.businessKey;
  });
  if (sameCompanyOnGateway.length >= 9) {
    return {
      ok: false,
      error: "Este gateway atingiu o limite de nove sessões para esta empresa. Selecione outro gateway.",
    };
  }

  return { ok: true };
}

export function getChannelGatewayId(metadata: unknown) {
  const record = metadataRecord(metadata);
  return typeof record.gatewayId === "string" ? record.gatewayId : "gateway-01";
}

export function getMigrationReadinessReport() {
  return {
    required: true,
    summary: "Persistir gateways internos e unicidade de session_id por gateway.",
    tables: [
      "internal_messaging_gateways",
      "channels.gateway_id ou channels.metadata.gatewayId migrado para coluna dedicada",
    ],
    constraints: [
      "unique(tenant_id, gateway_id, session_id)",
      "check session_id matches ^[a-z0-9]+(?:-[a-z0-9]+)*-0[1-9]$ for whatsapp_web internal",
    ],
    notes: [
      "channels tem leitura pública em RLS; secrets devem continuar fora de channels/metadata.",
      "A etapa atual usa metadata.gatewayId apenas para validação e planejamento, sem criar migration.",
    ],
  };
}

export function isAllowedInternalChannelType(value: string): value is InternalChannelType {
  return (INTERNAL_CHANNEL_TYPES as readonly string[]).includes(value);
}

export function isAllowedInternalPurpose(value: string): value is InternalChannelPurpose {
  return (INTERNAL_CHANNEL_PURPOSES as readonly string[]).includes(value);
}

export function isAllowedInternalStatus(value: string): value is InternalChannelStatus {
  return (INTERNAL_CHANNEL_STATUSES as readonly string[]).includes(value);
}

export function isAllowedInternalFeatureStage(value: string): value is InternalFeatureStage {
  return (INTERNAL_FEATURE_STAGES as readonly string[]).includes(value);
}

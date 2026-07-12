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

export type InternalBusinessKey = (typeof INTERNAL_BUSINESSES)[number]["key"];
export type InternalChannelType = (typeof INTERNAL_CHANNEL_TYPES)[number];
export type InternalChannelPurpose = (typeof INTERNAL_CHANNEL_PURPOSES)[number];
export type InternalChannelStatus = (typeof INTERNAL_CHANNEL_STATUSES)[number];
export type InternalFeatureStage = (typeof INTERNAL_FEATURE_STAGES)[number];

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
}) {
  return {
    commandCenterInternal: true,
    businessKey: input.businessKey,
    channelType: input.channelType,
    accountLabel: input.accountLabel,
    externalAccountId: input.externalAccountId || null,
    purpose: input.purpose,
    featureStage: input.featureStage,
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
  return new RegExp(`^${businessKey}-0[1-9]$`).test(sessionId);
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

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppContext } from "@/lib/auth/app-context";

export type FeatureKey =
  | "whatsapp"
  | "inbox"
  | "contacts"
  | "team"
  | "automation_rules"
  | "catalog"
  | "basic_reports"
  | "command_center"
  | "platform_admin"
  | "meta_readiness"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "email"
  | "ai_assistant"
  | "omnichannel"
  | "experimental";

export type FeatureContext = {
  tenantType: "platform" | "client";
  role: "owner" | "admin" | "supervisor" | "agent" | "attendant" | "viewer";
  organizationId?: string;
  userId?: string;
  metadata?: TenantMetadata;
};

export type FeatureFlag = FeatureKey | "meta_channels";
export type FeatureStageFlag = "commercial_agent" | "commercial_agent_lips" | "commercial_agent_suggestions" | "commercial_agent_automation";
export type TenantMetadata = Record<string, unknown> | null;

const platformAdminRoles = new Set<AppContext["role"]>(["owner", "admin"]);
const platformFeatures = new Set<FeatureKey>([
  "whatsapp",
  "inbox",
  "contacts",
  "team",
  "automation_rules",
  "catalog",
  "basic_reports",
  "command_center",
  "platform_admin",
  "meta_readiness",
]);
const clientDefaultFeatures = new Set<FeatureKey>([
  "whatsapp",
  "inbox",
  "contacts",
  "team",
  "automation_rules",
  "basic_reports",
]);

export async function getTenantFeatureMetadata(db: SupabaseClient, tenantId: string): Promise<TenantMetadata> {
  const { data } = await db
    .from("tenants")
    .select("metadata")
    .eq("id", tenantId)
    .maybeSingle();

  return normalizeMetadata(data?.metadata);
}

export function normalizeMetadata(value: unknown): TenantMetadata {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function hasTenantFeature(metadata: TenantMetadata, flag: FeatureFlag): boolean {
  const features = metadata?.features;
  return Boolean(
    features &&
      typeof features === "object" &&
      !Array.isArray(features) &&
      (features as Record<string, unknown>)[flag] === true,
  );
}

export function hasTenantFeatureStage(metadata: TenantMetadata, flag: FeatureStageFlag): boolean {
  const features = metadata?.features;
  return Boolean(
    features &&
      typeof features === "object" &&
      !Array.isArray(features) &&
      [true, "internal_alpha", "private_beta", "public_beta", "stable"].includes((features as Record<string, unknown>)[flag] as never),
  );
}

export function canUseFeature(feature: FeatureKey, context: FeatureContext): boolean {
  if (context.tenantType === "platform") {
    if (["owner", "admin"].includes(context.role)) return platformFeatures.has(feature);
    return clientDefaultFeatures.has(feature);
  }

  if (clientDefaultFeatures.has(feature)) return true;
  if (feature === "catalog") return hasTenantFeature(context.metadata ?? null, "catalog");
  return false;
}

export function toFeatureContext(context: AppContext, metadata?: TenantMetadata): FeatureContext {
  return {
    tenantType: context.isPlatformTenant ? "platform" : "client",
    role: context.role,
    organizationId: context.organizationId ?? undefined,
    userId: context.appUserId,
    metadata,
  };
}

export function canAccessPlatformAdmin(context: AppContext): boolean {
  return context.isPlatformTenant && platformAdminRoles.has(context.role);
}

export function canAccessGlobalPlatformAdmin(context: AppContext): boolean {
  return canAccessPlatformAdmin(context) && context.organizationId === null;
}

export function canAccessCommercialAgentLips(context: AppContext, metadata: TenantMetadata): boolean {
  return canAccessGlobalPlatformAdmin(context) && hasTenantFeatureStage(metadata, "commercial_agent_lips");
}

export function canAccessCommandCenter(context: AppContext, metadata: TenantMetadata): boolean {
  return canAccessGlobalPlatformAdmin(context) &&
    hasTenantFeature(metadata, "command_center") &&
    canUseFeature("command_center", toFeatureContext(context, metadata));
}

export function canAccessMetaChannels(context: AppContext, metadata: TenantMetadata): boolean {
  void context;
  void metadata;
  return false;
}

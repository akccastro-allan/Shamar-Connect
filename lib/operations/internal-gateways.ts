import { z } from "zod";
import { isValidSessionId, parseSessionId } from "../providers/session-id.ts";

export const INTERNAL_GATEWAY_PROVIDERS = ["openwa"] as const;
export const INTERNAL_GATEWAY_ENVIRONMENTS = ["test", "production"] as const;
export const INTERNAL_GATEWAY_STATUSES = ["active", "inactive", "error", "maintenance"] as const;
export const INTERNAL_SESSION_STATUSES = ["draft", "starting", "qr_required", "connecting", "connected", "disconnected", "error", "disabled"] as const;

export type InternalGatewayProvider = (typeof INTERNAL_GATEWAY_PROVIDERS)[number];
export type InternalGatewayEnvironment = (typeof INTERNAL_GATEWAY_ENVIRONMENTS)[number];
export type InternalGatewayStatus = (typeof INTERNAL_GATEWAY_STATUSES)[number];
export type InternalSessionStatus = (typeof INTERNAL_SESSION_STATUSES)[number];
export type GatewayHealthState = "online" | "ready" | "degraded" | "offline";

export type InternalGatewayRow = {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  provider: string;
  base_url: string;
  environment: string;
  status: string;
  version: string | null;
  max_sessions: number;
  last_health_check_at: string | null;
  last_error: string | null;
  metadata: unknown;
  created_at?: string | null;
  updated_at?: string | null;
};

export type InternalChannelGatewayRow = {
  id: string;
  tenant_id: string;
  organization_id: string;
  session_id: string | null;
  gateway_id?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  active?: boolean | null;
  metadata?: unknown;
};

export const createInternalGatewaySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60),
  provider: z.enum(INTERNAL_GATEWAY_PROVIDERS).default("openwa"),
  baseUrl: z.string().trim().url().max(500),
  environment: z.enum(INTERNAL_GATEWAY_ENVIRONMENTS),
  status: z.enum(INTERNAL_GATEWAY_STATUSES).default("inactive"),
  version: z.string().trim().max(80).optional(),
  maxSessions: z.number().int().min(1).max(99).default(9),
});

export const updateInternalGatewaySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(80).optional(),
  baseUrl: z.string().trim().url().max(500).optional(),
  environment: z.enum(INTERNAL_GATEWAY_ENVIRONMENTS).optional(),
  status: z.enum(INTERNAL_GATEWAY_STATUSES).optional(),
  version: z.string().trim().max(80).nullable().optional(),
  maxSessions: z.number().int().min(1).max(99).optional(),
  action: z.enum(["health_check"]).optional(),
});

export function maskGatewayBaseUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "url invalida";
  }
}

export function publicGatewaySummary(gateway: InternalGatewayRow, activeSessions = 0) {
  return {
    id: gateway.id,
    name: gateway.name,
    slug: gateway.slug,
    provider: gateway.provider,
    baseUrl: maskGatewayBaseUrl(gateway.base_url),
    environment: gateway.environment,
    status: gateway.status,
    version: gateway.version,
    maxSessions: gateway.max_sessions,
    activeSessions,
    lastHealthCheckAt: gateway.last_health_check_at,
    lastError: gateway.last_error,
  };
}

export function getChannelGatewayId(channel: Pick<InternalChannelGatewayRow, "gateway_id" | "metadata">) {
  if (channel.gateway_id) return channel.gateway_id;
  const metadata = channel.metadata && typeof channel.metadata === "object" && !Array.isArray(channel.metadata)
    ? channel.metadata as Record<string, unknown>
    : {};
  return typeof metadata.gatewayId === "string" ? metadata.gatewayId : null;
}

export function validateGatewayTenant(gateway: Pick<InternalGatewayRow, "tenant_id"> | null, tenantId: string) {
  if (!gateway) return { ok: false as const, error: "Gateway interno não encontrado." };
  if (gateway.tenant_id !== tenantId) return { ok: false as const, error: "Gateway não pertence ao tenant atual." };
  return { ok: true as const };
}

export function validateGatewayCanConnect(gateway: Pick<InternalGatewayRow, "tenant_id" | "status" | "provider"> | null, tenantId: string) {
  const tenant = validateGatewayTenant(gateway, tenantId);
  if (!tenant.ok) return tenant;
  if (!gateway) return { ok: false as const, error: "Gateway interno não encontrado." };
  if (gateway.provider !== "openwa") return { ok: false as const, error: "Provider de gateway inválido." };
  if (gateway.status !== "active") return { ok: false as const, error: "Gateway interno não está ativo." };
  return { ok: true as const };
}

export function getGatewayScopedSessions(input: {
  channels: InternalChannelGatewayRow[];
  organizationId: string;
  gatewayId: string;
  companySlug: string;
}) {
  return input.channels.filter((channel) => {
    if (channel.organization_id !== input.organizationId) return false;
    if (getChannelGatewayId(channel) !== input.gatewayId) return false;
    if (!channel.session_id) return false;
    return parseSessionId(channel.session_id)?.companySlug === input.companySlug;
  });
}

export function validateGatewaySessionLimit(input: {
  channels: InternalChannelGatewayRow[];
  organizationId: string;
  gatewayId: string;
  companySlug: string;
}) {
  const sessions = getGatewayScopedSessions(input);
  if (sessions.length >= 9) {
    return { ok: false as const, error: "Este gateway atingiu o limite de nove sessões para esta empresa. Selecione outro gateway." };
  }
  return { ok: true as const };
}

export function validateGatewaySessionUniqueness(input: {
  channels: InternalChannelGatewayRow[];
  gatewayId: string;
  sessionId: string;
}) {
  if (!isValidSessionId(input.sessionId)) return { ok: false as const, error: "Session ID inválido." };
  const duplicate = input.channels.some((channel) => getChannelGatewayId(channel) === input.gatewayId && channel.session_id === input.sessionId);
  if (duplicate) return { ok: false as const, error: "Este session ID já está cadastrado neste gateway." };
  return { ok: true as const };
}

export function normalizeGatewayHealth(input: {
  ok: boolean;
  status?: number;
  body?: unknown;
  latencyMs: number;
  error?: string | null;
}): { state: GatewayHealthState; version: string | null; latencyMs: number; error: string | null } {
  if (!input.ok) return { state: "offline", version: null, latencyMs: input.latencyMs, error: input.error || `HTTP ${input.status || "erro"}` };
  const body = input.body && typeof input.body === "object" ? input.body as Record<string, unknown> : {};
  const rawStatus = String(body.status || body.state || "").toLowerCase();
  const ready = body.ready === true || rawStatus === "ready" || rawStatus === "ok";
  const version = typeof body.version === "string" ? body.version : null;
  if (ready) return { state: "ready", version, latencyMs: input.latencyMs, error: null };
  return { state: "degraded", version, latencyMs: input.latencyMs, error: "Gateway respondeu, mas não confirmou prontidão." };
}

export function mapProviderSessionStatus(status: string): InternalSessionStatus {
  if (status === "ready") return "connected";
  if (status === "qr") return "qr_required";
  if (status === "connecting" || status === "authenticated") return "connecting";
  if (status === "disconnected" || status === "idle") return "disconnected";
  if (status === "error") return "error";
  return "draft";
}

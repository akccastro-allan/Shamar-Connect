import type { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { isUniqueConstraintError, type InternalGatewayRow } from "./internal-gateways.ts";

type Db = ReturnType<typeof createSupabaseWriteClient>;

type GatewayFilters = {
  status?: string;
  provider?: string;
  environment?: string;
  slug?: string;
};

type GatewayCreateInput = {
  tenantId: string;
  name: string;
  slug: string;
  provider: string;
  baseUrl: string;
  environment: string;
  status: string;
  maxSessions: number;
};

type GatewayUpdateInput = {
  name?: string;
  baseUrl?: string;
  environment?: string;
  status?: string;
  maxSessions?: number;
};

type GatewayHealthInput = {
  status: string;
  version: string | null;
  lastHealthCheckAt: string;
  lastError: string | null;
};

const GATEWAY_SELECT = "id, tenant_id, name, slug, provider, base_url, environment, status, version, max_sessions, last_health_check_at, last_error, metadata, created_at, updated_at";

export async function listInternalGateways(db: Db, tenantId: string, filters: GatewayFilters = {}) {
  let query = db
    .from("internal_messaging_gateways")
    .select(GATEWAY_SELECT)
    .eq("tenant_id", tenantId)
    .order("name");

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.provider) query = query.eq("provider", filters.provider);
  if (filters.environment) query = query.eq("environment", filters.environment);
  if (filters.slug) query = query.eq("slug", filters.slug);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as InternalGatewayRow[];
}

export async function findInternalGatewayById(db: Db, tenantId: string, gatewayId: string) {
  const { data, error } = await db
    .from("internal_messaging_gateways")
    .select(GATEWAY_SELECT)
    .eq("tenant_id", tenantId)
    .eq("id", gatewayId)
    .maybeSingle();
  if (error) throw error;
  return data as InternalGatewayRow | null;
}

export async function createInternalGateway(db: Db, input: GatewayCreateInput) {
  const { data: existing, error: existingError } = await db
    .from("internal_messaging_gateways")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("slug", input.slug)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return { ok: false as const, conflict: true as const };

  const { data, error } = await db
    .from("internal_messaging_gateways")
    .insert({
      tenant_id: input.tenantId,
      name: input.name,
      slug: input.slug,
      provider: input.provider,
      base_url: input.baseUrl,
      environment: input.environment,
      status: input.status,
      max_sessions: input.maxSessions,
      metadata: {},
    })
    .select("id")
    .single();

  if (error) {
    if (isUniqueConstraintError(error)) return { ok: false as const, conflict: true as const };
    throw error;
  }

  return { ok: true as const, gatewayId: data.id as string };
}

export async function updateInternalGateway(db: Db, tenantId: string, gatewayId: string, input: GatewayUpdateInput) {
  const update: Record<string, unknown> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.baseUrl !== undefined) update.base_url = input.baseUrl;
  if (input.environment !== undefined) update.environment = input.environment;
  if (input.status !== undefined) update.status = input.status;
  if (input.maxSessions !== undefined) update.max_sessions = input.maxSessions;

  const { error } = await db
    .from("internal_messaging_gateways")
    .update(update)
    .eq("tenant_id", tenantId)
    .eq("id", gatewayId);
  if (error) throw error;
}

export async function recordGatewayHealth(db: Db, tenantId: string, gatewayId: string, input: GatewayHealthInput) {
  const { error } = await db
    .from("internal_messaging_gateways")
    .update({
      status: input.status,
      version: input.version,
      last_health_check_at: input.lastHealthCheckAt,
      last_error: input.lastError,
    })
    .eq("tenant_id", tenantId)
    .eq("id", gatewayId);
  if (error) throw error;
}

export async function countGatewaySessions(db: Db, tenantId: string) {
  const { data, error } = await db
    .from("channels")
    .select("gateway_id")
    .eq("tenant_id", tenantId)
    .not("gateway_id", "is", null)
    .eq("channel_type", "whatsapp_web")
    .eq("provider_type", "web_gateway")
    .neq("status", "disabled")
    .neq("active", false)
    .neq("is_active", false);
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data || []) {
    const gatewayId = String(row.gateway_id || "");
    if (gatewayId) counts.set(gatewayId, (counts.get(gatewayId) || 0) + 1);
  }
  return counts;
}

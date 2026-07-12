import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { canAccessCommandCenter, getTenantFeatureMetadata } from "@/lib/features/feature-flags";
import {
  createInternalGatewaySchema,
  gatewayListFiltersSchema,
  isUniqueConstraintError,
  normalizeGatewayHealth,
  publicGatewaySummary,
  sanitizeGatewayError,
  updateInternalGatewaySchema,
  validateGatewayBaseUrl,
  type InternalGatewayRow,
} from "@/lib/operations/internal-gateways";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const dynamic = "force-dynamic";

async function requireCommandCenterApi() {
  const context = await getRequiredAppContext();
  const db = createSupabaseWriteClient();
  const metadata = await getTenantFeatureMetadata(db, context.tenantId);

  if (!canAccessCommandCenter(context, metadata)) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "Acesso restrito ao Centro de Comando." }, { status: 403 }) };
  }

  return { ok: true as const, context, db };
}

async function countActiveSessions(db: ReturnType<typeof createSupabaseWriteClient>, tenantId: string) {
  const { data } = await db
    .from("channels")
    .select("gateway_id")
    .eq("tenant_id", tenantId)
    .not("gateway_id", "is", null)
    .eq("channel_type", "whatsapp_web")
    .eq("provider_type", "web_gateway")
    .neq("status", "disabled")
    .neq("active", false)
    .neq("is_active", false);

  const counts = new Map<string, number>();
  for (const row of data || []) {
    const gatewayId = String(row.gateway_id || "");
    if (gatewayId) counts.set(gatewayId, (counts.get(gatewayId) || 0) + 1);
  }
  return counts;
}

async function auditGatewayAction(input: {
  db: ReturnType<typeof createSupabaseWriteClient>;
  userId: string;
  tenantId: string;
  gatewayId: string | null;
  action: string;
  result: string;
}) {
  await input.db.from("audit_logs").insert({
    actor: input.userId,
    action: input.action,
    entity_type: "internal_messaging_gateway",
    entity_id: input.gatewayId,
    metadata: { tenant_id: input.tenantId, result: input.result },
  });
}

async function runHealthCheck(gateway: InternalGatewayRow) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  const started = Date.now();

  try {
    const validation = validateGatewayBaseUrl(gateway.base_url, gateway.environment);
    if (!validation.ok) {
      return normalizeGatewayHealth({ ok: false, latencyMs: Date.now() - started, error: validation.error });
    }
    const baseUrl = validation.url;
    const health = await fetch(`${baseUrl}/api/health`, { cache: "no-store", signal: controller.signal });
    const ready = await fetch(`${baseUrl}/api/health/ready`, { cache: "no-store", signal: controller.signal });
    const readyContentType = ready.headers.get("content-type") || "";
    const body = readyContentType.includes("application/json") ? await ready.json() : { status: ready.ok ? "ready" : "error" };
    return normalizeGatewayHealth({
      ok: health.ok,
      status: ready.status,
      healthOk: health.ok,
      healthStatus: health.status,
      readyOk: ready.ok,
      readyStatus: ready.status,
      body,
      latencyMs: Date.now() - started,
    });
  } catch (error) {
    return normalizeGatewayHealth({ ok: false, latencyMs: Date.now() - started, error: sanitizeGatewayError(error) });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCommandCenterApi();
    if (!auth.ok) return auth.response;

    const parsed = gatewayListFiltersSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Filtros inválidos." }, { status: 400 });

    let query = auth.db
      .from("internal_messaging_gateways")
      .select("id, tenant_id, name, slug, provider, base_url, environment, status, version, max_sessions, last_health_check_at, last_error, metadata, created_at, updated_at")
      .eq("tenant_id", auth.context.tenantId)
      .order("name");
    if (parsed.data.status) query = query.eq("status", parsed.data.status);
    if (parsed.data.provider) query = query.eq("provider", parsed.data.provider);
    if (parsed.data.environment) query = query.eq("environment", parsed.data.environment);
    if (parsed.data.slug) query = query.eq("slug", parsed.data.slug);

    const { data, error } = await query;
    if (error) throw error;

    const counts = await countActiveSessions(auth.db, auth.context.tenantId);
    return NextResponse.json({
      ok: true,
      gateways: ((data || []) as InternalGatewayRow[]).map((gateway) => publicGatewaySummary(gateway, counts.get(gateway.id) || 0)),
    });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Falha ao carregar gateways." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCommandCenterApi();
    if (!auth.ok) return auth.response;

    const parsed = createInternalGatewaySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Dados do gateway inválidos." }, { status: 400 });

    const baseUrl = validateGatewayBaseUrl(parsed.data.baseUrl, parsed.data.environment);
    if (!baseUrl.ok) return NextResponse.json({ ok: false, error: baseUrl.error }, { status: 400 });

    const { data: existing, error: existingError } = await auth.db
      .from("internal_messaging_gateways")
      .select("id")
      .eq("tenant_id", auth.context.tenantId)
      .eq("slug", parsed.data.slug)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return NextResponse.json({ ok: false, error: "gateway_slug_conflict" }, { status: 409 });

    const { data, error } = await auth.db
      .from("internal_messaging_gateways")
      .insert({
        tenant_id: auth.context.tenantId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        provider: parsed.data.provider,
        base_url: baseUrl.url,
        environment: parsed.data.environment,
        status: parsed.data.status || "inactive",
        max_sessions: parsed.data.maxSessions,
        metadata: {},
      })
      .select("id")
      .single();
    if (error) {
      if (isUniqueConstraintError(error)) return NextResponse.json({ ok: false, error: "gateway_slug_conflict" }, { status: 409 });
      throw error;
    }

    await auditGatewayAction({ db: auth.db, userId: auth.context.appUserId, tenantId: auth.context.tenantId, gatewayId: data.id, action: "gateway_created", result: "success" });

    return NextResponse.json({ ok: true, gatewayId: data.id }, { status: 201 });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Falha ao cadastrar gateway." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireCommandCenterApi();
    if (!auth.ok) return auth.response;

    const parsed = updateInternalGatewaySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Dados de atualização inválidos." }, { status: 400 });

    const { data: gateway, error: loadError } = await auth.db
      .from("internal_messaging_gateways")
      .select("id, tenant_id, name, slug, provider, base_url, environment, status, version, max_sessions, last_health_check_at, last_error, metadata, created_at, updated_at")
      .eq("tenant_id", auth.context.tenantId)
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (loadError) throw loadError;
    if (!gateway) return NextResponse.json({ ok: false, error: "Gateway não encontrado." }, { status: 404 });

    if (parsed.data.action === "health_check") {
      const health = await runHealthCheck(gateway as InternalGatewayRow);
      const nextStatus = health.state === "ready" || health.state === "online" ? "active" : health.state === "offline" || health.state === "configuration" ? "error" : "maintenance";
      const { error } = await auth.db
        .from("internal_messaging_gateways")
        .update({
          status: nextStatus,
          version: health.version || gateway.version || null,
          last_health_check_at: new Date().toISOString(),
          last_error: health.error ? sanitizeGatewayError(health.error) : null,
        })
        .eq("tenant_id", auth.context.tenantId)
        .eq("id", parsed.data.id);
      if (error) throw error;
      await auditGatewayAction({ db: auth.db, userId: auth.context.appUserId, tenantId: auth.context.tenantId, gatewayId: parsed.data.id, action: health.error ? "gateway_health_check_failed" : "gateway_health_check", result: health.state });
      return NextResponse.json({ ok: true, health });
    }

    const update: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    const nextEnvironment = parsed.data.environment || gateway.environment;
    if (parsed.data.baseUrl !== undefined) {
      const baseUrl = validateGatewayBaseUrl(parsed.data.baseUrl, nextEnvironment);
      if (!baseUrl.ok) return NextResponse.json({ ok: false, error: baseUrl.error }, { status: 400 });
      update.base_url = baseUrl.url;
    }
    if (parsed.data.environment !== undefined) {
      const baseUrl = validateGatewayBaseUrl(String(update.base_url || gateway.base_url), parsed.data.environment);
      if (!baseUrl.ok) return NextResponse.json({ ok: false, error: baseUrl.error }, { status: 400 });
      update.base_url = baseUrl.url;
      update.environment = parsed.data.environment;
    }
    if (parsed.data.status !== undefined) update.status = parsed.data.status;
    if (parsed.data.maxSessions !== undefined) {
      const activeSessions = (await countActiveSessions(auth.db, auth.context.tenantId)).get(parsed.data.id) || 0;
      if (parsed.data.maxSessions < activeSessions) {
        return NextResponse.json({ ok: false, error: "max_sessions_below_active_sessions" }, { status: 409 });
      }
      update.max_sessions = parsed.data.maxSessions;
    }

    const { error } = await auth.db
      .from("internal_messaging_gateways")
      .update(update)
      .eq("tenant_id", auth.context.tenantId)
      .eq("id", parsed.data.id);
    if (error) throw error;

    const action = parsed.data.status === "active" ? "gateway_activated" : parsed.data.status === "inactive" ? "gateway_deactivated" : "gateway_updated";
    await auditGatewayAction({ db: auth.db, userId: auth.context.appUserId, tenantId: auth.context.tenantId, gatewayId: parsed.data.id, action, result: "success" });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Falha ao atualizar gateway." }, { status: 500 });
  }
}

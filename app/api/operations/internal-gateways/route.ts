import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { canAccessCommandCenter, getTenantFeatureMetadata } from "@/lib/features/feature-flags";
import {
  countGatewaySessions,
  createInternalGateway,
  findInternalGatewayById,
  listInternalGateways,
  recordGatewayHealth,
  updateInternalGateway,
} from "@/lib/operations/internal-gateways-repository";
import {
  createInternalGatewaySchema,
  gatewayListFiltersSchema,
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

    const data = await listInternalGateways(auth.db, auth.context.tenantId, parsed.data);
    const counts = await countGatewaySessions(auth.db, auth.context.tenantId);
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

    const created = await createInternalGateway(auth.db, {
      tenantId: auth.context.tenantId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      provider: parsed.data.provider,
      baseUrl: baseUrl.url,
      environment: parsed.data.environment,
      status: parsed.data.status || "inactive",
      maxSessions: parsed.data.maxSessions,
    });
    if (!created.ok) return NextResponse.json({ ok: false, error: "gateway_slug_conflict" }, { status: 409 });

    await auditGatewayAction({ db: auth.db, userId: auth.context.appUserId, tenantId: auth.context.tenantId, gatewayId: created.gatewayId, action: "gateway_created", result: "success" });

    return NextResponse.json({ ok: true, gatewayId: created.gatewayId }, { status: 201 });
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

    const gateway = await findInternalGatewayById(auth.db, auth.context.tenantId, parsed.data.id);
    if (!gateway) return NextResponse.json({ ok: false, error: "Gateway não encontrado." }, { status: 404 });

    if (parsed.data.action === "health_check") {
      const health = await runHealthCheck(gateway as InternalGatewayRow);
      const nextStatus = health.state === "ready" || health.state === "online" ? "active" : health.state === "offline" || health.state === "configuration" ? "error" : "maintenance";
      await recordGatewayHealth(auth.db, auth.context.tenantId, parsed.data.id, {
        status: nextStatus,
        version: health.version || gateway.version || null,
        lastHealthCheckAt: new Date().toISOString(),
        lastError: health.error ? sanitizeGatewayError(health.error) : null,
      });
      await auditGatewayAction({ db: auth.db, userId: auth.context.appUserId, tenantId: auth.context.tenantId, gatewayId: parsed.data.id, action: health.error ? "gateway_health_check_failed" : "gateway_health_check", result: health.state });
      return NextResponse.json({ ok: true, health });
    }

    const update: { name?: string; baseUrl?: string; environment?: string; status?: string; maxSessions?: number } = {};
    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    const nextEnvironment = parsed.data.environment || gateway.environment;
    if (parsed.data.baseUrl !== undefined) {
      const baseUrl = validateGatewayBaseUrl(parsed.data.baseUrl, nextEnvironment);
      if (!baseUrl.ok) return NextResponse.json({ ok: false, error: baseUrl.error }, { status: 400 });
      update.baseUrl = baseUrl.url;
    }
    if (parsed.data.environment !== undefined) {
      const baseUrl = validateGatewayBaseUrl(String(update.baseUrl || gateway.base_url), parsed.data.environment);
      if (!baseUrl.ok) return NextResponse.json({ ok: false, error: baseUrl.error }, { status: 400 });
      update.baseUrl = baseUrl.url;
      update.environment = parsed.data.environment;
    }
    if (parsed.data.status !== undefined) update.status = parsed.data.status;
    if (parsed.data.maxSessions !== undefined) {
      const activeSessions = (await countGatewaySessions(auth.db, auth.context.tenantId)).get(parsed.data.id) || 0;
      if (parsed.data.maxSessions < activeSessions) {
        return NextResponse.json({ ok: false, error: "max_sessions_below_active_sessions" }, { status: 409 });
      }
      update.maxSessions = parsed.data.maxSessions;
    }

    await updateInternalGateway(auth.db, auth.context.tenantId, parsed.data.id, update);

    const action = parsed.data.status === "active" ? "gateway_activated" : parsed.data.status === "inactive" ? "gateway_deactivated" : "gateway_updated";
    await auditGatewayAction({ db: auth.db, userId: auth.context.appUserId, tenantId: auth.context.tenantId, gatewayId: parsed.data.id, action, result: "success" });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Falha ao atualizar gateway." }, { status: 500 });
  }
}

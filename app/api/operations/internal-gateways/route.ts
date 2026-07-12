import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { canAccessCommandCenter, getTenantFeatureMetadata } from "@/lib/features/feature-flags";
import {
  createInternalGatewaySchema,
  normalizeGatewayHealth,
  publicGatewaySummary,
  updateInternalGatewaySchema,
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
    .neq("status", "disabled");

  const counts = new Map<string, number>();
  for (const row of data || []) {
    const gatewayId = String(row.gateway_id || "");
    if (gatewayId) counts.set(gatewayId, (counts.get(gatewayId) || 0) + 1);
  }
  return counts;
}

async function runHealthCheck(gateway: InternalGatewayRow) {
  const controller = new AbortController();
  const timeout = windowlessTimeout(() => controller.abort(), 4000);
  const started = Date.now();

  try {
    const baseUrl = gateway.base_url.replace(/\/$/, "");
    const first = await fetch(`${baseUrl}/api/health/ready`, { cache: "no-store", signal: controller.signal });
    let response = first;
    if (first.status === 404) response = await fetch(`${baseUrl}/api/health`, { cache: "no-store", signal: controller.signal });
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await response.json() : { status: response.ok ? "ok" : "error" };
    return normalizeGatewayHealth({ ok: response.ok, status: response.status, body, latencyMs: Date.now() - started });
  } catch (error) {
    return normalizeGatewayHealth({ ok: false, latencyMs: Date.now() - started, error: error instanceof Error ? error.message : "Falha no health check." });
  } finally {
    clearTimeout(timeout);
  }
}

function windowlessTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}

export async function GET() {
  try {
    const auth = await requireCommandCenterApi();
    if (!auth.ok) return auth.response;

    const { data, error } = await auth.db
      .from("internal_messaging_gateways")
      .select("id, tenant_id, name, slug, provider, base_url, environment, status, version, max_sessions, last_health_check_at, last_error, metadata, created_at, updated_at")
      .eq("tenant_id", auth.context.tenantId)
      .order("name");
    if (error) throw error;

    const counts = await countActiveSessions(auth.db, auth.context.tenantId);
    return NextResponse.json({
      ok: true,
      gateways: ((data || []) as InternalGatewayRow[]).map((gateway) => publicGatewaySummary(gateway, counts.get(gateway.id) || 0)),
    });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao carregar gateways." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCommandCenterApi();
    if (!auth.ok) return auth.response;

    const parsed = createInternalGatewaySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Dados do gateway inválidos." }, { status: 400 });

    const { data, error } = await auth.db
      .from("internal_messaging_gateways")
      .insert({
        tenant_id: auth.context.tenantId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        provider: parsed.data.provider,
        base_url: parsed.data.baseUrl,
        environment: parsed.data.environment,
        status: parsed.data.status,
        version: parsed.data.version || null,
        max_sessions: parsed.data.maxSessions,
        metadata: {},
      })
      .select("id")
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, gatewayId: data.id }, { status: 201 });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao cadastrar gateway." }, { status: 500 });
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
      const nextStatus = health.state === "ready" || health.state === "online" ? "active" : health.state === "offline" ? "error" : "maintenance";
      const { error } = await auth.db
        .from("internal_messaging_gateways")
        .update({
          status: nextStatus,
          version: health.version || gateway.version || null,
          last_health_check_at: new Date().toISOString(),
          last_error: health.error,
        })
        .eq("tenant_id", auth.context.tenantId)
        .eq("id", parsed.data.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, health });
    }

    const update: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    if (parsed.data.baseUrl !== undefined) update.base_url = parsed.data.baseUrl;
    if (parsed.data.environment !== undefined) update.environment = parsed.data.environment;
    if (parsed.data.status !== undefined) update.status = parsed.data.status;
    if (parsed.data.version !== undefined) update.version = parsed.data.version;
    if (parsed.data.maxSessions !== undefined) update.max_sessions = parsed.data.maxSessions;

    const { error } = await auth.db
      .from("internal_messaging_gateways")
      .update(update)
      .eq("tenant_id", auth.context.tenantId)
      .eq("id", parsed.data.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao atualizar gateway." }, { status: 500 });
  }
}

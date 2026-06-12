import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

function isAuthorized(request: NextRequest) {
  const expectedKey = process.env.WHATSAPP_GATEWAY_API_KEY || process.env.INTERNAL_API_KEY || "";
  const receivedKey =
    request.headers.get("x-whatsapp-gateway-key") ||
    request.headers.get("x-internal-api-key") ||
    "";

  return Boolean(expectedKey && receivedKey && receivedKey === expectedKey);
}

function normalizeEventName(value: string) {
  const event = value.trim().toLowerCase();

  if (["message", "message_create", "message.created", "message_received", "message.received"].includes(event)) {
    return "message.received";
  }

  if (["message_revoke", "message_revoke_everyone", "message.revoked", "message.deleted", "message_delete", "message.deleted_for_everyone"].includes(event)) {
    return "message_revoke";
  }

  return value.trim() || "unknown";
}

function resolveEventName(payload: Record<string, unknown>) {
  const rawEvent =
    payload.event ||
    payload.eventName ||
    payload.event_name ||
    payload.event_type ||
    payload.eventType ||
    payload.name ||
    payload.type ||
    "unknown";

  return normalizeEventName(String(rawEvent || "unknown"));
}

function resolveProvider(payload: Record<string, unknown>, fallbackProvider?: string | null) {
  const rawProvider = payload.provider || payload.source || fallbackProvider || "whatsapp_web";
  return String(rawProvider || "whatsapp_web").trim() || "whatsapp_web";
}

function resolveUuid(value: unknown) {
  if (!value || typeof value !== "string") {
    return null;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function normalizePayload(payload: Record<string, unknown>) {
  const eventPayload = payload.payload || payload.data || payload.message || payload;

  if (typeof eventPayload === "object" && eventPayload !== null && !Array.isArray(eventPayload)) {
    return {
      ...payload,
      payload: eventPayload,
    };
  }

  return payload;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolvePayloads(input: unknown) {
  if (Array.isArray(input)) {
    return input.filter(isObject);
  }

  if (isObject(input) && Array.isArray(input.events)) {
    return input.events.filter(isObject).map((eventPayload) => ({
      ...eventPayload,
      provider: eventPayload.provider || input.provider,
      organization_id: eventPayload.organization_id || input.organization_id,
      organizationId: eventPayload.organizationId || input.organizationId,
      tenant_id: eventPayload.tenant_id || input.tenant_id,
      tenantId: eventPayload.tenantId || input.tenantId,
      endpoint_key: eventPayload.endpoint_key || input.endpoint_key,
      endpointKey: eventPayload.endpointKey || input.endpointKey,
    }));
  }

  return isObject(input) ? [input] : [];
}

function resolveEndpointKey(request: NextRequest, input: unknown) {
  const url = new URL(request.url);
  const fromHeader =
    request.headers.get("x-webhook-endpoint-key") ||
    request.headers.get("x-shamar-endpoint-key") ||
    request.headers.get("x-endpoint-key");

  if (fromHeader) {
    return fromHeader.trim();
  }

  const fromQuery = url.searchParams.get("endpoint_key") || url.searchParams.get("endpointKey");

  if (fromQuery) {
    return fromQuery.trim();
  }

  if (isObject(input)) {
    const fromPayload = input.endpoint_key || input.endpointKey || input.webhook_endpoint_key || input.webhookEndpointKey;
    return typeof fromPayload === "string" ? fromPayload.trim() : "";
  }

  return "";
}

type WebhookContext = {
  provider: string | null;
  organizationId: string | null;
  tenantId: string | null;
};

async function resolveWebhookContext(db: ReturnType<typeof createSupabaseWriteClient>, endpointKey: string): Promise<WebhookContext> {
  if (!endpointKey) {
    return { provider: null, organizationId: null, tenantId: null };
  }

  const { data: endpoint } = await db
    .from("inbound_webhook_endpoints")
    .select("integration_id, provider, config, status, is_active")
    .eq("endpoint_key", endpointKey)
    .eq("is_active", true)
    .maybeSingle();

  if (!endpoint || endpoint.status !== "active") {
    return { provider: null, organizationId: null, tenantId: null };
  }

  let organizationId = null;
  let tenantId = null;
  const config = isObject(endpoint.config) ? endpoint.config : {};

  organizationId = resolveUuid(config.organization_id || config.organizationId);
  tenantId = resolveUuid(config.tenant_id || config.tenantId);

  if (endpoint.integration_id) {
    const { data: integration } = await db
      .from("integration_sources")
      .select("tenant_id, organization_id, status")
      .eq("id", endpoint.integration_id)
      .maybeSingle();

    if (integration && integration.status === "active") {
      organizationId = integration.organization_id || organizationId;
      tenantId = integration.tenant_id || tenantId;
    }
  }

  return {
    provider: endpoint.provider || null,
    organizationId,
    tenantId,
  };
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }

  let input: unknown = {};

  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Payload inválido." }, { status: 400 });
  }

  const payloads = resolvePayloads(input).slice(0, 100);

  if (payloads.length === 0) {
    return NextResponse.json({ ok: false, error: "Nenhum evento válido recebido." }, { status: 400 });
  }

  const db = createSupabaseWriteClient();
  const endpointKey = resolveEndpointKey(request, input);
  const webhookContext = await resolveWebhookContext(db, endpointKey);

  const rows = payloads.map((payload) => {
    const normalizedPayload = normalizePayload(payload);

    return {
      provider: resolveProvider(normalizedPayload, webhookContext.provider),
      event: resolveEventName(normalizedPayload),
      payload: normalizedPayload,
      organization_id: resolveUuid(normalizedPayload.organization_id || normalizedPayload.organizationId) || webhookContext.organizationId,
      tenant_id: resolveUuid(normalizedPayload.tenant_id || normalizedPayload.tenantId) || webhookContext.tenantId,
      processing_status: "pending",
    };
  });

  const { data: providerEvents, error: eventError } = await db
    .from("provider_events")
    .insert(rows)
    .select("id");

  if (eventError || !providerEvents) {
    return NextResponse.json(
      { ok: false, error: "Falha ao registrar evento do WhatsApp." },
      { status: 500 },
    );
  }

  const { data: processResult, error: processError } = await db.rpc("process_pending_whatsapp_provider_events", {
    max_events: Math.max(25, providerEvents.length),
  });

  if (processError) {
    return NextResponse.json(
      {
        ok: true,
        eventIds: providerEvents.map((event) => event.id),
        registered: true,
        registeredCount: providerEvents.length,
        processed: false,
        endpointKey: endpointKey || null,
      },
      { status: 202 },
    );
  }

  return NextResponse.json({
    ok: true,
    eventIds: providerEvents.map((event) => event.id),
    registered: true,
    registeredCount: providerEvents.length,
    processed: true,
    endpointKey: endpointKey || null,
    result: processResult,
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "whatsapp-events" });
}

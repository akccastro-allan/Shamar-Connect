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

function resolveProvider(payload: Record<string, unknown>) {
  const rawProvider = payload.provider || payload.source || "whatsapp_web";
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
    }));
  }

  return isObject(input) ? [input] : [];
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
  const rows = payloads.map((payload) => {
    const normalizedPayload = normalizePayload(payload);

    return {
      provider: resolveProvider(normalizedPayload),
      event: resolveEventName(normalizedPayload),
      payload: normalizedPayload,
      organization_id: resolveUuid(normalizedPayload.organization_id || normalizedPayload.organizationId),
      tenant_id: resolveUuid(normalizedPayload.tenant_id || normalizedPayload.tenantId),
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
    result: processResult,
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "whatsapp-events" });
}

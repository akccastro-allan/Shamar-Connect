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

function resolveEventName(payload: Record<string, unknown>) {
  const rawEvent =
    payload.event ||
    payload.eventName ||
    payload.event_type ||
    payload.eventType ||
    payload.name ||
    payload.type ||
    "unknown";

  return String(rawEvent || "unknown").trim() || "unknown";
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

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Payload inválido." }, { status: 400 });
  }

  const normalizedPayload = normalizePayload(payload);
  const db = createSupabaseWriteClient();
  const event = resolveEventName(normalizedPayload);
  const provider = resolveProvider(normalizedPayload);
  const organizationId = resolveUuid(normalizedPayload.organization_id || normalizedPayload.organizationId);
  const tenantId = resolveUuid(normalizedPayload.tenant_id || normalizedPayload.tenantId);

  const { data: providerEvent, error: eventError } = await db
    .from("provider_events")
    .insert({
      provider,
      event,
      payload: normalizedPayload,
      organization_id: organizationId,
      tenant_id: tenantId,
      processing_status: "pending",
    })
    .select("id")
    .single();

  if (eventError || !providerEvent) {
    return NextResponse.json(
      { ok: false, error: "Falha ao registrar evento do WhatsApp." },
      { status: 500 },
    );
  }

  const { data: processResult, error: processError } = await db.rpc("process_pending_whatsapp_provider_events", {
    max_events: 25,
  });

  if (processError) {
    return NextResponse.json(
      {
        ok: true,
        eventId: providerEvent.id,
        registered: true,
        processed: false,
      },
      { status: 202 },
    );
  }

  return NextResponse.json({
    ok: true,
    eventId: providerEvent.id,
    registered: true,
    processed: true,
    result: processResult,
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "whatsapp-events" });
}

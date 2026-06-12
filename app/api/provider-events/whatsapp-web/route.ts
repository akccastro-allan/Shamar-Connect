import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PROCESSABLE_EVENTS = new Set([
  "message.received",
  "message_revoke",
  "message.revoked",
  "message.deleted",
]);

type JsonObject = Record<string, unknown>;

type ProcessorSummary = {
  processedEvents: number | null;
  errorEvents: number | null;
};

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(source: JsonObject, keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readUuid(source: JsonObject, keys: string[]) {
  const value = readString(source, keys);

  if (!value) {
    return null;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function readNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeProcessorSummary(data: unknown): ProcessorSummary {
  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    return {
      processedEvents: typeof row === "number" ? row : null,
      errorEvents: null,
    };
  }

  const result = row as Record<string, unknown>;

  return {
    processedEvents: readNumber(result, ["processed_count", "processed_events", "events_processed", "processed"]),
    errorEvents: readNumber(result, ["error_count", "error_events", "events_with_error", "failed_events", "errors"]),
  };
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.SHAMARCONNECT_WEBHOOK_TOKEN || "";
  const token = getBearerToken(request);

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!isJsonObject(body)) {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const payload = isJsonObject(body.payload) ? body.payload : {};
    const event = readString(body, ["event", "type"]) || "unknown";
    const provider = readString(body, ["provider"]) || readString(payload, ["provider"]) || "whatsapp_web";
    const organizationId = readUuid(body, ["organization_id", "organizationId"]) || readUuid(payload, ["organization_id", "organizationId"]);
    const tenantId = readUuid(body, ["tenant_id", "tenantId"]) || readUuid(payload, ["tenant_id", "tenantId"]);
    const shouldProcess = PROCESSABLE_EVENTS.has(event);
    const client = createSupabaseWriteClient();

    const { data: savedEvent, error: eventError } = await client
      .from("provider_events")
      .insert({
        provider,
        event,
        payload: body,
        organization_id: organizationId,
        tenant_id: tenantId,
        processing_status: shouldProcess ? "pending" : "processed",
        processed_at: shouldProcess ? null : new Date().toISOString(),
        processed_payload: shouldProcess ? {} : { action: "stored_only" },
      })
      .select("id")
      .single();

    if (eventError) {
      throw eventError;
    }

    if (!shouldProcess) {
      return NextResponse.json({
        ok: true,
        event,
        eventId: savedEvent.id,
        processed: false,
        reason: "stored_only",
      });
    }

    const { data, error } = await client.rpc("process_pending_whatsapp_provider_events", {
      max_events: 100,
    });

    if (error) {
      console.error("WhatsApp provider event processor failed after webhook insert", {
        code: error.code,
        message: error.message,
      });

      await client
        .from("provider_events")
        .update({
          processing_status: "error",
          processing_error: "Processor call failed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", savedEvent.id);

      return NextResponse.json(
        { ok: false, event, eventId: savedEvent.id, error: "Event processor failed." },
        { status: 500 },
      );
    }

    const summary = normalizeProcessorSummary(data);

    return NextResponse.json({
      ok: true,
      event,
      eventId: savedEvent.id,
      processed: true,
      processedEvents: summary.processedEvents,
      errorEvents: summary.errorEvents,
    });
  } catch (error) {
    console.error("WhatsApp provider webhook failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { ok: false, error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

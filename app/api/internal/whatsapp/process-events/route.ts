import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProcessorSummary = {
  processedEvents: number | null;
  errorEvents: number | null;
};

function hashToken(value: string) {
  return createHash("sha256").update(value).digest();
}

function hasValidInternalApiKey(request: NextRequest) {
  const expectedToken = process.env.INTERNAL_API_KEY || "";
  const receivedToken = request.headers.get("x-internal-api-key")?.trim() || "";

  if (!expectedToken || !receivedToken) {
    return false;
  }

  return timingSafeEqual(hashToken(expectedToken), hashToken(receivedToken));
}

function clampMaxEvents(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 100;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 500);
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

  if (typeof row === "number") {
    return {
      processedEvents: row,
      errorEvents: null,
    };
  }

  if (!row || typeof row !== "object") {
    return {
      processedEvents: null,
      errorEvents: null,
    };
  }

  const result = row as Record<string, unknown>;

  return {
    processedEvents: readNumber(result, [
      "processed_events",
      "events_processed",
      "processed_count",
      "processed",
      "success_count",
    ]),
    errorEvents: readNumber(result, [
      "error_events",
      "events_with_error",
      "failed_events",
      "failed_count",
      "errors",
      "error_count",
    ]),
  };
}

export async function POST(request: NextRequest) {
  const executedAt = new Date().toISOString();

  if (!process.env.INTERNAL_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Internal API key is not configured.", executedAt },
      { status: 500 },
    );
  }

  if (!hasValidInternalApiKey(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized", executedAt }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const maxEvents = clampMaxEvents(
    typeof body === "object" && body
      ? (body as Record<string, unknown>).max_events ??
          (body as Record<string, unknown>).maxEvents ??
          (body as Record<string, unknown>).limit
      : undefined,
  );

  try {
    const supabase = createSupabaseWriteClient();
    const { data, error } = await supabase.rpc("process_pending_whatsapp_provider_events", {
      max_events: maxEvents,
    });

    if (error) {
      console.error("WhatsApp provider event processor failed", {
        code: error.code,
        message: error.message,
      });

      return NextResponse.json(
        { ok: false, error: "Event processor failed.", executedAt },
        { status: 500 },
      );
    }

    const summary = normalizeProcessorSummary(data);

    return NextResponse.json({
      ok: true,
      processedEvents: summary.processedEvents,
      errorEvents: summary.errorEvents,
      maxEvents,
      executedAt,
    });
  } catch (error) {
    console.error("Unexpected WhatsApp provider event processor error", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { ok: false, error: "Event processor failed.", executedAt },
      { status: 500 },
    );
  }
}

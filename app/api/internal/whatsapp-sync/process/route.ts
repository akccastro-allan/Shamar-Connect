import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { processQueuedWhatsappSyncRuns } from "@/lib/whatsapp-sync/service";
import { createDefaultOpenWaSyncProvider } from "@/lib/whatsapp-sync/providers/openwa-sync-provider-default";
import { hasValidInternalApiKey } from "@/lib/whatsapp-sync/internal-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clampMaxRuns(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(Math.trunc(parsed), 1), 5);
}

export async function POST(request: NextRequest) {
  const executedAt = new Date().toISOString();

  if (!process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ ok: false, error: "Internal API key is not configured.", executedAt }, { status: 500 });
  }

  if (!hasValidInternalApiKey(process.env.INTERNAL_API_KEY, request.headers.get("x-internal-api-key"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized", executedAt }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const maxRuns = clampMaxRuns(typeof body === "object" && body ? (body as Record<string, unknown>).maxRuns ?? (body as Record<string, unknown>).limit : undefined);

  try {
    const db = createSupabaseWriteClient();
    const result = await processQueuedWhatsappSyncRuns(db, maxRuns, createDefaultOpenWaSyncProvider);
    return NextResponse.json({ ok: true, maxRuns, executedAt, ...result });
  } catch (error) {
    console.error("WhatsApp sync processor failed", { message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ ok: false, error: "WhatsApp sync processor failed.", executedAt }, { status: 500 });
  }
}

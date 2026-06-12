import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function getRequestedLimit(value: unknown) {
  const parsed = Number(value || DEFAULT_LIMIT);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function isAuthorized(request: NextRequest) {
  const expectedToken = process.env.INTERNAL_API_KEY || "";

  if (!expectedToken) {
    return false;
  }

  const receivedToken = request.headers.get("x-internal-api-key") || "";

  return receivedToken === expectedToken;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }

  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const limit = getRequestedLimit((body as { limit?: unknown })?.limit);
  const db = createSupabaseWriteClient();

  const { data, error } = await db.rpc("process_pending_whatsapp_provider_events", {
    max_events: limit,
  });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Falha ao processar eventos do WhatsApp.",
        details: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    processedAt: new Date().toISOString(),
    limit,
    result: data,
  });
}

/**
 * Worker da fila de envio (message_outbox).
 *
 * Protegido EXCLUSIVAMENTE por CRON_SECRET / INTERNAL_API_KEY (header), nunca
 * por sessão de usuário. Não loga tokens nem payload sensível.
 *
 * Acionado pelo Vercel Cron (1/min) — ver vercel.json. Reprocessa itens
 * queued/failed com retry e backoff.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { processOutbox } from "@/lib/outbox/send";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || process.env.INTERNAL_API_KEY || "";
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const xKey = request.headers.get("x-internal-key") || "";
  return bearer === secret || xKey === secret;
}

async function run(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }
  try {
    const db = createSupabaseWriteClient();
    const result = await processOutbox(db, 50);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    // Mensagem genérica — não vaza detalhe sensível.
    console.error("[cron/outbox] erro ao processar fila");
    return NextResponse.json({ ok: false, error: "Falha ao processar fila de envio." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}

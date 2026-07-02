/**
 * POST /api/agents/lips/test-simple
 * Teste do agente simples da Lips
 *
 * Body: { "message": "Qual o valor do freio?" }
 * Response: { "ok": true, "response": "...", "type": "faq|piece|not_found" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { processLipsMessage } from "@/lib/agents/lips-simple-processor";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { ok: false, error: 'Campo "message" é obrigatório' },
        { status: 400 }
      );
    }

    const db = createSupabaseWriteClient();

    // Usar organização da Lips (fixture)
    const lipsOrgId = process.env.LIPS_ORGANIZATION_ID || "8f074193-bf58-4537-9842-720619a9f259";

    // Processar mensagem
    const result = await processLipsMessage(
      db,
      lipsOrgId,
      message,
      "555121234567", // fake sender
      "fake-conversation-id" // fake conv
    );

    return NextResponse.json({
      ok: true,
      message,
      response: result.response,
      willAutoRespond: result.shouldSend,
      requiresHandoff: result.requiresHandoff,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[lips-test-simple]", msg);

    return NextResponse.json(
      {
        ok: false,
        error: msg,
      },
      { status: 500 }
    );
  }
}

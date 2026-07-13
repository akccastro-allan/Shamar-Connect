import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { analyzeAndMaybePersistCommercialConversation } from "@/lib/ai/commercial-agent/repository";
import { assertCommercialAgentApi, readConversationId } from "../_guard";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const access = await assertCommercialAgentApi(context);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const conversationId = readConversationId(body);
    if (!conversationId) return NextResponse.json({ ok: false, error: "conversationId é obrigatório." }, { status: 400 });

    const result = await analyzeAndMaybePersistCommercialConversation(access.db, context, conversationId);
    return NextResponse.json({
      ok: true,
      analysis: result.analysis,
      analysisId: result.analysisId,
      persisted: result.persisted,
      send: false,
    });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao analisar conversa." },
      { status: 500 },
    );
  }
}

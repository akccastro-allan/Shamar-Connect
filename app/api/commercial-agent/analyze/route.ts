import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { analyzeAndMaybePersistCommercialConversation } from "@/lib/ai/commercial-agent/repository";
import { createOpenAICommercialAgentProvider } from "@/lib/ai/commercial-agent/providers/openai-commercial-agent-provider";
import { assertCommercialAgentApi, readConversationId, resolveLipsConversationContext } from "../_guard";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const access = await assertCommercialAgentApi(context);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const conversationId = readConversationId(body);
    if (!conversationId) return NextResponse.json({ ok: false, error: "conversationId é obrigatório." }, { status: 400 });

    const targetContext = await resolveLipsConversationContext(access.db, context, conversationId);
    const provider = createOpenAICommercialAgentProvider({ tenantId: targetContext.tenantId, userId: context.appUserId });
    const result = await analyzeAndMaybePersistCommercialConversation(access.db, targetContext, conversationId, {
      provider,
      model: process.env.OPENAI_COMMERCIAL_AGENT_MODEL,
    });
    return NextResponse.json({
      ok: true,
      analysis: result.analysis,
      analysisId: result.analysisId,
      persisted: result.persisted,
      send: false,
    });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    if (isFailClosedError(error)) {
      return NextResponse.json({ ok: false, error: "A análise comercial não está disponível no momento. O atendimento pode continuar normalmente." }, { status: 503 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao analisar conversa." },
      { status: 500 },
    );
  }
}

function isFailClosedError(error: unknown) {
  return error instanceof Error && [
    "feature_unavailable",
    "timeout",
    "rate_limited",
    "provider_error",
    "invalid_structured_output",
    "guardrail_rejected",
  ].includes(error.message);
}

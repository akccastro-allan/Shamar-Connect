import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { readLatestCommercialAnalysis } from "@/lib/ai/commercial-agent/repository";
import { assertCommercialAgentApi, resolveLipsConversationContext } from "../../../_guard";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const context = await getRequiredAppContext();
    const access = await assertCommercialAgentApi(context);
    if (!access.ok) return access.response;

    const { id } = await params;
    const targetContext = await resolveLipsConversationContext(access.db, context, id);
    const analysis = await readLatestCommercialAnalysis(access.db, targetContext, id);
    return NextResponse.json({ ok: true, analysis });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao carregar análise." },
      { status: 500 },
    );
  }
}

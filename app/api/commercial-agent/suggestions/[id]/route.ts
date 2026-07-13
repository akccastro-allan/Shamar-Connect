import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { updateCommercialSuggestionStatus } from "@/lib/ai/commercial-agent/repository";
import { assertCommercialAgentApi } from "../../_guard";

type Params = { params: Promise<{ id: string }> };
const ALLOWED_STATUS = new Set(["approved", "edited", "rejected", "expired"]);

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const context = await getRequiredAppContext();
    const access = await assertCommercialAgentApi(context);
    if (!access.ok) return access.response;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const status = String(body?.status || "").trim();
    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ ok: false, error: "Status inválido." }, { status: 400 });
    }

    const result = await updateCommercialSuggestionStatus(access.db, context, id, status as never, {
      editedText: body?.editedText ? String(body.editedText) : undefined,
      rejectionReason: body?.rejectionReason ? String(body.rejectionReason) : undefined,
    });

    return NextResponse.json({ ok: true, suggestion: result, send: false });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao atualizar sugestão." },
      { status: 500 },
    );
  }
}

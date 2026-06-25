import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { runTranscription } from "@/lib/media/transcribe";

type Params = { params: Promise<{ messageId: string }> };

/**
 * POST /api/whatsapp-messages/messages/[messageId]/transcribe
 *
 * Dispara transcrição sob demanda. Só roda quando o atendente clica
 * "Ver transcrição" ou "Reprocessar". Nunca automático. Nunca alimenta
 * resposta automática.
 */
export async function POST(_request: NextRequest, context: Params) {
  try {
    const { messageId } = await context.params;
    const appContext = await getRequiredAppContext();
    const db = createSupabaseWriteClient();

    // Valida que a mensagem pertence ao tenant/org do usuário
    const { data: msg, error: msgError } = await db
      .from("whatsapp_messages")
      .select("id, has_media, media_kind")
      .eq("id", messageId)
      .eq("tenant_id", appContext.tenantId)
      .eq("organization_id", appContext.organizationId)
      .maybeSingle();

    if (msgError) throw msgError;
    if (!msg) {
      return NextResponse.json({ ok: false, error: "Mensagem não encontrada." }, { status: 404 });
    }

    const result = await runTranscription(db, messageId, appContext.appUserId);

    if (result.status === "skipped") {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      status: result.status,
      text: result.text || null,
      error: result.error || null,
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: "Não foi possível iniciar a transcrição agora." },
      { status: 500 },
    );
  }
}

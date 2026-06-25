import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { ensureMediaDownloaded } from "@/lib/media/download";

type Params = { params: Promise<{ mediaId: string }> };

/**
 * GET /api/whatsapp-messages/media/[mediaId]
 *
 * [mediaId] aqui é o whatsapp_messages.id (não message_media.id) — a UI só
 * tem o id da mensagem. A rota busca o message_media pelo message_id.
 *
 * Retorna signed URL temporária (~5 min) para a mídia.
 * Autenticado: valida tenant/org/acesso à conversa.
 * Nunca expõe storage_path.
 */
export async function GET(_request: NextRequest, context: Params) {
  try {
    const { mediaId: messageId } = await context.params;
    const appContext = await getRequiredAppContext();
    const db = createSupabaseWriteClient();

    // 1) Valida que a mensagem pertence ao tenant/org do usuário
    const { data: msg, error: msgError } = await db
      .from("whatsapp_messages")
      .select("id, tenant_id, organization_id, conversation_id")
      .eq("id", messageId)
      .eq("tenant_id", appContext.tenantId)
      .eq("organization_id", appContext.organizationId)
      .maybeSingle();

    if (msgError) throw msgError;
    if (!msg) {
      return NextResponse.json({ ok: false, error: "Mensagem não encontrada." }, { status: 404 });
    }

    // 2) Busca o message_media da mensagem
    const { data: media, error: mediaError } = await db
      .from("message_media")
      .select("id, storage_path, storage_bucket, download_status")
      .eq("message_id", messageId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (mediaError) throw mediaError;
    if (!media) {
      return NextResponse.json(
        { ok: false, error: "Registro de mídia não encontrado para esta mensagem." },
        { status: 404 },
      );
    }

    // 3) Garante download (lazy; usa base64 do raw_payload quando disponível)
    const dlResult = await ensureMediaDownloaded(db, media.id, messageId);
    if (!dlResult.success) {
      return NextResponse.json(
        { ok: false, error: dlResult.error || "Não foi possível baixar a mídia agora." },
        { status: 500 },
      );
    }

    // 4) Gera signed URL (~5 min)
    const { data: signedUrl, error: signError } = await db.storage
      .from("shamar-message-media")
      .createSignedUrl(dlResult.storagePath || "", 300);

    if (signError || !signedUrl) {
      return NextResponse.json(
        { ok: false, error: "Falha ao gerar URL de acesso à mídia." },
        { status: 500 },
      );
    }

    // 5) Retorna signed URL (nunca storage_path)
    return NextResponse.json({
      ok: true,
      url: signedUrl.signedUrl,
      expiresIn: 300,
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: "Não foi possível carregar a mídia agora. Tente novamente." },
      { status: 500 },
    );
  }
}

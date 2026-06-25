import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { ensureMediaDownloaded } from "@/lib/media/download";

type Params = { params: Promise<{ mediaId: string }> };

/**
 * GET /api/whatsapp-messages/media/[mediaId]
 *
 * Retorna signed URL temporária (~5 min) para a mídia.
 * Autenticado: valida tenant/org/acesso à conversa.
 * Nunca expõe storage_path.
 */
export async function GET(_request: NextRequest, context: Params) {
  try {
    const { mediaId } = await context.params;
    const appContext = await getRequiredAppContext();
    const db = createSupabaseWriteClient();

    // 1) Busca mídia + valida acesso (join até a conversa)
    const { data: media, error: mediaError } = await db
      .from("message_media")
      .select(
        `
        id,
        message_id,
        storage_path,
        storage_bucket,
        download_status,
        whatsapp_messages (
          id,
          conversation_id,
          tenant_id,
          organization_id,
          whatsapp_conversations (
            id,
            tenant_id,
            organization_id,
            channel_id
          )
        )
      `,
      )
      .eq("id", mediaId)
      .maybeSingle();

    if (mediaError) throw mediaError;
    if (!media) {
      return NextResponse.json({ ok: false, error: "Mídia não encontrada." }, { status: 404 });
    }

    // 2) Valida escopo: mídia pertence a tenant/org do usuário
    const msg = Array.isArray(media.whatsapp_messages)
      ? media.whatsapp_messages[0]
      : media.whatsapp_messages;

    if (!msg || msg.tenant_id !== appContext.tenantId || msg.organization_id !== appContext.organizationId) {
      return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
    }

    // 3) Garante download (lazy)
    const dlResult = await ensureMediaDownloaded(db, mediaId);
    if (!dlResult.success) {
      return NextResponse.json(
        { ok: false, error: dlResult.error || "Falha ao baixar mídia." },
        { status: 500 },
      );
    }

    // 4) Gera signed URL (~5 min)
    const { data: signedUrl, error: signError } = await db.storage
      .from("shamar-message-media")
      .createSignedUrl(dlResult.storagePath || "", 300); // 5 min

    if (signError || !signedUrl) {
      return NextResponse.json(
        { ok: false, error: "Falha ao gerar URL assinada." },
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
      { ok: false, error: error instanceof Error ? error.message : "Erro ao gerar URL de mídia." },
      { status: 500 },
    );
  }
}

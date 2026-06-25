import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Baixa mídia e armazena no bucket privado.
 * Idempotente: se já está stored, retorna; se pending/failed, tenta.
 *
 * Ordem de tentativa:
 * 1. raw_payload da mensagem já tem message.base64 → usa direto (sem chamada extra)
 * 2. Chama endpoint Evolution getBase64FromMediaMessage
 */
export async function ensureMediaDownloaded(
  db: SupabaseClient,
  mediaId: string,
  messageId?: string,
): Promise<{ success: boolean; storagePath?: string; error?: string }> {
  // 1) Busca registro de mídia
  const { data: media, error: mediaError } = await db
    .from("message_media")
    .select("id, message_id, provider, download_status, storage_path, metadata, mime_type")
    .eq("id", mediaId)
    .maybeSingle();

  if (mediaError || !media) {
    return { success: false, error: "Registro de mídia não encontrado." };
  }

  // 2) Já armazenado
  if (media.download_status === "stored" && media.storage_path) {
    return { success: true, storagePath: media.storage_path };
  }

  // 3) Marca como "downloading" para evitar corrida paralela
  await db
    .from("message_media")
    .update({ download_status: "downloading" })
    .eq("id", mediaId)
    .eq("download_status", "pending"); // só atualiza se ainda pending (idempotência)

  try {
    const msgId = messageId || media.message_id;
    const base64Data = await resolveBase64(db, media, msgId);

    // 4) Upload no bucket
    const ext = mimeToExt(media.mime_type);
    const storagePath = `msg/${msgId}/${mediaId}.${ext}`;

    const { error: uploadError } = await db.storage
      .from("shamar-message-media")
      .upload(storagePath, Buffer.from(base64Data, "base64"), {
        contentType: media.mime_type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      await markFailed(db, mediaId, msgId, `Upload falhou: ${uploadError.message}`);
      return { success: false, error: "Não foi possível armazenar a mídia agora." };
    }

    // 5) Marca como stored
    await db
      .from("message_media")
      .update({ storage_bucket: "shamar-message-media", storage_path: storagePath, download_status: "stored" })
      .eq("id", mediaId);
    await db
      .from("whatsapp_messages")
      .update({ media_status: "stored" })
      .eq("id", msgId);

    return { success: true, storagePath };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markFailed(db, mediaId, media.message_id, msg);
    return { success: false, error: "Não foi possível carregar a mídia agora." };
  }
}

/** Resolve base64 da mídia: raw_payload primeiro, Evolution API como fallback. */
async function resolveBase64(
  db: SupabaseClient,
  media: { message_id: string; metadata: unknown },
  messageId: string,
): Promise<string> {
  // Shortcut: base64 já vem no raw_payload da mensagem (Evolution envia embutido)
  const { data: msgRow } = await db
    .from("whatsapp_messages")
    .select("raw_payload")
    .eq("id", messageId)
    .maybeSingle();

  const raw = msgRow?.raw_payload as Record<string, unknown> | null;
  const rawMsg = raw && typeof raw["message"] === "object" ? (raw["message"] as Record<string, unknown>) : null;
  const embeddedBase64 =
    rawMsg && typeof rawMsg["base64"] === "string" && rawMsg["base64"] ? (rawMsg["base64"] as string) : null;

  if (embeddedBase64) {
    return embeddedBase64;
  }

  // Fallback: busca via Evolution API
  const meta = (media.metadata as Record<string, unknown>) || {};
  const instance = typeof meta["instance"] === "string" ? meta["instance"] : null;
  const key = meta["key"] ?? null;

  if (!instance || !key) {
    throw new Error("Metadados insuficientes para baixar mídia (instance/key ausentes).");
  }

  return fetchBase64FromEvolution(instance, key);
}

/** Chama Evolution getBase64FromMediaMessage. Nunca loga o retorno. */
async function fetchBase64FromEvolution(instance: string, key: unknown): Promise<string> {
  const evolutionUrl = (process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY || "";

  if (!evolutionUrl || !apiKey) {
    throw new Error("Evolution não configurada (EVOLUTION_API_URL / EVOLUTION_API_KEY ausentes).");
  }

  const response = await fetch(
    `${evolutionUrl}/chat/getBase64FromMediaMessage/${encodeURIComponent(instance)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json", apikey: apiKey },
      body: JSON.stringify({ messageKey: key }),
    },
  );

  if (!response.ok) {
    throw new Error(`Evolution API ${response.status}: não foi possível baixar a mídia.`);
  }

  const result = (await response.json()) as Record<string, unknown>;
  const base64 = typeof result["base64"] === "string" ? result["base64"] : null;
  if (!base64) throw new Error("Evolution não retornou base64.");

  return base64;
}

async function markFailed(db: SupabaseClient, mediaId: string, messageId: string, reason: string) {
  await db
    .from("message_media")
    .update({ download_status: "failed", download_error: reason })
    .eq("id", mediaId);
  await db
    .from("whatsapp_messages")
    .update({ media_status: "download_failed" })
    .eq("id", messageId);
}

function mimeToExt(mime?: string | null): string {
  if (!mime) return "bin";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("m4a") || mime.includes("mp4")) return "m4a";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("pdf")) return "pdf";
  return "bin";
}

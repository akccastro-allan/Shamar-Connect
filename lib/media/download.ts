import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Baixa mídia da Evolution e armazena no bucket privado Supabase.
 * Idempotente: se já está stored, retorna; se falhou, reprocessa.
 */
export async function ensureMediaDownloaded(
  db: SupabaseClient,
  mediaId: string,
): Promise<{ success: boolean; storagePath?: string; error?: string }> {
  // 1) Busca registro de mídia
  const { data: media, error: mediaError } = await db
    .from("message_media")
    .select("id, message_id, provider, download_status, metadata, mime_type, provider_media_id")
    .eq("id", mediaId)
    .maybeSingle();

  if (mediaError || !media) {
    return { success: false, error: "Mídia não encontrada." };
  }

  // 2) Se já está armazenado, ok
  if (media.download_status === "stored") {
    const { data: stored } = await db
      .from("message_media")
      .select("storage_path")
      .eq("id", mediaId)
      .maybeSingle();
    return { success: true, storagePath: stored?.storage_path || undefined };
  }

  // 3) Se falhou antes, marca como skipped (não reprocessa automaticamente no MVP)
  if (media.download_status === "failed") {
    return { success: false, error: "Download prévio falhou; tente novamente ou contacte suporte." };
  }

  // 4) Baixa de Evolution (simulado aqui; implementar com cliente real)
  const meta = media.metadata as Record<string, unknown>;
  const instance = meta.instance as string | undefined;
  const key = meta.key as string | undefined;

  if (!instance || !key) {
    await db
      .from("message_media")
      .update({ download_status: "failed", download_error: "Metadados incompletos (instance/key)." })
      .eq("id", mediaId);
    return { success: false, error: "Metadados incompletos." };
  }

  try {
    // Baixar via Evolution getBase64FromMediaMessage (substitua com chamada real)
    const base64Data = await getBase64FromEvolution(instance, key);

    // 5) Upload no bucket
    const ext = mimeToExt(media.mime_type);
    const storagePath = `org/${media.id}/msg/${media.message_id}.${ext}`;

    const { error: uploadError } = await db.storage
      .from("shamar-message-media")
      .upload(storagePath, Buffer.from(base64Data, "base64"), {
        contentType: media.mime_type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      await db
        .from("message_media")
        .update({
          download_status: "failed",
          download_error: `Upload error: ${uploadError.message}`,
        })
        .eq("id", mediaId);
      return { success: false, error: uploadError.message };
    }

    // 6) Grava storage_path e marca como stored
    await db
      .from("message_media")
      .update({
        storage_bucket: "shamar-message-media",
        storage_path: storagePath,
        download_status: "stored",
      })
      .eq("id", mediaId);

    // 7) Espelha em whatsapp_messages
    await db
      .from("whatsapp_messages")
      .update({ media_status: "stored" })
      .eq("id", media.message_id);

    return { success: true, storagePath };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await db
      .from("message_media")
      .update({
        download_status: "failed",
        download_error: errMsg,
      })
      .eq("id", mediaId);
    return { success: false, error: errMsg };
  }
}

/**
 * Dummy: substitua com chamada real ao endpoint Evolution.
 * POST /chat/getBase64FromMediaMessage/{instance}
 */
async function getBase64FromEvolution(instance: string, key: string): Promise<string> {
  const evolutionUrl = process.env.EVOLUTION_API_URL || "http://localhost:8080";
  const token = process.env.EVOLUTION_API_TOKEN || "";

  const response = await fetch(
    `${evolutionUrl}/chat/getBase64FromMediaMessage/${instance}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messageKey: key }),
    },
  );

  if (!response.ok) {
    throw new Error(`Evolution API error: ${response.status}`);
  }

  const result = (await response.json()) as Record<string, unknown>;
  const base64 = result.base64 as string | undefined;
  if (!base64) throw new Error("Evolution retornou base64 vazio.");

  return base64;
}

function mimeToExt(mime?: string | null): string {
  if (!mime) return "bin";
  if (mime.startsWith("audio/")) {
    if (mime.includes("ogg")) return "ogg";
    if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
    if (mime.includes("wav")) return "wav";
    if (mime.includes("webm")) return "webm";
    return "m4a";
  }
  if (mime.startsWith("image/")) {
    if (mime.includes("webp")) return "webp";
    if (mime.includes("png")) return "png";
    if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
    return "jpg";
  }
  if (mime.includes("pdf")) return "pdf";
  return "bin";
}

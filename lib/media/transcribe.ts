import { SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { ensureMediaDownloaded } from "./download";

/**
 * Transcreve um áudio sob demanda.
 * Nunca roda automaticamente — só quando o atendente clica "Ver transcrição".
 * Nunca alimenta resposta automática.
 *
 * Idempotente: se já existe transcrição (done/processing), retorna; se failed,
 * reprocessa (o clique em "Reprocessar" chama a mesma função).
 */
export async function runTranscription(
  db: SupabaseClient,
  messageId: string,
  requestedBy?: string,
): Promise<{ success: boolean; text?: string; status: string; error?: string }> {
  // 1) Verifica mensagem e busca message_media
  const { data: msg } = await db
    .from("whatsapp_messages")
    .select("id, has_media, media_kind, transcription_status, transcription_text")
    .eq("id", messageId)
    .maybeSingle();

  if (!msg?.has_media) {
    return { success: false, status: "skipped", error: "Mensagem não tem mídia." };
  }

  if (msg.media_kind !== "audio" && msg.media_kind !== "ptt") {
    return { success: false, status: "skipped", error: "Transcrição disponível apenas para áudios." };
  }

  // Se já está done, retorna sem reprocessar
  if (msg.transcription_status === "done" && msg.transcription_text) {
    return { success: true, status: "done", text: msg.transcription_text };
  }

  const { data: media } = await db
    .from("message_media")
    .select("id, download_status, storage_path, storage_bucket, mime_type")
    .eq("message_id", messageId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!media) {
    return { success: false, status: "failed", error: "Registro de mídia não encontrado." };
  }

  // 2) Garante download antes de transcrever
  const dlResult = await ensureMediaDownloaded(db, media.id, messageId);
  if (!dlResult.success || !dlResult.storagePath) {
    return { success: false, status: "failed", error: "Não foi possível baixar o áudio para transcrição." };
  }

  // 3) Cria/atualiza registro em message_transcriptions
  const provider = "openai";
  const { data: existing } = await db
    .from("message_transcriptions")
    .select("id, status")
    .eq("media_id", media.id)
    .eq("provider", provider)
    .maybeSingle();

  if (existing?.status === "processing") {
    return { success: true, status: "processing" };
  }

  const transcriptionFields = {
    tenant_id: null as string | null,
    organization_id: null as string | null,
    channel_id: null as string | null,
    message_id: messageId,
    media_id: media.id,
    provider,
    model: process.env.OPENAI_TRANSCRIPTION_MODEL || null,
    status: "processing",
    requested_by: requestedBy || null,
    started_at: new Date().toISOString(),
  };

  // Busca tenant/org/channel da mensagem para escopar a transcrição
  const { data: msgFull } = await db
    .from("whatsapp_messages")
    .select("tenant_id, organization_id, channel_id")
    .eq("id", messageId)
    .maybeSingle();

  if (msgFull) {
    transcriptionFields.tenant_id = msgFull.tenant_id;
    transcriptionFields.organization_id = msgFull.organization_id;
    transcriptionFields.channel_id = msgFull.channel_id;
  }

  let transcriptionId: string;
  if (existing) {
    await db
      .from("message_transcriptions")
      .update({ ...transcriptionFields })
      .eq("id", existing.id);
    transcriptionId = existing.id;
  } else {
    const { data: created, error: createErr } = await db
      .from("message_transcriptions")
      .insert(transcriptionFields)
      .select("id")
      .single();
    if (createErr || !created) {
      return { success: false, status: "failed", error: "Erro ao criar registro de transcrição." };
    }
    transcriptionId = created.id;
  }

  // Espelha status em whatsapp_messages
  await db
    .from("whatsapp_messages")
    .update({ transcription_status: "processing" })
    .eq("id", messageId);

  // 4) Baixa o áudio do Storage para transcrever
  try {
    const model = process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1";
    const { data: audioData, error: dlErr } = await db.storage
      .from(media.storage_bucket || "shamar-message-media")
      .download(dlResult.storagePath);

    if (dlErr || !audioData) {
      throw new Error("Não foi possível recuperar o áudio do storage.");
    }

    // 5) Transcreve via OpenAI
    const openai = new OpenAI(); // usa OPENAI_API_KEY do env
    const audioBuffer = await audioData.arrayBuffer();
    const audioFile = new File([audioBuffer], `audio.${mimeToExt(media.mime_type)}`, {
      type: media.mime_type || "audio/ogg",
    });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model,
    });

    const text = transcription.text || "";

    // 6) Grava resultado
    await db
      .from("message_transcriptions")
      .update({
        status: "done",
        transcript_text: text,
        completed_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
      })
      .eq("id", transcriptionId);

    await db
      .from("whatsapp_messages")
      .update({
        transcription_status: "done",
        transcription_text: text,
        transcription_error: null,
        transcribed_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    return { success: true, status: "done", text };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);

    await db
      .from("message_transcriptions")
      .update({
        status: "failed",
        error_code: "transcription_error",
        error_message: errMsg,
        completed_at: new Date().toISOString(),
      })
      .eq("id", transcriptionId);

    await db
      .from("whatsapp_messages")
      .update({
        transcription_status: "failed",
        transcription_error: "Não foi possível transcrever. Tente novamente.",
      })
      .eq("id", messageId);

    return { success: false, status: "failed", error: "Não foi possível transcrever. Tente novamente." };
  }
}

function mimeToExt(mime?: string | null): string {
  if (!mime) return "ogg";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  return "ogg";
}

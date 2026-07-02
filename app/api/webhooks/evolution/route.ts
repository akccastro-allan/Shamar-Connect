/**
 * Webhook da Evolution API (Baileys) — canal "Evolution".
 *
 * Marco 1: o canal (e portanto empresa/marca) é resolvido pelo NOME DA INSTÂNCIA
 * que vem no webhook → channels.external_instance. Nunca por ENV. Sem canal
 * reconhecido, o evento é registrado como "canal não reconhecido" e não vira
 * atendimento.
 */

import { NextRequest, NextResponse } from "next/server";
import { parseEvolutionWebhook } from "@/lib/providers/evolution-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { resolveChannelFromWebhook } from "@/lib/inbox/resolve-channel";
import { ingestInboundMessage, recordUnresolvedEvent } from "@/lib/inbox/persist-inbound";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, service: "evolution-webhook" });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const db = createSupabaseWriteClient();
  const messages = parseEvolutionWebhook(body);
  const instance = String((body as Record<string, unknown>)?.["instance"] || "") || null;

  // Resolve o canal pela instância. Sem canal → registra e encerra.
  const channel = await resolveChannelFromWebhook(db, "evolution", { instance });
  if (!channel) {
    await recordUnresolvedEvent(db, "evolution", body);
    return NextResponse.json({ ok: true, note: "unresolved_channel" });
  }

  if (!messages.length) {
    return NextResponse.json({ ok: true, note: "acknowledged_non_message_event" });
  }

  let processed = 0;
  let duplicates = 0;
  const errors: string[] = [];

  for (const m of messages) {
    try {
      const result = await ingestInboundMessage(db, channel, {
        externalEventId: m.messageId,
        externalChatId: m.externalChatId,
        externalMessageId: m.messageId,
        body: m.body,
        messageType: m.messageType,
        media: m.media
          ? {
              mediaType: m.media.mediaType,
              mimetype: m.media.mimetype,
              durationSeconds: m.media.durationSeconds,
              providerMediaId: m.media.providerMediaId,
              // Dados para baixar depois (sem token). A "key" é necessária para o
              // getBase64FromMediaMessage da Evolution.
              downloadMeta: {
                key: (m.rawPayload as { key?: unknown })?.key ?? null,
                url: m.media.url,
                mediaKey: m.media.mediaKey,
                directPath: m.media.directPath,
                fileSha256: m.media.fileSha256,
                mimetype: m.media.mimetype,
                instance: m.instance,
              },
            }
          : null,
        timestampMs: m.timestamp,
        isGroup: m.isGroup,
        senderExternalId: m.senderId,
        identityType: "phone",
        displayName: m.pushName,
        rawPayload: m.rawPayload,
      });

      if (result === "processed") {
        processed += 1;

        // Criar job na fila para agente Lips
        // Apenas para Lips, não para grupos
        if (channel.provider === "evolution" && !m.isGroup && channel.organizationId) {
          const msgQuery = await db
            .from("whatsapp_messages")
            .select("id, conversation_id")
            .eq("external_message_id", m.messageId)
            .maybeSingle();

          if (msgQuery.data?.id && msgQuery.data?.conversation_id) {
            // Criar job pendente na fila
            const { error: jobError } = await db
              .from("agent_automation_jobs")
              .insert({
                tenant_id: channel.tenantId,
                organization_id: channel.organizationId,
                channel_id: channel.channelId,
                conversation_id: msgQuery.data.conversation_id,
                message_id: msgQuery.data.id,
                status: "pending",
                agent_type: "lips-auto",
              });

            // ⚠️ Propagar erro claro (não silenciar)
            if (jobError) {
              console.error("[lips-webhook] Erro ao criar job:", jobError.message);
              errors.push(`Job creation failed for msg ${m.messageId}: ${jobError.message}`);
            }
          }
        }
      } else {
        duplicates += 1;
      }
    } catch (err) {
      errors.push(`${m.messageId}: ${err instanceof Error ? err.message : String(err)}`);
      console.error("[evolution-webhook]", err instanceof Error ? err.message : err);
    }
  }

  // Sempre 200 para a Evolution não reenviar em loop.
  return NextResponse.json({ ok: true, processed, duplicates, errors: errors.length });
}

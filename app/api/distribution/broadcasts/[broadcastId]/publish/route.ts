/**
 * Publish a broadcast to its targets.
 * Currently supports: telegram_group, telegram_channel.
 * WhatsApp groups: copy/paste only (no automatic send).
 */

import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { sendMessage as telegramSendMessage } from "@/lib/providers/telegram-bot-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

type Params = { params: Promise<{ broadcastId: string }> };

export async function POST(request: NextRequest, context: Params) {
  try {
    const appContext = await getRequiredAppContext();
    const { broadcastId } = await context.params;

    const db = createSupabaseWriteClient();
    const now = new Date().toISOString();

    // Load broadcast
    const { data: broadcast, error: bError } = await db
      .from("content_broadcasts")
      .select("id, title, message_text, status, tenant_id, organization_id")
      .eq("id", broadcastId)
      .eq("tenant_id", appContext.tenantId)
      .eq("organization_id", appContext.organizationId)
      .single();

    if (bError) throw bError;
    if (!broadcast) return NextResponse.json({ ok: false, error: "Broadcast não encontrado." }, { status: 404 });

    if (broadcast.status === "published") {
      return NextResponse.json({ ok: false, error: "Broadcast já foi publicado." }, { status: 400 });
    }
    if (!["draft", "ready"].includes(broadcast.status)) {
      return NextResponse.json({ ok: false, error: `Status '${broadcast.status}' não permite publicação.` }, { status: 400 });
    }

    // Load pending targets
    const { data: targets, error: tError } = await db
      .from("content_broadcast_targets")
      .select("id, status, distribution_channel_id, distribution_channels(id, name, provider, external_id, is_broadcast_only)")
      .eq("broadcast_id", broadcastId)
      .eq("status", "pending");

    if (tError) throw tError;

    if (!targets || targets.length === 0) {
      return NextResponse.json({ ok: false, error: "Nenhum target pendente encontrado." }, { status: 400 });
    }

    const results: Array<{
      targetId: string;
      channelName: string;
      provider: string;
      status: "published" | "failed" | "skipped";
      note?: string;
      error?: string;
    }> = [];

    for (const target of targets) {
      const channel = (target.distribution_channels as unknown) as {
        id: string;
        name: string;
        provider: string;
        external_id: string | null;
        is_broadcast_only: boolean;
      } | null;

      if (!channel) {
        results.push({ targetId: target.id, channelName: "?", provider: "?", status: "failed", error: "Canal não encontrado" });
        continue;
      }

      // WhatsApp groups: skip automatic send — copy/paste only
      if (channel.provider === "whatsapp_group" || channel.provider === "whatsapp_channel") {
        await db
          .from("content_broadcast_targets")
          .update({ status: "skipped", error: "WhatsApp: envio manual via cópia", published_at: now })
          .eq("id", target.id);

        results.push({ targetId: target.id, channelName: channel.name, provider: channel.provider, status: "skipped", note: "Cópia manual necessária" });
        continue;
      }

      // Instagram: not yet implemented
      if (channel.provider === "instagram") {
        await db
          .from("content_broadcast_targets")
          .update({ status: "skipped", error: "Instagram: integração ainda não ativa", published_at: now })
          .eq("id", target.id);

        results.push({ targetId: target.id, channelName: channel.name, provider: channel.provider, status: "skipped", note: "Instagram em preparação" });
        continue;
      }

      // Telegram
      if (channel.provider === "telegram_group" || channel.provider === "telegram_channel") {
        if (!channel.external_id) {
          await db
            .from("content_broadcast_targets")
            .update({ status: "failed", error: "external_id não configurado para este canal Telegram", published_at: now })
            .eq("id", target.id);

          results.push({ targetId: target.id, channelName: channel.name, provider: channel.provider, status: "failed", error: "external_id ausente" });
          continue;
        }

        try {
          const sent = await telegramSendMessage(channel.external_id, broadcast.message_text);

          await db
            .from("content_broadcast_targets")
            .update({
              status: "published",
              provider_message_id: String(sent.message_id),
              published_at: now,
              error: null,
            })
            .eq("id", target.id);

          results.push({ targetId: target.id, channelName: channel.name, provider: channel.provider, status: "published" });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);

          await db
            .from("content_broadcast_targets")
            .update({ status: "failed", error: errMsg, published_at: now })
            .eq("id", target.id);

          results.push({ targetId: target.id, channelName: channel.name, provider: channel.provider, status: "failed", error: errMsg });
        }

        continue;
      }
    }

    // Update broadcast status
    const allDone = results.every((r) => r.status === "published" || r.status === "skipped");
    const anyPublished = results.some((r) => r.status === "published");
    const newStatus = allDone ? "published" : anyPublished ? "published" : broadcast.status;

    await db
      .from("content_broadcasts")
      .update({
        status: newStatus,
        published_at: anyPublished ? now : null,
        updated_at: now,
      })
      .eq("id", broadcastId);

    return NextResponse.json({ ok: true, results, newStatus });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao publicar" }, { status: 500 });
  }
}

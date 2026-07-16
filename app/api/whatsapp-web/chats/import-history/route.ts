import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { isSupervisorRole } from "@/lib/queues/lips-queue";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { enqueueWhatsappSync } from "@/lib/whatsapp-sync/service";

function clampLimit(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(Math.max(Math.trunc(parsed), 1), 100);
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseWriteClient();
    const body = await request.json().catch(() => ({}));
    const chatId = String(body?.chatId || "").trim();
    const channelId = body?.channelId ? String(body.channelId) : null;

    if (!isSupervisorRole(context.role)) {
      return NextResponse.json({ ok: false, error: "Diagnóstico restrito a administradores." }, { status: 403 });
    }

    if (!chatId) return NextResponse.json({ ok: false, error: "chatId is required" }, { status: 400 });
    if (!channelId) return NextResponse.json({ ok: false, error: "channelId is required" }, { status: 400 });

    const { data: channel, error } = await db
      .from("channels")
      .select("id, session_id, provider")
      .eq("id", channelId)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .maybeSingle();
    if (error) throw error;
    if (!channel?.id) return NextResponse.json({ ok: false, error: "Canal não encontrado." }, { status: 403 });
    if (channel.provider && channel.provider !== "whatsapp_web") return NextResponse.json({ ok: false, error: "Canal não é WhatsApp Web." }, { status: 400 });

    const result = await enqueueWhatsappSync(db, {
      tenantId: context.tenantId,
      organizationId: context.organizationId,
      channelId: channel.id,
      sessionId: channel.session_id,
      mode: "manual_diagnostic",
      triggerSource: "import_history_endpoint",
      requestedByAppUserId: context.appUserId,
      selectedChatIds: [chatId],
      chatLimit: 1,
      messageLimit: clampLimit(body?.limit),
      metadata: { requestedFrom: "import-history" },
    });

    return NextResponse.json({ ok: true, chatId, queued: result.created, runId: result.runId, status: result.status, mode: "manual_diagnostic" });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to enqueue chat history import" }, { status: 500 });
  }
}

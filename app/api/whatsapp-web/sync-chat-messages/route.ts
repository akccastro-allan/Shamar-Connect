import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { isSupervisorRole } from "@/lib/queues/lips-queue";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { enqueueWhatsappSync } from "@/lib/whatsapp-sync/service";

function clampLimit(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), 1), 100);
}

function normalizeChatIds(body: Record<string, unknown>) {
  if (Array.isArray(body.chatIds)) return body.chatIds.map(String).filter(Boolean);
  if (body.chatId) return [String(body.chatId)];
  return [];
}

async function enqueueManualDiagnostic(body: Record<string, unknown>) {
  const context = await getRequiredAppContext();
  const db = createSupabaseWriteClient();
  const chatIds = normalizeChatIds(body);
  const channelId = body.channelId ? String(body.channelId) : null;

  if (!isSupervisorRole(context.role)) {
    return NextResponse.json({ ok: false, error: "Diagnóstico restrito a administradores." }, { status: 403 });
  }

  if (!channelId) {
    return NextResponse.json({ ok: false, error: "channelId is required." }, { status: 400 });
  }

  const { data: channel, error } = await db
    .from("channels")
    .select("id, tenant_id, organization_id, session_id, provider")
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
    triggerSource: "inbox_manual_button",
    requestedByAppUserId: context.appUserId,
    selectedChatIds: chatIds,
    chatLimit: clampLimit(body.chatLimit, chatIds.length || 1),
    messageLimit: clampLimit(body.limit ?? body.messageLimit, 50),
    metadata: { requestedFrom: "sync-chat-messages" },
  });

  return NextResponse.json({ ok: true, queued: result.created, runId: result.runId, status: result.status, mode: "manual_diagnostic" });
}

export async function GET(request: NextRequest) {
  try {
    const body = {
      chatId: request.nextUrl.searchParams.get("chatId") || undefined,
      channelId: request.nextUrl.searchParams.get("channelId") || undefined,
      limit: request.nextUrl.searchParams.get("limit") || undefined,
      chatLimit: request.nextUrl.searchParams.get("chatLimit") || undefined,
    };
    return enqueueManualDiagnostic(body);
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to enqueue chat sync" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    return enqueueManualDiagnostic(body && typeof body === "object" ? body as Record<string, unknown> : {});
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to enqueue chat sync" }, { status: 500 });
  }
}

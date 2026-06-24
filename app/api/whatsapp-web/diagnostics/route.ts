import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server";
import { resolveSessionClient, sessionIdErrorResponse, SESSION_LABELS } from "@/lib/providers/resolve-session";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    const resolved = resolveSessionClient(sessionId);
    if (!resolved) return sessionIdErrorResponse();

    const db = createSupabaseWriteClient();

    // Resolve channel_id for this session (used to isolate per-session counts)
    const { data: channelRow } = await db
      .from("channels")
      .select("id")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("session_id", resolved.sessionId)
      .maybeSingle();
    const channelId: string | null = channelRow?.id ?? null;

    // Gateway status (may fail if offline — capture gracefully)
    let gatewayStatus: Record<string, unknown> | null = null;
    let gatewayError: string | null = null;
    try {
      gatewayStatus = await resolved.client.getStatus() as unknown as Record<string, unknown>;
    } catch (err) {
      gatewayError = err instanceof Error ? err.message : "Gateway indisponível";
    }

    // Conversation counts (scoped to this session's channel when available)
    const baseConvQ = db
      .from("whatsapp_conversations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId);

    const { count: totalConversations } = await (channelId
      ? baseConvQ.eq("channel_id", channelId)
      : baseConvQ.is("channel_id", null));

    const { count: requiresHumanCount } = await (channelId
      ? db.from("whatsapp_conversations").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).eq("organization_id", context.organizationId).eq("channel_id", channelId).eq("requires_human", true)
      : db.from("whatsapp_conversations").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).eq("organization_id", context.organizationId).is("channel_id", null).eq("requires_human", true));

    const { count: slaBreachedCount } = await (channelId
      ? db.from("whatsapp_conversations").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).eq("organization_id", context.organizationId).eq("channel_id", channelId).eq("sla_status", "breached")
      : db.from("whatsapp_conversations").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).eq("organization_id", context.organizationId).is("channel_id", null).eq("sla_status", "breached"));

    // Message count (org-wide — messages don't have channel_id directly)
    const { count: totalMessages } = await db
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId);

    // Last watchdog events
    const { data: watchdogEvents } = await db
      .from("whatsapp_conversation_events")
      .select("id, event_type, description, created_at, metadata")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("event_source", "watchdog")
      .order("created_at", { ascending: false })
      .limit(5);

    // Last safe_automation events
    const { data: automationEvents } = await db
      .from("whatsapp_conversation_events")
      .select("id, event_type, description, created_at, metadata, conversation_id")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("event_source", "safe_automation")
      .order("created_at", { ascending: false })
      .limit(10);

    // Last outbound auto messages
    const { data: autoMessages } = await db
      .from("whatsapp_messages")
      .select("id, body, created_at, conversation_id, to_id")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("direction", "outbound")
      .order("created_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      ok: true,
      checkedAt: new Date().toISOString(),
      sessionId: resolved.sessionId,
      sessionLabel: SESSION_LABELS[resolved.sessionId],
      gateway: {
        status: gatewayStatus,
        error: gatewayError,
        online: gatewayError === null,
      },
      conversations: {
        total: totalConversations ?? 0,
        requiresHuman: requiresHumanCount ?? 0,
        slaBreached: slaBreachedCount ?? 0,
      },
      messages: {
        total: totalMessages ?? 0,
      },
      recentWatchdogEvents: watchdogEvents ?? [],
      recentAutomationEvents: automationEvents ?? [],
      recentAutoMessages: autoMessages ?? [],
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao carregar diagnóstico" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseServerClient();

    // Gateway status (may fail if offline — capture gracefully)
    let gatewayStatus: Record<string, unknown> | null = null;
    let gatewayError: string | null = null;
    try {
      gatewayStatus = await whatsappWebGatewayClient.getStatus() as unknown as Record<string, unknown>;
    } catch (err) {
      gatewayError = err instanceof Error ? err.message : "Gateway indisponível";
    }

    // Conversation counts
    const { count: totalConversations } = await db
      .from("whatsapp_conversations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId);

    const { count: requiresHumanCount } = await db
      .from("whatsapp_conversations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("requires_human", true);

    const { count: slaBreachedCount } = await db
      .from("whatsapp_conversations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("sla_status", "breached");

    // Message count
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

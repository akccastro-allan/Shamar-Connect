import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { resolveSessionClient, sessionIdErrorResponse } from "@/lib/providers/resolve-session";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const body = await request.json().catch(() => ({}));
    const sessionId = body?.sessionId ? String(body.sessionId) : null;
    const resolved = resolveSessionClient(sessionId);
    if (!resolved) return sessionIdErrorResponse();

    const client = createSupabaseWriteClient();
    const result = await resolved.client.connect();

    await client
      .from("whatsapp_connections")
      .update({
        status: result.status ?? "connecting",
        last_connected_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          lastResult: result,
          source: "whatsapp_web_start",
        },
      })
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("provider", "whatsapp_web")
      .eq("is_active", true);

    return NextResponse.json(result);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "Gateway start failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


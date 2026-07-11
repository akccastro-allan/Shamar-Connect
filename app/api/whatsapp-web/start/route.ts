import { NextRequest, NextResponse } from "next/server";
import { isUnauthorizedError } from "@/lib/auth/app-context";
import { requireOwnedWhatsappSession } from "../_auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = body?.sessionId ? String(body.sessionId) : null;
    const session = await requireOwnedWhatsappSession(sessionId);
    if (!session.ok) return session.response;

    const result = await session.resolved.client.connect();

    await session.db
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
      .eq("tenant_id", session.context.tenantId)
      .eq("organization_id", session.context.organizationId)
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


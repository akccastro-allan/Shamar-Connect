import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function POST() {
  try {
    const context = await getRequiredAppContext();
    const client = createSupabaseWriteClient();

    const result = await whatsappWebGatewayClient.connect();

    await client
      .from("whatsapp_connections")
      .update({
        status: (result as any)?.status || "connecting",
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


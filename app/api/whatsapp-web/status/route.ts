import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { whatsappWebGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function GET() {
  try {
    const context = await getRequiredAppContext();
    const client = createSupabaseWriteClient();

    const status = await whatsappWebGatewayClient.getStatus();

    await client
      .from("whatsapp_connections")
      .update({
        status: (status as any)?.status || "unknown",
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          lastStatus: status,
          source: "whatsapp_web_status",
        },
      })
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("provider", "whatsapp_web")
      .eq("is_active", true);

    return NextResponse.json(status);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load WhatsApp status" },
      { status: 500 },
    );
  }
}


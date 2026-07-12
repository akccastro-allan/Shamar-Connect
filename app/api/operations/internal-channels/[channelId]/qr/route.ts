import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { canAccessCommandCenter, getTenantFeatureMetadata } from "@/lib/features/feature-flags";
import { mapProviderSessionStatus, type InternalGatewayRow } from "@/lib/operations/internal-gateways";
import { validateInternalChannelForGatewayAction, type InternalWhatsappChannel } from "@/lib/operations/internal-whatsapp";
import { createWhatsappGatewayClient } from "@/lib/providers/whatsapp-web-gateway-client";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ channelId: string }> };

async function requireCommandCenterApi() {
  const context = await getRequiredAppContext();
  const db = createSupabaseWriteClient();
  const metadata = await getTenantFeatureMetadata(db, context.tenantId);
  if (!canAccessCommandCenter(context, metadata)) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "Acesso restrito ao Centro de Comando." }, { status: 403 }) };
  }
  return { ok: true as const, context, db };
}

export async function POST(_request: Request, routeContext: Params) {
  try {
    const auth = await requireCommandCenterApi();
    if (!auth.ok) return auth.response;
    const { channelId } = await routeContext.params;

    const { data: channel, error: channelError } = await auth.db
      .from("channels")
      .select("id, tenant_id, organization_id, provider, channel_type, session_id, gateway_id, status, active, is_active, metadata")
      .eq("tenant_id", auth.context.tenantId)
      .eq("id", channelId)
      .maybeSingle();
    if (channelError) throw channelError;

    const gatewayId = channel?.gateway_id || ((channel?.metadata && typeof channel.metadata === "object" && !Array.isArray(channel.metadata)) ? String((channel.metadata as Record<string, unknown>).gatewayId || "") : "");
    const { data: gateway, error: gatewayError } = gatewayId
      ? await auth.db.from("internal_messaging_gateways").select("id, tenant_id, name, slug, provider, base_url, environment, status, version, max_sessions, last_health_check_at, last_error, metadata").eq("tenant_id", auth.context.tenantId).eq("id", gatewayId).maybeSingle()
      : { data: null, error: null };
    if (gatewayError) throw gatewayError;

    const validation = validateInternalChannelForGatewayAction({
      channel: channel as InternalWhatsappChannel | null,
      gateway: gateway as InternalGatewayRow | null,
      tenantId: auth.context.tenantId,
    });
    if (!validation.ok) return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });

    await auth.db.from("channels").update({ status: "connecting" }).eq("tenant_id", auth.context.tenantId).eq("id", channelId);
    const client = createWhatsappGatewayClient(String(channel!.session_id), { baseUrl: String(gateway!.base_url) });
    const providerStatus = await client.connect();
    const qrStatus = await client.getQr();
    const status = mapProviderSessionStatus(qrStatus.status || providerStatus.status);

    await auth.db.from("channels").update({ status }).eq("tenant_id", auth.context.tenantId).eq("id", channelId);
    return NextResponse.json({ ok: true, status, qrCode: qrStatus.qrCode || null });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao gerar QR." }, { status: 500 });
  }
}

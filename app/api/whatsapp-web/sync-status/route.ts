import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getWhatsappSyncStatus } from "@/lib/whatsapp-sync/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseWriteClient();
    const channelId = request.nextUrl.searchParams.get("channelId");

    if (channelId) {
      const { data: channel, error } = await db
        .from("channels")
        .select("id")
        .eq("id", channelId)
        .eq("tenant_id", context.tenantId)
        .eq("organization_id", context.organizationId)
        .maybeSingle();
      if (error) throw error;
      if (!channel?.id) return NextResponse.json({ ok: false, error: "Canal não encontrado." }, { status: 404 });
    }

    const statuses = await getWhatsappSyncStatus(db, {
      tenantId: context.tenantId,
      organizationId: context.organizationId,
      channelId,
    });

    return NextResponse.json({ ok: true, statuses, status: statuses[0] || null });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao carregar status de sync." }, { status: 500 });
  }
}

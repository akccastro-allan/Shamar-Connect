import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseWriteClient();

    const { data, error } = await db
      .from("distribution_channels")
      .select("id, name, provider, external_id, external_url, active, is_broadcast_only, allow_replies, description")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .order("name");

    if (error) throw error;

    return NextResponse.json({ ok: true, channels: data || [] });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha" }, { status: 500 });
  }
}

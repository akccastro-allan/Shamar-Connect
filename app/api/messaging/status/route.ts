import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseWriteClient();

    const { data: channels, error: channelsError } = await db
      .from("channels")
      .select("id, name, provider, status, session_id")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .order("name");

    if (channelsError) throw channelsError;

    return NextResponse.json({
      ok: true,
      channels: channels ?? [],
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to load messaging status",
    }, { status: 500 });
  }
}

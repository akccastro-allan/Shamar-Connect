import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseWriteClient();

    const { data, error } = await db
      .from("pipeline_stages")
      .select("id, name, position, color, active")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .order("position");

    if (error) throw error;

    return NextResponse.json({ ok: true, stages: data || [] });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao carregar etapas" }, { status: 500 });
  }
}

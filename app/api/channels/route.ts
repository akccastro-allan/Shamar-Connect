import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseServerClient();

    const { data, error } = await db
      .from("channels")
      .select("id, name, slug, session_id, phone, active, color, description, created_at")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .order("name");

    if (error) throw error;

    return NextResponse.json({ ok: true, channels: data || [] });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao carregar canais" }, { status: 500 });
  }
}

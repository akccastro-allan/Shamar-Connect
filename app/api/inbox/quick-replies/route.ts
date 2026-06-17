import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const context = await getRequiredAppContext();
    const client = createSupabaseServerClient();

    const { data, error } = await client
      .from("quick_replies")
      .select("id, title, body, category, is_active, created_at, updated_at")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("title", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, quickReplies: data || [] });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load quick replies" },
      { status: 500 },
    );
  }
}


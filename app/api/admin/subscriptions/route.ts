import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function GET() {
  try {
    const context = await getRequiredAppContext();

    if ((context.role !== "owner" && context.role !== "admin") || !context.isPlatformTenant) {
      return NextResponse.json({ ok: false, error: "Acesso restrito a administradores." }, { status: 403 });
    }

    const db = createSupabaseWriteClient();

    const { data, error } = await db
      .from("billing_subscriptions")
      .select("id, tenant_id, organization_id, plan_slug, billing_cycle, status, total_amount, current_period_end, billing_provider, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ ok: true, subscriptions: data || [] });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao carregar assinaturas." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

export async function GET() {
  try {
    const ctx = await getRequiredAppContext();
    const db = createSupabaseWriteClient();

    const { data: sub } = await db
      .from("billing_subscriptions")
      .select("id, plan_slug, billing_cycle, status, total_amount, base_amount, addons, storage_quota_gb, message_retention_days, started_at, current_period_end, billing_provider, checkout_session_id")
      .eq("tenant_id", ctx.tenantId)
      .eq("organization_id", ctx.organizationId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ ok: true, subscription: sub || null });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao carregar assinatura" }, { status: 500 });
  }
}

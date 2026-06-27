import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

const VALID_PLANS = new Set(["starter", "professional", "business"]);
const VALID_CYCLES = new Set(["monthly", "annual"]);

const PLAN_DEFAULTS: Record<string, { storage_quota_gb: number; message_retention_days: number }> = {
  starter:      { storage_quota_gb: 5,   message_retention_days: 365  },
  professional: { storage_quota_gb: 15,  message_retention_days: 730  },
  business:     { storage_quota_gb: 105, message_retention_days: 1095 },
};

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getRequiredAppContext();
    if ((ctx.role !== "owner" && ctx.role !== "admin") || !ctx.isPlatformTenant) {
      return NextResponse.json({ ok: false, error: "Acesso restrito a administradores da plataforma." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const planSlug = String(body?.plan_slug || "").trim();
    const billingCycle = String(body?.billing_cycle || "").trim();
    const totalAmount = Number(body?.total_amount ?? NaN);
    const reason = String(body?.reason || "").trim();

    if (!VALID_PLANS.has(planSlug)) {
      return NextResponse.json({ ok: false, error: "Plano inválido. Use: starter, professional, business." }, { status: 400 });
    }
    if (!VALID_CYCLES.has(billingCycle)) {
      return NextResponse.json({ ok: false, error: "Ciclo inválido. Use: monthly, annual." }, { status: 400 });
    }
    if (isNaN(totalAmount) || totalAmount < 0) {
      return NextResponse.json({ ok: false, error: "total_amount inválido." }, { status: 400 });
    }

    const db = createSupabaseWriteClient();
    const now = new Date().toISOString();

    const { data: sub } = await db
      .from("billing_subscriptions")
      .select("id, plan_slug, billing_cycle, total_amount, tenant_id, organization_id, metadata")
      .eq("id", id)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ ok: false, error: "Assinatura não encontrada." }, { status: 404 });
    }

    const defaults = PLAN_DEFAULTS[planSlug];

    const previousMetadata =
      sub.metadata && typeof sub.metadata === "object" && !Array.isArray(sub.metadata)
        ? (sub.metadata as Record<string, unknown>)
        : {};

    const { error } = await db
      .from("billing_subscriptions")
      .update({
        plan_slug: planSlug,
        billing_cycle: billingCycle,
        total_amount: totalAmount,
        storage_quota_gb: defaults.storage_quota_gb,
        message_retention_days: defaults.message_retention_days,
        updated_at: now,
        metadata: {
          ...previousMetadata,
          last_plan_change: {
            from: { plan: sub.plan_slug, cycle: sub.billing_cycle, amount: sub.total_amount },
            to: { plan: planSlug, cycle: billingCycle, amount: totalAmount },
            by: ctx.email,
            at: now,
            reason,
          },
        },
      })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true, subscriptionId: id, planSlug, billingCycle, totalAmount });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao atualizar plano." }, { status: 500 });
  }
}

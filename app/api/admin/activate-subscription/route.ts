/**
 * Manual subscription activation for clients already provisioned (e.g. Lips).
 * Creates a billing_subscriptions row directly without going through checkout.
 */
import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();

    if ((context.role !== "owner" && context.role !== "admin") || !context.isPlatformTenant) {
      return NextResponse.json({ ok: false, error: "Acesso restrito a administradores." }, { status: 403 });
    }

    const body = await request.json();
    const tenantId = String(body?.tenantId || "").trim();
    const organizationId = String(body?.organizationId || "").trim();
    const planSlug = String(body?.planSlug || "professional").trim();
    const billingCycle = body?.billingCycle === "annual" ? "annual" : "monthly";
    const totalAmount = Number(body?.totalAmount || 0);
    const notes = String(body?.notes || "").trim();

    if (!tenantId || !organizationId) {
      return NextResponse.json({ ok: false, error: "tenantId e organizationId são obrigatórios." }, { status: 400 });
    }

    const db = createSupabaseWriteClient();

    // Verify tenant/org exist
    const { data: org } = await db
      .from("organizations")
      .select("id, name, tenant_id")
      .eq("id", organizationId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!org) {
      return NextResponse.json({ ok: false, error: "Organização não encontrada." }, { status: 404 });
    }

    // Check if active subscription already exists
    const { data: existing } = await db
      .from("billing_subscriptions")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: false, error: "Já existe uma assinatura ativa para este cliente." }, { status: 409 });
    }

    const now = new Date().toISOString();
    const periodEnd = billingCycle === "annual"
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: sub, error: subError } = await db
      .from("billing_subscriptions")
      .insert({
        tenant_id: tenantId,
        organization_id: organizationId,
        plan_slug: planSlug,
        billing_cycle: billingCycle,
        status: "active",
        base_amount: totalAmount,
        setup_amount: 0,
        extra_whatsapp_connections: 0,
        extra_users: 0,
        ai_addon_enabled: false,
        total_amount: totalAmount,
        currency: "BRL",
        billing_provider: "manual",
        started_at: now,
        current_period_start: now,
        current_period_end: periodEnd,
        metadata: {
          activated_by: context.email,
          notes,
          manual_activation: true,
        },
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (subError) throw subError;

    // Ensure org and tenant are active
    await db.from("organizations").update({ status: "active", updated_at: now }).eq("id", organizationId);
    await db.from("tenants").update({ status: "active", updated_at: now }).eq("id", tenantId);

    return NextResponse.json({ ok: true, subscriptionId: sub.id, tenantId, organizationId, planSlug });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao ativar assinatura." },
      { status: 500 },
    );
  }
}

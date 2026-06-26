import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

const VALID_STATUS = new Set(["active", "paused", "cancelled"]);

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getRequiredAppContext();
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Acesso restrito a administradores." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const newStatus = String(body?.status || "").trim();
    const reason = String(body?.reason || "").trim();

    if (!VALID_STATUS.has(newStatus)) {
      return NextResponse.json({ ok: false, error: "Status inválido. Use: active, paused, cancelled." }, { status: 400 });
    }

    const db = createSupabaseWriteClient();
    const now = new Date().toISOString();

    const { data: sub } = await db
      .from("billing_subscriptions")
      .select("id, status, tenant_id, organization_id, plan_slug")
      .eq("id", id)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ ok: false, error: "Assinatura não encontrada." }, { status: 404 });
    }

    const patch: Record<string, unknown> = {
      status: newStatus,
      updated_at: now,
      metadata: { last_status_change: { from: sub.status, to: newStatus, by: ctx.email, at: now, reason } },
    };
    if (newStatus === "cancelled") patch.cancelled_at = now;

    const { error } = await db
      .from("billing_subscriptions")
      .update(patch)
      .eq("id", id);

    if (error) throw error;

    // Reflete no tenant quando cancelado
    if (newStatus === "cancelled") {
      await db.from("tenants").update({ status: "suspended", updated_at: now }).eq("id", sub.tenant_id);
    } else if (newStatus === "active") {
      await db.from("tenants").update({ status: "active", updated_at: now }).eq("id", sub.tenant_id);
    }

    return NextResponse.json({ ok: true, subscriptionId: id, newStatus });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao atualizar assinatura." }, { status: 500 });
  }
}

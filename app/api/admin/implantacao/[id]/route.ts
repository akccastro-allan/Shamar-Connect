import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequiredAppContext();
    if ((context.role !== "owner" && context.role !== "admin") || !context.isPlatformTenant) {
      return NextResponse.json({ ok: false, error: "Acesso restrito a administradores da plataforma." }, { status: 403 });
    }

    const { id } = await params;
    const db = createSupabaseWriteClient();
    const { data, error } = await db
      .from("billing_checkout_sessions")
      .select(
        "id, plan_slug, billing_cycle, customer_name, customer_email, customer_document, " +
          "payment_method, total_amount, final_amount, payment_method_fee_cents, " +
          "provider_payment_id, tenant_id, organization_id, status, paid_at, metadata, created_at",
      )
      .eq("id", id)
      .eq("status", "paid_pending_activation")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ ok: false, error: "Checkout não encontrado na fila de implantação." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao carregar checkout." },
      { status: 500 },
    );
  }
}

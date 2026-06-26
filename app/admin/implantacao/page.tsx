import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const METHOD_LABEL: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão",
  boleto: "Boleto",
};

const PLAN_LABEL: Record<string, string> = {
  starter: "Essencial",
  professional: "Professional",
  business: "Business",
};

export default async function ImplantacaoPage() {
  try {
    const context = await getRequiredAppContext();
    if (!context.isPlatformTenant) redirect("/dashboard");
  } catch (err) {
    if (isUnauthorizedError(err)) redirect("/login");
    throw err;
  }

  type CheckoutRow = {
    id: string;
    plan_slug: string | null;
    billing_cycle: string | null;
    customer_name: string | null;
    customer_email: string | null;
    payment_method: string | null;
    final_amount: number | null;
    paid_at: string | null;
    metadata: Record<string, unknown> | null;
  };

  const db = createSupabaseWriteClient();
  const { data: checkouts } = await db
    .from("billing_checkout_sessions")
    .select(
      "id, plan_slug, billing_cycle, customer_name, customer_email, " +
      "payment_method, final_amount, paid_at, metadata"
    )
    .eq("status", "paid_pending_activation")
    .order("paid_at", { ascending: true });

  const list = (checkouts ?? []) as unknown as CheckoutRow[];

  return (
    <AppShell active="admin">
      <PageHeader
        title="Implantação assistida"
        description="Clientes com pagamento confirmado aguardando provisionamento e ativação."
        badge="Admin"
      />

      {list.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-black text-[#1B2F5B]">Nenhum cliente aguardando implantação</p>
          <p className="mt-2 text-sm text-slate-500">Quando um pagamento for confirmado, o cliente aparece aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((checkout) => {
            const meta = (checkout.metadata ?? {}) as Record<string, unknown>;
            const addons = Array.isArray(meta.selectedAddons) ? meta.selectedAddons as Array<{ name: string }> : [];

            return (
              <div key={checkout.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-[#1B2F5B]">{checkout.customer_name}</p>
                    <p className="text-sm text-slate-500">{checkout.customer_email}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#1B2F5B]/10 px-3 py-1 text-xs font-black text-[#1B2F5B]">
                        {PLAN_LABEL[checkout.plan_slug ?? ""] ?? checkout.plan_slug}
                        {" · "}
                        {checkout.billing_cycle === "annual" ? "anual" : "mensal"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {METHOD_LABEL[checkout.payment_method ?? ""] ?? checkout.payment_method}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        {formatCurrency(Number(checkout.final_amount ?? 0))}
                      </span>
                      {addons.map((a) => (
                        <span key={a.name} className="rounded-full bg-[#C9952A]/10 px-3 py-1 text-xs font-bold text-[#C9952A]">
                          {a.name}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Pago em {formatDate(checkout.paid_at)}</p>
                  </div>
                  <Link
                    href={`/admin/implantacao/${checkout.id}`}
                    className="shrink-0 rounded-full bg-[#1B2F5B] px-5 py-2.5 text-sm font-black text-white hover:bg-[#1B2F5B]/90"
                  >
                    Implantar
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

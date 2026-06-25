import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { CheckoutForm } from "./checkout-form";

type CheckoutPageProps = {
  searchParams?: Promise<{ plan?: string }>;
};

function normalizePlan(plan?: string) {
  const value = String(plan || "professional").toLowerCase();
  return ["starter", "professional", "business"].includes(value) ? value : "professional";
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const initialPlan = normalizePlan(params?.plan);

  const db = createSupabaseWriteClient();
  const { data: paymentMethodRules } = await db
    .from("billing_payment_method_rules")
    .select("payment_method, enabled, display_order, is_recommended, fixed_fee_cents, percentage_fee, description")
    .eq("enabled", true)
    .order("display_order");

  const rules = paymentMethodRules ?? [];

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center" aria-label="ShamarConnect">
            <BrandLogo variant="mark" className="h-11 w-auto object-contain md:h-12" />
          </Link>
          <div className="flex items-center gap-4 text-sm font-bold">
            <Link href="/terms" className="text-slate-600 hover:text-[#1B2F5B]">Termos</Link>
            <Link href="/cancelamento-e-reembolso" className="text-slate-600 hover:text-[#1B2F5B]">Cancelamento</Link>
            <Link href="/login" className="rounded-full bg-[#1B2F5B] px-5 py-2.5 text-white">Entrar</Link>
          </div>
        </div>
      </header>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#C9952A]">Checkout</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-[#1B2F5B] md:text-6xl">
            Contrate o ShamarConnect com pagamento seguro
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Informe os dados do responsável financeiro, revise plano, implantação e adicionais. Depois você será direcionado para o pagamento seguro pelo Asaas.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <CheckoutForm initialPlan={initialPlan} paymentMethodRules={rules} />
      </section>
    </main>
  );
}

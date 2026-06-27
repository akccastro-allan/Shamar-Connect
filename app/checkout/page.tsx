import Link from "next/link";

import { CheckoutForm } from "./checkout-form";

type CheckoutPageProps = {
  searchParams?: Promise<{ plan?: string }>;
};

type PaymentMethodRule = {
  payment_method: "pix" | "credit_card" | "boleto";
  enabled: boolean;
  display_order: number;
  is_recommended: boolean;
  fixed_fee_cents: number;
  percentage_fee: number;
  description: string;
};

function normalizePlan(plan?: string) {
  const value = String(plan || "professional").toLowerCase();
  return ["starter", "professional", "business"].includes(value) ? value : "professional";
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const initialPlan = normalizePlan(params?.plan);

  const DEFAULT_PAYMENT_RULES: PaymentMethodRule[] = [
    {
      payment_method: "pix",
      enabled: true,
      display_order: 1,
      is_recommended: true,
      fixed_fee_cents: 0,
      percentage_fee: 0,
      description: "Recomendado — confirmação mais rápida para iniciar sua implantação.",
    },
    {
      payment_method: "credit_card",
      enabled: true,
      display_order: 2,
      is_recommended: false,
      fixed_fee_cents: 0,
      percentage_fee: 0,
      description: "Pague com cartão de crédito.",
    },
    {
      payment_method: "boleto",
      enabled: true,
      display_order: 3,
      is_recommended: false,
      fixed_fee_cents: 500,
      percentage_fee: 0,
      description: "Boleto possui compensação mais lenta e pode incluir custo operacional adicional.",
    },
  ];

  let rules = DEFAULT_PAYMENT_RULES;

  try {
    const { createSupabaseWriteClient } = await import("@/lib/supabase/server-write");
    const db = createSupabaseWriteClient();
    const { data } = await db
      .from("billing_payment_method_rules")
      .select("payment_method, enabled, display_order, is_recommended, fixed_fee_cents, percentage_fee, description")
      .eq("enabled", true)
      .order("display_order");

    if (data && data.length > 0) rules = data as PaymentMethodRule[];
  } catch {
    // Supabase indisponível — usa regras padrão
  }

  return (
    <main className="min-h-screen bg-[#F6F8FC] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 md:px-8">
          <Link href="/" aria-label="Shamar Connect" className="text-xl font-black tracking-tight text-[#132B57] md:text-2xl">
            Shamar Connect
          </Link>

          <div className="flex items-center gap-3 text-sm font-bold">
            <Link href="/terms" className="hidden text-slate-600 transition hover:text-[#132B57] sm:inline">
              Termos
            </Link>
            <Link href="/cancelamento-e-reembolso" className="hidden text-slate-600 transition hover:text-[#132B57] md:inline">
              Cancelamento
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-[#132B57] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-[#132B57]/15 transition hover:-translate-y-0.5 hover:bg-[#0E2147]"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#0B1220] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(42,191,171,0.22),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(255,255,255,0.10),transparent_28%)]" />
        <div className="absolute -right-24 bottom-10 h-72 w-72 rotate-12 rounded-[3rem] bg-white/5" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <div className="inline-flex rounded-full bg-white/8 px-4 py-2 text-sm font-black text-[#86F2E2] ring-1 ring-white/10">
              Checkout seguro via Asaas
            </div>
            <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[1.04] tracking-tight md:text-6xl">
              Revise sua contratação e siga para o pagamento.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
              Informe os dados do responsável financeiro, confira plano, implantação e adicionais. A ativação acontece após confirmação e implantação assistida.
            </p>
          </div>

          <div className="relative">
            <div className="rounded-[2.25rem] bg-white/8 p-4 ring-1 ring-white/10 backdrop-blur">
              <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-2xl shadow-black/25">
                <div className="border-b border-slate-100 bg-[#F7F9FC] px-5 py-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#13796D]">Processo de contratação</p>
                  <p className="mt-1 text-sm font-black text-[#132B57]">Pagamento + implantação assistida</p>
                </div>
                <div className="grid gap-3 p-5">
                  {[
                    ["1", "Escolha o plano", "Base mensal ou anual"],
                    ["2", "Adicione recursos", "Usuários, WhatsApps e add-ons"],
                    ["3", "Pague com segurança", "PIX, cartão ou boleto"],
                    ["4", "Ativação assistida", "Equipe valida e libera o acesso"],
                  ].map(([step, title, text]) => (
                    <div key={step} className="flex gap-4 rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2ABFAB]/12 text-sm font-black text-[#13796D]">
                        {step}
                      </span>
                      <div>
                        <p className="font-black text-[#132B57]">{title}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-8 left-1/2 h-16 w-[78%] -translate-x-1/2 rounded-full bg-[#2ABFAB]/20 blur-3xl" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        <CheckoutForm initialPlan={initialPlan} paymentMethodRules={rules} />
      </section>
    </main>
  );
}

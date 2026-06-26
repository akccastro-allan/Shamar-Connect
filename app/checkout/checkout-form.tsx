"use client";

import { useMemo, useState } from "react";

type PaymentMethod = "pix" | "credit_card" | "boleto";

type PaymentMethodRule = {
  payment_method: PaymentMethod;
  enabled: boolean;
  display_order: number;
  is_recommended: boolean;
  fixed_fee_cents: number;
  percentage_fee: number;
  description: string;
};

type AddonSlug =
  | "ai_assist"
  | "transcription_start"
  | "transcription_volume"
  | "call_recording_100h"
  | "call_recording_500h"
  | "call_recording_1000h"
  | "storage_10gb"
  | "storage_50gb"
  | "storage_100gb"
  | "agent_local";

type Addon = {
  slug: AddonSlug;
  name: string;
  description: string;
  price: number;
  businessPrice?: number;
  note?: string;
};

const planLabels: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  business: "Business",
};

const planPrices: Record<string, string> = {
  starter: "R$ 149/mês + R$ 297 implantação",
  professional: "R$ 297/mês + R$ 497 implantação",
  business: "R$ 597/mês + R$ 997 implantação",
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: "PIX",
  credit_card: "Cartão de crédito",
  boleto: "Boleto bancário",
};

const ADDONS: Addon[] = [
  {
    slug: "ai_assist",
    name: "IA assistiva",
    description: "Apoio com sugestões, organização e recursos inteligentes, sempre com humano no controle.",
    price: 79.9,
    note: "Não é o Shamar Agent local.",
  },
  {
    slug: "transcription_start",
    name: "Transcrição Start",
    description: "Transcrição sob demanda de áudios recebidos no atendimento, até 1.000 min/mês.",
    price: 29,
    businessPrice: 24,
  },
  {
    slug: "transcription_volume",
    name: "Transcrição Volume",
    description: "Pacote para operações com muito áudio, até 10.000 min/mês.",
    price: 449,
    businessPrice: 399,
  },
  {
    slug: "call_recording_100h",
    name: "Gravação 100h",
    description: "Gravação opcional de ligações para conferência, auditoria e treinamento.",
    price: 79,
    businessPrice: 59,
  },
  {
    slug: "call_recording_500h",
    name: "Gravação 500h",
    description: "Pacote intermediário de gravação de chamadas.",
    price: 249,
    businessPrice: 199,
  },
  {
    slug: "call_recording_1000h",
    name: "Gravação 1.000h",
    description: "Pacote avançado de gravação de chamadas.",
    price: 399,
    businessPrice: 349,
  },
  {
    slug: "storage_10gb",
    name: "Armazenamento +10 GB",
    description: "Espaço adicional para mídias, documentos, áudios e gravações.",
    price: 29,
  },
  {
    slug: "storage_50gb",
    name: "Armazenamento +50 GB",
    description: "Mais retenção e maior volume de mídia.",
    price: 119,
  },
  {
    slug: "storage_100gb",
    name: "Armazenamento +100 GB",
    description: "Para alto volume, retenção longa e gravações.",
    price: 199,
  },
  {
    slug: "agent_local",
    name: "Shamar Agent Local",
    description: "Conector local para buscar dados autorizados nos sistemas internos do cliente.",
    price: 149,
    note: "Instalação/integração pode exigir diagnóstico separado.",
  },
];

type CheckoutFormProps = {
  initialPlan: string;
  paymentMethodRules: PaymentMethodRule[];
};

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function getAddonPrice(addon: Addon, planSlug: string) {
  if (planSlug === "business" && typeof addon.businessPrice === "number") return addon.businessPrice;
  return addon.price;
}

export function CheckoutForm({ initialPlan, paymentMethodRules }: CheckoutFormProps) {
  const [planSlug, setPlanSlug] = useState(initialPlan);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerDocument, setCustomerDocument] = useState("");
  const [extraWhatsappConnections, setExtraWhatsappConnections] = useState(0);
  const [extraUsers, setExtraUsers] = useState(0);
  const [selectedAddons, setSelectedAddons] = useState<AddonSlug[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const enabledMethods = useMemo(
    () => [...paymentMethodRules].filter((r) => r.enabled).sort((a, b) => a.display_order - b.display_order),
    [paymentMethodRules],
  );

  const summary = useMemo(() => {
    const basePrices: Record<string, number> = { starter: 149, professional: 297, business: 597 };
    const setupPrices: Record<string, number> = { starter: 297, professional: 497, business: 997 };
    const extraWhatsappPrices: Record<string, number> = { starter: 79, professional: 97, business: 127 };
    const extraUserPrices: Record<string, number> = { starter: 29, professional: 39, business: 49 };

    const base = billingCycle === "annual" ? basePrices[planSlug] * 10 : basePrices[planSlug];
    const setup = setupPrices[planSlug];
    const whatsapp = extraWhatsappConnections * extraWhatsappPrices[planSlug];
    const users = extraUsers * extraUserPrices[planSlug];
    const addonItems = ADDONS
      .filter((addon) => selectedAddons.includes(addon.slug))
      .map((addon) => ({ ...addon, selectedPrice: getAddonPrice(addon, planSlug) }));
    const addons = addonItems.reduce((total, addon) => total + addon.selectedPrice, 0);
    const subtotal = money(base + setup + whatsapp + users + addons);

    const rule = enabledMethods.find((r) => r.payment_method === paymentMethod);
    const fixedFee = rule ? money(rule.fixed_fee_cents / 100) : 0;
    const percentageFee = rule ? money(subtotal * Number(rule.percentage_fee || 0)) : 0;
    const fee = money(fixedFee + percentageFee);
    const total = money(subtotal + fee);

    return { base, setup, whatsapp, users, addonItems, addons, subtotal, fee, total };
  }, [billingCycle, extraUsers, extraWhatsappConnections, planSlug, paymentMethod, enabledMethods, selectedAddons]);

  function toggleAddon(slug: AddonSlug) {
    setSelectedAddons((current) => {
      if (current.includes(slug)) return current.filter((item) => item !== slug);
      return [...current, slug];
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!acceptedTerms) {
      setStatus("error");
      setError("Você precisa aceitar os Termos de Uso e a Política de Cancelamento antes de continuar.");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/checkout/asaas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planSlug,
          billingCycle,
          paymentMethod,
          customerName,
          customerEmail,
          customerPhone,
          customerDocument,
          extraWhatsappConnections,
          extraUsers,
          selectedAddons: summary.addonItems.map((addon) => ({
            slug: addon.slug,
            name: addon.name,
            price: addon.selectedPrice,
          })),
          aiAddonEnabled: selectedAddons.includes("ai_assist"),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.paymentUrl) {
        throw new Error(data?.error || "Não foi possível gerar o checkout.");
      }

      window.location.href = data.paymentUrl;
    } catch (checkoutError) {
      setStatus("error");
      setError(checkoutError instanceof Error ? checkoutError.message : "Erro ao gerar checkout.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h2 className="text-2xl font-black text-[#1B2F5B]">Dados da contratação</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Informe os dados do responsável financeiro. O pagamento será processado pelo Asaas.
        </p>

        <div className="mt-8 grid gap-5">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Plano
            <select value={planSlug} onChange={(event) => setPlanSlug(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900">
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="business">Business</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Ciclo de cobrança
            <select value={billingCycle} onChange={(event) => setBillingCycle(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900">
              <option value="monthly">Mensal</option>
              <option value="annual">Anual com 2 mensalidades de desconto</option>
            </select>
          </label>

          <div className="grid gap-2">
            <p className="text-sm font-bold text-slate-700">Forma de pagamento</p>
            <div className="grid gap-3">
              {enabledMethods.map((rule) => {
                const selected = paymentMethod === rule.payment_method;
                return (
                  <label
                    key={rule.payment_method}
                    className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${
                      selected
                        ? "border-[#2ABFAB] bg-[#2ABFAB]/5"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={rule.payment_method}
                      checked={selected}
                      onChange={() => setPaymentMethod(rule.payment_method)}
                      className="mt-1 accent-[#2ABFAB]"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-slate-800">{METHOD_LABEL[rule.payment_method]}</span>
                        {rule.is_recommended ? (
                          <span className="rounded-full bg-[#2ABFAB]/15 px-2.5 py-0.5 text-xs font-black text-[#13796D]">
                            Recomendado
                          </span>
                        ) : null}
                        {rule.fixed_fee_cents > 0 ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                            + R$ {(rule.fixed_fee_cents / 100).toFixed(2).replace(".", ",")} de custo operacional
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{rule.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Nome/Razão social
            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900" placeholder="Nome da empresa ou responsável" />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            E-mail financeiro
            <input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} required className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900" placeholder="financeiro@empresa.com.br" />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Telefone/WhatsApp
              <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900" placeholder="(21) 99999-9999" />
            </label>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              CPF/CNPJ
              <input value={customerDocument} onChange={(event) => setCustomerDocument(event.target.value)} required className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900" placeholder="00.000.000/0001-00" />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              WhatsApps extras
              <input type="number" min="0" value={extraWhatsappConnections} onChange={(event) => setExtraWhatsappConnections(Number(event.target.value || 0))} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900" />
            </label>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Usuários extras
              <input type="number" min="0" value={extraUsers} onChange={(event) => setExtraUsers(Number(event.target.value || 0))} className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900" />
            </label>
          </div>

          <div className="grid gap-3">
            <div>
              <h3 className="text-base font-black text-[#1B2F5B]">Adicionais</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Selecione o que o cliente quer contratar junto com o plano. Integrações complexas podem exigir diagnóstico separado.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {ADDONS.map((addon) => {
                const selected = selectedAddons.includes(addon.slug);
                const price = getAddonPrice(addon, planSlug);
                return (
                  <label
                    key={addon.slug}
                    className={
                      selected
                        ? "cursor-pointer rounded-2xl border-2 border-[#2ABFAB] bg-[#2ABFAB]/5 p-4"
                        : "cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-[#2ABFAB]/40"
                    }
                  >
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={selected} onChange={() => toggleAddon(addon.slug)} className="mt-1 accent-[#2ABFAB]" />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-[#1B2F5B]">{addon.name}</span>
                          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-[#13796D]">
                            R$ {price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-600">{addon.description}</p>
                        {addon.note ? <p className="mt-2 text-xs font-bold text-[#8A5D12]">{addon.note}</p> : null}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-[#C9952A]/20 bg-[#FFF7E8] p-4 text-sm font-semibold text-[#8A5D12]">
            <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-1" />
            Li e aceito os Termos de Uso, a Política de Privacidade e a Política de Cancelamento e Reembolso do ShamarConnect.
          </label>

          {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
        </div>
      </div>

      <aside className="h-fit rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#C9952A]">Resumo</p>
        <h2 className="mt-3 text-3xl font-black text-[#1B2F5B]">{planLabels[planSlug]}</h2>
        <p className="mt-2 text-sm font-bold text-slate-500">{planPrices[planSlug]}</p>

        <div className="mt-8 space-y-4 text-sm text-slate-700">
          <div className="flex justify-between gap-4"><span>Plano</span><strong>R$ {summary.base.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
          <div className="flex justify-between gap-4"><span>Implantação</span><strong>R$ {summary.setup.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
          <div className="flex justify-between gap-4"><span>WhatsApps extras</span><strong>R$ {summary.whatsapp.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
          <div className="flex justify-between gap-4"><span>Usuários extras</span><strong>R$ {summary.users.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
          {summary.addonItems.length > 0 ? (
            <div className="border-t border-slate-100 pt-4">
              <p className="mb-3 font-black text-[#1B2F5B]">Adicionais</p>
              <div className="space-y-3">
                {summary.addonItems.map((addon) => (
                  <div key={addon.slug} className="flex justify-between gap-4">
                    <span>{addon.name}</span>
                    <strong>R$ {addon.selectedPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-t border-slate-100 pt-4"><span>Subtotal</span><strong>R$ {summary.subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
          {summary.fee > 0 ? (
            <div className="flex justify-between gap-4 text-amber-700">
              <span>Custo operacional ({METHOD_LABEL[paymentMethod]})</span>
              <strong>R$ {summary.fee.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
            </div>
          ) : null}
        </div>

        <div className="mt-8 rounded-3xl bg-slate-50 p-5">
          <p className="text-sm font-bold text-slate-500">Total a pagar</p>
          <p className="mt-2 text-4xl font-black text-[#1B2F5B]">R$ {summary.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="mt-2 text-xs text-slate-500">via {METHOD_LABEL[paymentMethod]}</p>
        </div>

        <button disabled={status === "loading"} className="mt-7 w-full rounded-2xl bg-[#2ABFAB] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60">
          {status === "loading" ? "Gerando checkout..." : "Ir para pagamento seguro"}
        </button>

        <p className="mt-5 text-xs leading-5 text-slate-500">
          O pagamento é processado pelo Asaas. A ativação da conta depende da confirmação de pagamento e implantação assistida.
        </p>
      </aside>
    </form>
  );
}

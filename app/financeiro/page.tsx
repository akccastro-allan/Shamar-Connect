import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

const PLAN_PRICES = {
  starter: 149,
  professional: 297,
  business: 597,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function inferPlan(name?: string | null) {
  const normalized = String(name || "").toLowerCase();
  if (normalized.includes("shamar") || normalized.includes("oriah") || normalized.includes("shalom")) return "business";
  if (normalized.includes("lips") || normalized.includes("roça") || normalized.includes("trilhas")) return "professional";
  return "starter";
}

export default async function FinanceiroPage() {
  const db = createSupabaseWriteClient();

  const [organizationsResult, endpointsResult] = await Promise.all([
    db.from("organizations").select("id, name, status, created_at, whatsapp_phone").order("name", { ascending: true }),
    db.from("inbound_webhook_endpoints").select("id, endpoint_key, provider, status, is_active, config").eq("provider", "railway_whatsapp_web"),
  ]);

  const organizations = organizationsResult.data || [];
  const endpoints = endpointsResult.data || [];
  const activeOrganizations = organizations.filter((item) => item.status === "active");

  const financeRows = activeOrganizations.map((org) => {
    const endpoint = endpoints.find((item) => item.config?.organization_id === org.id || item.config?.organizationId === org.id);
    const plan = inferPlan(org.name);
    const planPrice = PLAN_PRICES[plan as keyof typeof PLAN_PRICES];
    const includedConnections = plan === "business" ? 2 : 1;
    const activeConnections = endpoint?.is_active ? 1 : 0;
    const extraConnections = Math.max(activeConnections - includedConnections, 0);
    const extraConnectionPrice = plan === "starter" ? 79 : plan === "professional" ? 97 : 127;
    const monthlyValue = planPrice + extraConnections * extraConnectionPrice;

    return {
      ...org,
      plan,
      planPrice,
      activeConnections,
      includedConnections,
      extraConnections,
      monthlyValue,
      endpointKey: endpoint?.endpoint_key || "pendente",
      billingStatus: endpoint?.is_active ? "Ativo" : "Pendente",
    };
  });

  const mrr = financeRows.reduce((sum, row) => sum + row.monthlyValue, 0);
  const activeConnections = financeRows.reduce((sum, row) => sum + row.activeConnections, 0);
  const setupEstimate = financeRows.length * 497;
  const annualProjection = mrr * 12;

  const cards = [
    { label: "Receita mensal estimada", value: formatCurrency(mrr), hint: "MRR preliminar por plano" },
    { label: "Receita anual projetada", value: formatCurrency(annualProjection), hint: "Sem churn e sem upgrade" },
    { label: "Implantação estimada", value: formatCurrency(setupEstimate), hint: "Base média de R$ 497" },
    { label: "Conexões WhatsApp", value: String(activeConnections), hint: "Sessões ativas estimadas" },
  ];

  return (
    <AppShell active="financeiro">
      <PageHeader
        title="Financeiro"
        description="Controle de planos, conexões WhatsApp, mensalidades, implantação e previsão de receita do ShamarConnect."
        badge="Gestão"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">{card.label}</p>
            <p className="mt-3 text-3xl font-black text-[#1B2F5B]">{card.value}</p>
            <p className="mt-2 text-xs font-semibold text-slate-400">{card.hint}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#1B2F5B]">Clientes e cobrança</h2>
            <p className="mt-1 text-sm text-slate-500">Primeira visão financeira. Na próxima etapa, esses valores viram contratos, cobranças e faturas reais.</p>
          </div>
          <span className="rounded-full bg-[#2ABFAB]/10 px-4 py-2 text-xs font-black text-[#168c7d]">{financeRows.length} clientes ativos</span>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Mensalidade</th>
                <th className="px-4 py-3">Conexões</th>
                <th className="px-4 py-3">Endpoint</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {financeRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-bold text-slate-700">{row.name}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{row.plan}</td>
                  <td className="px-4 py-3 font-black text-[#1B2F5B]">{formatCurrency(row.monthlyValue)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.activeConnections}/{row.includedConnections} incluída(s)
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.endpointKey}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                      {row.billingStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        {[
          { title: "Starter", price: "R$ 149/mês", items: ["1 WhatsApp", "2 usuários", "Histórico permanente", "Respostas rápidas"] },
          { title: "Professional", price: "R$ 297/mês", items: ["1 WhatsApp", "5 usuários", "Kanban", "Exportações e métricas"] },
          { title: "Business", price: "R$ 597/mês", items: ["2 WhatsApps", "10 usuários", "Shamar Agent", "Relatórios avançados"] },
        ].map((plan) => (
          <div key={plan.title} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-[#1B2F5B]">{plan.title}</h3>
            <p className="mt-2 text-2xl font-black text-[#2ABFAB]">{plan.price}</p>
            <div className="mt-5 space-y-2">
              {plan.items.map((item) => (
                <p key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">{item}</p>
              ))}
            </div>
          </div>
        ))}
      </section>
    </AppShell>
  );
}

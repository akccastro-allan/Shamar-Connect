import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default async function AdminPage() {
  try {
    const context = await getRequiredAppContext();
    if (!context.isPlatformTenant) redirect("/dashboard");
  } catch (err) {
    if (isUnauthorizedError(err)) redirect("/login");
    throw err;
  }

  const db = createSupabaseWriteClient();

  const [organizationsResult, usersResult, endpointsResult, messagesResult] = await Promise.all([
    db.from("organizations").select("id, name, status, created_at", { count: "exact", head: false }).order("created_at", { ascending: false }).limit(8),
    db.from("app_users").select("id, name, email, status, created_at", { count: "exact", head: false }).order("created_at", { ascending: false }).limit(8),
    db.from("inbound_webhook_endpoints").select("id, endpoint_key, provider, status, is_active", { count: "exact", head: false }).eq("provider", "railway_whatsapp_web"),
    db.from("whatsapp_messages").select("id", { count: "exact", head: true }),
  ]);

  const activeClients = (organizationsResult.data || []).filter((item) => item.status === "active").length;
  const totalClients = organizationsResult.count || 0;
  const totalUsers = usersResult.count || 0;
  const totalEndpoints = endpointsResult.count || 0;
  const activeEndpoints = (endpointsResult.data || []).filter((item) => item.status === "active" && item.is_active).length;
  const totalMessages = messagesResult.count || 0;
  const estimatedMrr = activeClients * 297;

  const cards = [
    { label: "Clientes cadastrados", value: String(totalClients), hint: `${activeClients} ativos` },
    { label: "Usuários", value: String(totalUsers), hint: "Contas liberadas no sistema" },
    { label: "Conexões WhatsApp", value: String(totalEndpoints), hint: `${activeEndpoints} endpoints ativos` },
    { label: "MRR estimado", value: formatCurrency(estimatedMrr), hint: "Base preliminar pelo plano médio" },
  ];

  return (
    <AppShell active="admin">
      <PageHeader
        title="Administração"
        description="Área interna da Moriah Systems para controlar clientes, conexões, usuários, planos e operação do ShamarConnect."
        badge="Admin"
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

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-[#1B2F5B]">Clientes recentes</h2>
              <p className="mt-1 text-sm text-slate-500">Empresas cadastradas no ecossistema.</p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(organizationsResult.data || []).map((client) => (
                  <tr key={client.id}>
                    <td className="px-4 py-3 font-bold text-slate-700">{client.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        {client.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {client.created_at ? new Date(client.created_at).toLocaleDateString("pt-BR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-[#1B2F5B]">Checklist administrativo</h2>
          <div className="mt-5 space-y-3">
            {[
              "Criar cadastro financeiro por cliente",
              "Definir plano contratado e valor mensal",
              "Vincular conexão WhatsApp ao cliente",
              "Controlar vencimento e inadimplência",
              "Bloquear recursos premium quando necessário",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

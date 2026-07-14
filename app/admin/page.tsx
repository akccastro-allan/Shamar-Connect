import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

function formatDateTime(value?: string | null) {
  if (!value) return "Sem atividade";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClass(status?: string | null) {
  if (status === "active") return "bg-emerald-50 text-emerald-700";
  if (status === "paused" || status === "pending") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

export default async function AdminPage() {
  const db = createSupabaseWriteClient();

  const [organizationsResult, channelsResult, tenantUsersResult, conversationsResult, catalogResult, flowsResult] = await Promise.all([
    db.from("organizations").select("id, tenant_id, name, status, created_at", { count: "exact", head: false }).order("name", { ascending: true }),
    db.from("channels").select("id, organization_id, display_name, provider, provider_type, session_id, status, active, updated_at"),
    db.from("tenant_users").select("id, organization_id, role, status"),
    db.from("whatsapp_conversations").select("organization_id, last_message_at, updated_at").order("updated_at", { ascending: false }).limit(1000),
    db.from("catalog_items").select("organization_id, status").limit(5000),
    db.from("conversation_flows").select("organization_id, status"),
  ]);

  const organizations = organizationsResult.data || [];
  const channels = channelsResult.data || [];
  const tenantUsers = tenantUsersResult.data || [];
  const conversations = conversationsResult.data || [];
  const catalogItems = catalogResult.data || [];
  const flows = flowsResult.data || [];

  const latestActivityByOrg = new Map<string, string>();
  for (const conversation of conversations) {
    const organizationId = conversation.organization_id;
    const activityAt = conversation.last_message_at || conversation.updated_at;
    if (organizationId && activityAt && !latestActivityByOrg.has(organizationId)) {
      latestActivityByOrg.set(organizationId, activityAt);
    }
  }

  const rows = organizations.map((org) => {
    const orgChannels = channels.filter((channel) => channel.organization_id === org.id);
    const primaryChannel = orgChannels[0];
    const activeUsers = tenantUsers.filter((user) => user.organization_id === org.id && user.status === "active").length;
    const activeCatalogItems = catalogItems.filter((item) => item.organization_id === org.id && item.status === "active").length;
    const activeFlows = flows.filter((flow) => flow.organization_id === org.id && flow.status === "active").length;

    return {
      ...org,
      activeUsers,
      activeCatalogItems,
      activeFlows,
      channelCount: orgChannels.length,
      channelLabel: primaryChannel?.display_name || primaryChannel?.session_id || "Sem canal",
      provider: primaryChannel?.provider || "—",
      providerType: primaryChannel?.provider_type || "—",
      sessionId: primaryChannel?.session_id || "—",
      channelStatus: primaryChannel?.active ? primaryChannel?.status || "active" : "inactive",
      lastActivityAt: latestActivityByOrg.get(org.id) || null,
    };
  });

  const cards = [
    { label: "Clientes", value: String(organizations.length), hint: `${rows.filter((row) => row.status === "active").length} ativos` },
    { label: "Canais WhatsApp", value: String(channels.length), hint: `${channels.filter((channel) => channel.active).length} ativos` },
    { label: "Usuários ativos", value: String(tenantUsers.filter((user) => user.status === "active").length), hint: "Todos os clientes" },
    { label: "Automações", value: String(flows.filter((flow) => flow.status === "active").length), hint: "Fluxos ativos" },
  ];

  return (
    <AppShell active="admin">
      <PageHeader
        title="Administração Shamar Connect"
        description="Área interna para gerenciar clientes, canais WhatsApp, implantação e operação da plataforma."
        badge="Uso interno"
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
            <h2 className="text-lg font-black text-[#1B2F5B]">Clientes e canais</h2>
            <p className="mt-1 text-sm text-slate-500">Visão administrativa da Moriah. Clientes comuns não acessam esta área.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/commercial-agent/lips/evaluation" className="inline-flex rounded-full bg-[#2ABFAB] px-5 py-2.5 text-sm font-black text-white">
              Avaliar agente Lips
            </Link>
            <Link href="/admin/implantacao" className="inline-flex rounded-full bg-[#1B2F5B] px-5 py-2.5 text-sm font-black text-white">
              Implantação
            </Link>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Sessão</th>
                <th className="px-4 py-3">Automação</th>
                <th className="px-4 py-3">Catálogo</th>
                <th className="px-4 py-3">Última atividade</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((client) => (
                <tr key={client.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-800">{client.name}</p>
                    <p className="text-xs text-slate-400">{client.activeUsers} usuário(s) ativo(s)</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(client.status)}`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">A definir</td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-700">{client.channelLabel}</p>
                    <p className="text-xs text-slate-400">{client.channelCount} canal(is)</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <p>{client.provider}</p>
                    <p className="text-xs text-slate-400">{client.providerType}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{client.sessionId}</td>
                  <td className="px-4 py-3 text-slate-600">{client.activeFlows} ativa(s)</td>
                  <td className="px-4 py-3 text-slate-600">{client.activeCatalogItems} item(ns)</td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(client.lastActivityAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href="/whatsapp-messages" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-[#1B2F5B]">Inbox</Link>
                      <Link href="/settings/whatsapp" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-[#1B2F5B]">WhatsApp</Link>
                      <Link href="/admin/implantacao" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-[#1B2F5B]">Implantação</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-slate-50 p-6 text-sm font-bold text-slate-500">
            Nenhum cliente cadastrado ainda.
          </div>
        ) : null}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-[#1B2F5B]">Escopo desta administração</h2>
              <p className="mt-1 text-sm text-slate-500">Administração da plataforma Shamar Connect, separada do Centro de Comando Allan/Moriah.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {["Tenants e organizações", "Canais e providers", "Usuários e permissões", "Implantação e status", "Catálogo e automações", "Saúde operacional"].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                {item}
              </div>
            ))}
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

import Link from "next/link";
import { commandCenterOperations, LIPS_CHANNEL_ID, LIPS_SESSION_ID } from "@/lib/admin/command-center-config";
import { isLipsChannelValidated, type LipsLiveStatus } from "@/lib/admin/command-center-data";
import { MetaReadinessCard } from "@/components/admin/command-center/meta-readiness-card";
import { OperationCard } from "@/components/admin/command-center/operation-card";

type CommandCenterDashboardProps = {
  lips: LipsLiveStatus;
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function preview(value?: string | null, size = 88) {
  if (!value) return "Sem texto";
  return value.length > size ? `${value.slice(0, size)}...` : value;
}

function pillClass(status?: string | null) {
  if (status === "processed" || status === "sent" || status === "completed" || status === "OK") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "error" || status === "failed" || status === "Atenção") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "warning" | "danger" }) {
  const toneClass = tone === "danger" ? "text-red-700" : tone === "warning" ? "text-amber-700" : "text-[#1B2F5B]";
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-3 text-3xl font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function DataPanel<T>({
  title,
  error,
  rows,
  empty,
  renderRow,
}: {
  title: string;
  error: string | null;
  rows: T[];
  empty: string;
  renderRow: (row: T) => React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black text-[#1B2F5B]">{title}</h3>
        {error && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Indisponível</span>}
      </div>
      {error ? <p className="mt-3 text-sm text-slate-500">Não foi possível carregar estes dados agora.</p> : null}
      {!error && rows.length === 0 ? <p className="mt-3 text-sm text-slate-500">{empty}</p> : null}
      {!error && rows.length > 0 ? <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100">{rows.map(renderRow)}</div> : null}
    </div>
  );
}

export function CommandCenterDashboard({ lips }: CommandCenterDashboardProps) {
  const channelValidated = isLipsChannelValidated(lips.channel);
  const connectedChannels = lips.channel?.is_active ? 1 : 0;
  const criticalAlerts = (lips.gateway.online ? 0 : 1) + lips.errorJobs + (channelValidated ? 0 : 1);
  const lastOutbound = lips.lastMessages.find((message) => message.direction === "outbound");
  const lastEvent = lips.lastProviderEvents[0];

  return (
    <div className="space-y-10">
      <header className="rounded-[2rem] bg-[#1B2F5B] p-8 text-white shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2ABFAB]">Operação Allan / Moriah</p>
        <h1 className="mt-3 text-3xl font-black md:text-4xl">Centro de Comando</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-200">
          Visão operacional da Moriah Systems, produtos Shamar, operações próprias e clientes.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/inbox" className="rounded-full bg-[#2ABFAB] px-5 py-3 text-sm font-black text-white hover:bg-[#229d8e]">Abrir atendimento</Link>
          <Link href="/settings/whatsapp" className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10">WhatsApp Conectado</Link>
          <Link href="/settings/whatsapp-cloud" className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10">WhatsApp Oficial</Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <SummaryCard label="Empresas próprias" value={commandCenterOperations.ownOperations.length} />
        <SummaryCard label="Produtos ativos" value="1" />
        <SummaryCard label="Clientes ativos" value="1" />
        <SummaryCard label="Canais conectados" value={connectedChannels} />
        <SummaryCard label="Conversas abertas" value={lips.pendingConversations} tone={lips.pendingConversations > 0 ? "warning" : "default"} />
        <SummaryCard label="Pendências humanas" value={lips.pendingConversations} tone={lips.pendingConversations > 0 ? "warning" : "default"} />
        <SummaryCard label="Alertas críticos" value={criticalAlerts} tone={criticalAlerts > 0 ? "danger" : "default"} />
      </section>

      <section>
        <SectionTitle title="Empresas e Operações Próprias" description="Moriah, operações do Allan e estruturas próprias. Clientes não entram aqui." />
        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {commandCenterOperations.ownOperations.map((item) => (
            <OperationCard
              key={item.name}
              name={item.name}
              type={item.type}
              status={item.status}
              description={item.description}
              functionLabel={item.function}
              channel={item.channel}
              href={item.href}
              configHref={item.configHref}
              stats={[{ label: "Pendências", value: item.status === "active" ? "0" : "A configurar" }]}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="Produtos Moriah/Shamar" description="Produtos próprios da Moriah/Shamar. A Lips usa Shamar Connect como cliente." />
        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {commandCenterOperations.products.map((item) => (
            <OperationCard
              key={item.name}
              name={item.name}
              type={item.type}
              status={item.status}
              description={item.description}
              functionLabel={item.function}
              href={item.href}
              stats={[
                { label: "Ambiente", value: item.environment },
                { label: "Prioridade", value: item.priority },
              ]}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="Clientes Shamar Connect" description="Clientes atendidos pelo produto Shamar Connect. A Lips é cliente, não operação própria." />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <OperationCard
            name="Lips"
            type="Cliente Shamar Connect"
            status="go_live"
            description="Cliente ativo em go-live com WhatsApp Conectado / OpenWA, fila, auto-resposta por regra, catálogo consultivo, consulta de preço e handoff humano."
            functionLabel="Autopeças atendida pelo Shamar Connect"
            channel={lips.gateway.online ? "WhatsApp Conectado / OpenWA" : "OpenWA com atenção"}
            href="/inbox"
            configHref="/settings/whatsapp"
            stats={[
              { label: "Mensagens 24h", value: lips.messages24h },
              { label: "Fila", value: lips.pendingConversations },
              { label: "Jobs pend.", value: lips.pendingJobs },
              { label: "Erros", value: lips.errorJobs },
            ]}
          />
          <OperationCard
            name="Futuros clientes"
            type="Clientes Shamar Connect"
            status="pending_setup"
            description="Igrejas, clínicas, autopeças e negócios locais aguardando implantação."
            functionLabel="Clientes atendidos pelo Shamar Connect"
            channel="A definir por cliente"
            href="/admin/implantacao"
            configHref="/admin/clients"
            stats={[{ label: "Status", value: "Aguardando implantação" }]}
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-[#C9952A]">Cliente Shamar Connect / Go-live</p>
            <h2 className="mt-1 text-2xl font-black text-[#1B2F5B]">Lips Live</h2>
            <p className="mt-2 text-sm text-slate-500">Dados reais server-side da operação Lips, sem expor service role no client.</p>
          </div>
          <span className={`w-fit rounded-full border px-4 py-2 text-xs font-black ${pillClass(channelValidated && lips.gateway.online ? "OK" : "Atenção")}`}>
            {channelValidated && lips.gateway.online ? "OK" : "Atenção"}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Provider" value={lips.channel?.provider || "—"} />
          <SummaryCard label="Session" value={lips.channel?.session_id || LIPS_SESSION_ID} />
          <SummaryCard label="Channel ID" value={lips.channel?.id === LIPS_CHANNEL_ID ? "validado" : "verificar"} tone={lips.channel?.id === LIPS_CHANNEL_ID ? "default" : "warning"} />
          <SummaryCard label="Gateway" value={lips.gateway.online ? lips.gateway.status : "atenção"} tone={lips.gateway.online ? "default" : "danger"} />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="font-black text-slate-800">Canal</p>
            <div className="mt-3 space-y-2 text-slate-600">
              <p>provider_type: <strong>{lips.channel?.provider_type || "—"}</strong></p>
              <p>slug: <strong>{lips.channel?.slug || "—"}</strong></p>
              <p>ativo no banco: <strong>{lips.channel?.is_active ? "sim" : "não"}</strong></p>
              <p>último evento: <strong>{formatDateTime(lastEvent?.created_at)}</strong></p>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="font-black text-slate-800">Fila</p>
            <div className="mt-3 space-y-2 text-slate-600">
              <p>pendências humanas: <strong>{lips.pendingConversations}</strong></p>
              <p>último atendimento: <strong>{formatDateTime(lips.lastConversationAt)}</strong></p>
              <p>última resposta enviada: <strong>{formatDateTime(lastOutbound?.created_at)}</strong></p>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="font-black text-slate-800">Automação segura</p>
            <div className="mt-3 space-y-2 text-slate-600">
              <p>auto-resposta por regra: <strong>ativa</strong></p>
              <p>catálogo consultivo: <strong>ativo</strong></p>
              <p>cooldown: <strong>{lips.lastCooldowns[0] ? formatDateTime(lips.lastCooldowns[0].last_automated_response_at) : "sem registro recente"}</strong></p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <DataPanel
          title="Últimas mensagens Lips"
          error={lips.messagesError}
          rows={lips.lastMessages}
          empty="Nenhuma mensagem recente."
          renderRow={(row) => (
            <div key={row.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-black text-slate-700">{row.direction || "—"}</span>
                <span className="text-xs text-slate-400">{formatDateTime(row.created_at)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{preview(row.body)}</p>
            </div>
          )}
        />
        <DataPanel
          title="Últimos jobs"
          error={lips.jobsError}
          rows={lips.lastAutomationJobs}
          empty="Nenhum job recente."
          renderRow={(row) => (
            <div key={row.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${pillClass(row.status)}`}>{row.status || "—"}</span>
                <span className="text-xs text-slate-400">{formatDateTime(row.created_at)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{row.response_type || row.agent_type || "Sem tipo"}</p>
              {row.error_message && <p className="mt-1 text-xs font-bold text-red-600">{preview(row.error_message)}</p>}
            </div>
          )}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <DataPanel
          title="Últimos eventos OpenWA"
          error={lips.providerEventsError}
          rows={lips.lastProviderEvents}
          empty="Nenhum evento OpenWA recente."
          renderRow={(row) => (
            <div key={row.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${pillClass(row.processing_status)}`}>{row.processing_status || "—"}</span>
                <span className="text-xs text-slate-400">{formatDateTime(row.created_at)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{preview(row.external_event_id, 64)}</p>
            </div>
          )}
        />
        <DataPanel
          title="Últimos cooldowns"
          error={lips.cooldownError}
          rows={lips.lastCooldowns}
          empty="Nenhum cooldown recente."
          renderRow={(row) => (
            <div key={row.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-black text-slate-700">Auto-resposta registrada</span>
                <span className="text-xs text-slate-400">{formatDateTime(row.last_automated_response_at)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{preview(row.last_response_text)}</p>
            </div>
          )}
        />
      </section>

      <MetaReadinessCard />
    </div>
  );
}

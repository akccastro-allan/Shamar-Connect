import Link from "next/link";
import {
  channelCatalog,
  channelRoadmap,
  commandCenterEntities,
  LIPS_CHANNEL_ID,
  LIPS_SESSION_ID,
  statusLabel,
  type ChannelKey,
  type CommandCenterStatus,
} from "@/lib/admin/command-center-config";
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
  if (status === "processed" || status === "sent" || status === "completed" || status === "OK" || status === "em uso") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "error" || status === "failed" || status === "Atenção") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (status === "em preparação" || status === "planejado") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function statusTone(status: CommandCenterStatus) {
  if (status === "active" || status === "production_initial" || status === "go_live") return "default";
  if (status === "development" || status === "official_whatsapp_preparation") return "warning";
  return "muted";
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "warning" | "danger" | "muted" }) {
  const toneClass = tone === "danger" ? "text-red-700" : tone === "warning" ? "text-amber-700" : tone === "muted" ? "text-slate-500" : "text-[#1B2F5B]";
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-3 text-3xl font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function ChannelPills({ channels }: { channels: ChannelKey[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {channels.map((channel) => {
        const item = channelCatalog[channel];
        return (
          <span key={channel} className={`rounded-full border px-3 py-1 text-xs font-black ${pillClass(item.status === "in_use" ? "em uso" : item.status === "preparation" ? "em preparação" : item.status === "planned" ? "planejado" : "futuro")}`}>
            {item.label}
          </span>
        );
      })}
    </div>
  );
}

function InboxRow({ entity, lips }: { entity: (typeof commandCenterEntities)[number]; lips: LipsLiveStatus }) {
  const isLips = entity.name === "Lips";
  const primaryChannel = entity.channels[0] ? channelCatalog[entity.channels[0]].label : "A configurar";
  const open = isLips ? lips.pendingConversations : "—";
  const pending = isLips ? lips.pendingConversations : entity.status === "planned" ? "Planejado" : "A configurar";
  const lastMessage = isLips ? formatDateTime(lips.lastMessages[0]?.created_at) : "—";

  return (
    <div className="grid gap-3 border-b border-slate-100 px-4 py-4 text-sm last:border-b-0 lg:grid-cols-[1.3fr_1fr_0.8fr_0.8fr_0.9fr_0.7fr] lg:items-center">
      <div>
        <p className="font-black text-[#1B2F5B]">{entity.name}</p>
        <p className="text-xs text-slate-500">{entity.type}</p>
      </div>
      <div className="text-slate-600">{primaryChannel}</div>
      <div><span className={`rounded-full border px-3 py-1 text-xs font-black ${pillClass(statusLabel(entity.status))}`}>{statusLabel(entity.status)}</span></div>
      <div className="font-bold text-slate-700">{open}</div>
      <div className="text-slate-500">{lastMessage}</div>
      <div>
        <Link href={entity.href} className="rounded-full bg-[#2ABFAB] px-4 py-2 text-xs font-black text-white hover:bg-[#229d8e]">
          Abrir inbox
        </Link>
      </div>
      <div className="lg:col-span-6">
        <p className="text-xs text-slate-500">Pendências: {pending} · Prioridade: {entity.priority}</p>
      </div>
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
  const activeAutomations = lips.channel?.is_active ? 1 : 0;
  const activeClients = 1;
  const operatingProducts = commandCenterEntities.filter((entity) => entity.group === "product" && ["production_initial", "development", "official_whatsapp_preparation"].includes(entity.status)).length;
  const criticalAlerts = (lips.gateway.online ? 0 : 1) + lips.errorJobs + (channelValidated ? 0 : 1);
  const lastOutbound = lips.lastMessages.find((message) => message.direction === "outbound");
  const lastEvent = lips.lastProviderEvents[0];
  const corporate = commandCenterEntities.filter((entity) => entity.group === "corporate");
  const ownOperations = commandCenterEntities.filter((entity) => entity.group === "own_operation");
  const products = commandCenterEntities.filter((entity) => entity.group === "product");
  const clients = commandCenterEntities.filter((entity) => entity.group === "client");

  return (
    <div className="space-y-10">
      <header className="rounded-[2rem] bg-[#1B2F5B] p-8 text-white shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2ABFAB]">Cockpit operacional Allan / Moriah</p>
        <h1 className="mt-3 text-3xl font-black md:text-4xl">Centro de Comando</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-200">
          Controle operacional da Moriah, produtos Shamar, canais, caixas de entrada e atendimentos.
        </p>
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm leading-6 text-slate-100">
          <strong>Shamar Connect</strong> é a central de comunicação, interação e atendimento da Moriah Systems: atendimento humano, automação por regra, fila, roteamento, SLA, histórico e relacionamento. IA será módulo assistivo futuro, como copiloto do atendente.
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/inbox" className="rounded-full bg-[#2ABFAB] px-5 py-3 text-sm font-black text-white hover:bg-[#229d8e]">Abrir atendimento</Link>
          <Link href="/settings/whatsapp" className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10">WhatsApp Conectado</Link>
          <Link href="/settings/whatsapp-cloud" className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10">WhatsApp Oficial</Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Canais ativos" value={connectedChannels} />
        <SummaryCard label="Caixas de entrada" value={commandCenterEntities.length} />
        <SummaryCard label="Atendimentos abertos" value={lips.pendingConversations} tone={lips.pendingConversations > 0 ? "warning" : "default"} />
        <SummaryCard label="Pendências humanas" value={lips.pendingConversations} tone={lips.pendingConversations > 0 ? "warning" : "default"} />
        <SummaryCard label="Automações ativas" value={activeAutomations} />
        <SummaryCard label="Clientes ativos" value={activeClients} />
        <SummaryCard label="Produtos em operação" value={operatingProducts} />
        <SummaryCard label="Alertas críticos" value={criticalAlerts} tone={criticalAlerts > 0 ? "danger" : "default"} />
      </section>

      <section>
        <SectionTitle title="Caixas de entrada" description="Visão omnichannel por operação, produto e cliente. Integrações planejadas aparecem sem erro." />
        <div className="mt-4 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
          <div className="hidden bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500 lg:grid lg:grid-cols-[1.3fr_1fr_0.8fr_0.8fr_0.9fr_0.7fr]">
            <span>Operação</span>
            <span>Canal principal</span>
            <span>Status</span>
            <span>Conversas</span>
            <span>Última mensagem</span>
            <span>Ação</span>
          </div>
          {commandCenterEntities.map((entity) => <InboxRow key={entity.name} entity={entity} lips={lips} />)}
        </div>
      </section>

      <section>
        <SectionTitle title="Moriah / Corporativo" description="Controle corporativo e administrativo do Allan/Moriah." />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {corporate.map((item) => (
            <OperationCard key={item.name} name={item.name} type={item.type} status={item.status} description={item.description} functionLabel={item.function} href={item.href} configHref={item.configHref} stats={[{ label: "Prioridade", value: item.priority }]} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="Operações próprias" description="Operações da Moriah/Allan que terão canais e caixas próprias." />
        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {ownOperations.map((item) => (
            <div key={item.name}>
              <OperationCard name={item.name} type={item.type} status={item.status} description={item.description} functionLabel={item.function} href={item.href} configHref={item.configHref} stats={[{ label: "Pendências", value: "A configurar" }, { label: "Prioridade", value: item.priority }]} />
              <ChannelPills channels={item.channels} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="Produtos Shamar" description="Produtos próprios. Shamar Connect é o motor de comunicação/interação." />
        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {products.map((item) => (
            <div key={item.name}>
              <OperationCard name={item.name} type={item.type} status={item.status} description={item.description} functionLabel={item.function} href={item.href} configHref={item.configHref} stats={[{ label: "Próximo passo", value: statusTone(item.status) === "default" ? "Operar e medir" : "Configurar" }, { label: "Prioridade", value: item.priority }]} />
              <ChannelPills channels={item.channels} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="Clientes" description="Clientes atendidos pelo Shamar Connect. Lips continua separada da Moriah." />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {clients.map((item) => (
            <div key={item.name}>
              <OperationCard name={item.name} type={item.name === "Lips" ? "Cliente Shamar Connect" : item.type} status={item.status} description={item.description} functionLabel={item.function} href={item.href} configHref={item.configHref} stats={item.name === "Lips" ? [{ label: "Fila", value: lips.pendingConversations }, { label: "Jobs erro", value: lips.errorJobs }] : [{ label: "Status", value: "Aguardando implantação" }]} />
              <ChannelPills channels={item.channels} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-[#C9952A]">Cliente Shamar Connect / Go-live</p>
            <h2 className="mt-1 text-2xl font-black text-[#1B2F5B]">Lips Live</h2>
            <p className="mt-2 text-sm text-slate-500">OpenWA atual, auto-resposta por regra, consulta de preços, fila e handoff humano.</p>
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
        <DataPanel title="Últimas mensagens Lips" error={lips.messagesError} rows={lips.lastMessages} empty="Nenhuma mensagem recente." renderRow={(row) => (
          <div key={row.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3"><span className="text-sm font-black text-slate-700">{row.direction || "—"}</span><span className="text-xs text-slate-400">{formatDateTime(row.created_at)}</span></div>
            <p className="mt-1 text-sm text-slate-500">{preview(row.body)}</p>
          </div>
        )} />
        <DataPanel title="Últimos jobs" error={lips.jobsError} rows={lips.lastAutomationJobs} empty="Nenhum job recente." renderRow={(row) => (
          <div key={row.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3"><span className={`rounded-full border px-3 py-1 text-xs font-black ${pillClass(row.status)}`}>{row.status || "—"}</span><span className="text-xs text-slate-400">{formatDateTime(row.created_at)}</span></div>
            <p className="mt-1 text-sm text-slate-500">{row.response_type || row.agent_type || "Sem tipo"}</p>
            {row.error_message && <p className="mt-1 text-xs font-bold text-red-600">{preview(row.error_message)}</p>}
          </div>
        )} />
      </section>

      <section>
        <SectionTitle title="Canais e integrações" description="Roadmap omnichannel do Shamar Connect como central de comunicação/interação." />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {channelRoadmap.map((channel) => (
            <div key={channel.label} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-black text-[#1B2F5B]">{channel.label}</h3><p className="mt-2 text-sm text-slate-500">{channel.description}</p></div>
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${pillClass(channel.status)}`}>{channel.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase tracking-wide text-[#C9952A]">Futuro assistivo</p>
        <h2 className="mt-1 text-2xl font-black text-[#1B2F5B]">Assistente de Atendimento</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
          A IA futura será copiloto do atendente humano: sugerir resposta, resumir conversa, identificar intenção, classificar lead, indicar urgência, recomendar próximo passo e preencher dados. Não será dona do atendimento nem responderá livremente no começo.
        </p>
      </section>

      <MetaReadinessCard />
    </div>
  );
}

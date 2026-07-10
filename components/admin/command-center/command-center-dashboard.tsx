import Link from "next/link";
import {
  channelCatalog,
  channelRoadmap,
  commandCenterEntities,
  commandCenterMode,
  statusLabel,
  type ChannelKey,
  type CommandCenterStatus,
} from "@/lib/admin/command-center-config";
import { MetaReadinessCard } from "@/components/admin/command-center/meta-readiness-card";
import { OperationCard } from "@/components/admin/command-center/operation-card";

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

function InboxRow({ entity }: { entity: (typeof commandCenterEntities)[number] }) {
  const primaryChannel = entity.channels[0] ? channelCatalog[entity.channels[0]].label : "A configurar";
  const open = entity.status === "active" || entity.status === "production_initial" ? "Interna" : "Planejada";
  const pending = entity.status === "planned" ? "Planejado" : entity.status === "active" ? "Operação interna" : "A configurar";
  const lastMessage = "—";

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

export function CommandCenterDashboard() {
  const channelKeys = commandCenterEntities.flatMap((entity) => entity.channels);
  const connectedChannels = channelKeys.filter((channel) => channelCatalog[channel].status === "in_use").length;
  const plannedChannels = channelKeys.filter((channel) => ["planned", "preparation", "future"].includes(channelCatalog[channel].status)).length;
  const operatingProducts = commandCenterEntities.filter((entity) => entity.group === "product" && ["production_initial", "development", "official_whatsapp_preparation"].includes(entity.status)).length;
  const pendingInternal = commandCenterEntities.filter((entity) => ["planned", "pending_setup", "official_whatsapp_preparation"].includes(entity.status)).length;
  const criticalAlerts = 0;
  const corporate = commandCenterEntities.filter((entity) => entity.group === "corporate");
  const ownOperations = commandCenterEntities.filter((entity) => entity.group === "own_operation");
  const products = commandCenterEntities.filter((entity) => entity.group === "product");

  return (
    <div className="space-y-10">
      <header className="rounded-[2rem] bg-[#1B2F5B] p-8 text-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2ABFAB]">Cockpit operacional Allan / Moriah</p>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black text-white">Uso interno</span>
        </div>
        <h1 className="mt-3 text-3xl font-black md:text-4xl">Centro de Comando</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-200">
          Cockpit interno da Moriah para acompanhar empresas próprias, produtos, operações próprias, canais internos e caixas internas.
        </p>
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm leading-6 text-slate-100">
          <strong>Shamar Connect</strong> é o motor de comunicação, interação, atendimento, automação por regra, fila e relacionamento da Moriah. IA será módulo assistivo futuro, como copiloto do atendente.
          <br />
          Esta visão é interna da Moriah. As integrações e componentes foram organizados para possível evolução comercial futura.
          <br />
          Modo atual: comercial {commandCenterMode.commercialEnabled ? "ativo" : "desativado"} · IA {commandCenterMode.aiMode}.
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/inbox" className="rounded-full bg-[#2ABFAB] px-5 py-3 text-sm font-black text-white hover:bg-[#229d8e]">Abrir atendimento</Link>
          <Link href="/admin" className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10">Administração Shamar Connect</Link>
          <Link href="/settings/whatsapp" className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10">WhatsApp Conectado</Link>
          <Link href="/settings/whatsapp-cloud" className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10">WhatsApp Oficial</Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Empresas próprias" value={corporate.length + ownOperations.length} />
        <SummaryCard label="Produtos Moriah" value={products.length} />
        <SummaryCard label="Canais planejados" value={plannedChannels} />
        <SummaryCard label="Canais ativos" value={connectedChannels} />
        <SummaryCard label="Caixas internas" value={commandCenterEntities.length} />
        <SummaryCard label="Pendências internas" value={pendingInternal} tone={pendingInternal > 0 ? "warning" : "default"} />
        <SummaryCard label="Produtos em operação" value={operatingProducts} />
        <SummaryCard label="Alertas críticos" value={criticalAlerts} tone={criticalAlerts > 0 ? "danger" : "default"} />
      </section>

      <section>
        <SectionTitle title="Canais e caixas internas" description="Visão omnichannel por empresa, produto e operação própria do Allan/Moriah. Clientes SaaS externos ficam fora desta tela." />
        <div className="mt-4 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
          <div className="hidden bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500 lg:grid lg:grid-cols-[1.3fr_1fr_0.8fr_0.8fr_0.9fr_0.7fr]">
            <span>Operação</span>
            <span>Canal principal</span>
            <span>Status</span>
            <span>Conversas</span>
            <span>Última mensagem</span>
            <span>Ação</span>
          </div>
          {commandCenterEntities.map((entity) => <InboxRow key={entity.name} entity={entity} />)}
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
        <SectionTitle title="Produtos Moriah / Shamar" description="Produtos próprios. Shamar Connect é o motor de comunicação/interação." />
        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {products.map((item) => (
            <div key={item.name}>
              <OperationCard name={item.name} type={item.type} status={item.status} description={item.description} functionLabel={item.function} href={item.href} configHref={item.configHref} stats={[{ label: "Próximo passo", value: statusTone(item.status) === "default" ? "Operar e medir" : "Configurar" }, { label: "Prioridade", value: item.priority }]} />
              <ChannelPills channels={item.channels} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-[#C9952A]">Administração Shamar Connect</p>
            <h2 className="mt-1 text-2xl font-black text-[#1B2F5B]">Clientes e plataforma ficam em área separada</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">Tenants, organizações, canais externos, planos, assinaturas e implantação pertencem à administração do Shamar Connect, não à visão macro do Centro de Comando Allan/Moriah.</p>
          </div>
          <Link href="/admin" className="w-fit rounded-full bg-[#2ABFAB] px-5 py-3 text-sm font-black text-white hover:bg-[#229d8e]">Abrir admin</Link>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="font-black text-slate-800">Administração</p>
            <div className="mt-3 space-y-2 text-slate-600">
              <p>clientes externos: <strong>fora do Centro de Comando</strong></p>
              <p>tenants e organizações: <strong>Admin Shamar Connect</strong></p>
              <p>implantação: <strong>/admin/implantacao</strong></p>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="font-black text-slate-800">Links úteis</p>
            <div className="mt-3 space-y-2 text-slate-600">
              <p><Link href="/admin" className="font-black text-[#1B2F5B] hover:underline">Administração</Link></p>
              <p><Link href="/admin/implantacao" className="font-black text-[#1B2F5B] hover:underline">Implantação</Link></p>
              <p><Link href="/settings/whatsapp" className="font-black text-[#1B2F5B] hover:underline">Configurações SaaS</Link></p>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="font-black text-slate-800">Regra de escopo</p>
            <div className="mt-3 space-y-2 text-slate-600">
              <p>Centro de Comando: <strong>Allan/Moriah</strong></p>
              <p>Admin Shamar Connect: <strong>clientes SaaS</strong></p>
              <p>Operação SaaS: <strong>fora desta visão macro</strong></p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle title="Canais internos" description="Roadmap omnichannel para canais próprios do Allan/Moriah." />
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

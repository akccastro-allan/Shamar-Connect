import Link from "next/link";
import {
  Activity,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  ListChecks,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { operationsNavItems, operationsPeriods, type OperationsCompany, type OperationsSnapshot } from "@/lib/operations/command-center";
import {
  EmptyState as OperationsEmptyState,
  FilterBar,
  MetricCard as OperationsMetricCard,
  OperationalStatus,
  ResponsiveDataList,
  SectionHeader,
} from "@/components/operations/ui";
import {
  AlertOperationsForm,
  CompanyOperationsForm,
  ContentOperationsForm,
  EventOperationsForm,
  TaskOperationsForm,
} from "@/components/operations/operations-action-panels";
import { cn } from "@/lib/utils";

type FrameProps = {
  snapshot: OperationsSnapshot;
  activeHref: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

const statusClass: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  connected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  production_initial: "border-emerald-200 bg-emerald-50 text-emerald-700",
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ready: "border-blue-200 bg-blue-50 text-blue-700",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  assigned: "border-blue-200 bg-blue-50 text-blue-700",
  preparation: "border-amber-200 bg-amber-50 text-amber-700",
  development: "border-amber-200 bg-amber-50 text-amber-700",
  official_whatsapp_preparation: "border-amber-200 bg-amber-50 text-amber-700",
  planned: "border-slate-200 bg-slate-50 text-slate-600",
  pending: "border-slate-200 bg-slate-50 text-slate-600",
  pending_setup: "border-slate-200 bg-slate-50 text-slate-600",
  draft: "border-slate-200 bg-slate-50 text-slate-600",
  scheduled: "border-slate-200 bg-slate-50 text-slate-600",
  disabled: "border-red-200 bg-red-50 text-red-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  error: "border-red-200 bg-red-50 text-red-700",
  attention: "border-red-200 bg-red-50 text-red-700",
};

function statusTone(status?: string | null) {
  return statusClass[status || ""] ?? "border-slate-200 bg-slate-50 text-slate-600";
}

const navIcons: Record<(typeof operationsNavItems)[number]["href"], LucideIcon> = {
  "/operations": Activity,
  "/operations/companies": Building2,
  "/operations/channels": MessageCircle,
  "/operations/social": Users,
  "/operations/content": FileText,
  "/operations/calendar": Clock,
  "/operations/tasks": ListChecks,
  "/operations/commercial": Sparkles,
  "/operations/integrations": Activity,
  "/operations/diagnostics": ShieldCheck,
  "/operations/audit": ShieldCheck,
};

function formatDate(value?: string | null) {
  if (!value) return "Sem registro";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function safeText(value?: string | null, max = 140) {
  return String(value || "").replace(/https?:\/\/\S+/g, "[url]").slice(0, max) || "Sem detalhe";
}

function companyName(snapshot: OperationsSnapshot, organizationId?: string | null) {
  return snapshot.companies.find((company) => company.organizationId === organizationId)?.name ?? "Configuração pendente";
}

function companyQuery(snapshot: OperationsSnapshot, next: { company?: string; period?: string; q?: string } = {}) {
  const params = new URLSearchParams();
  const company = next.company ?? snapshot.selectedSlug;
  const period = next.period ?? snapshot.period;
  const search = next.q ?? snapshot.search;
  if (company && company !== "all") params.set("company", company);
  if (period && period !== "30d") params.set("period", period);
  if (search) params.set("q", search);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function linkedHref(href: string, snapshot: OperationsSnapshot) {
  return `${href}${companyQuery(snapshot)}`;
}

function scopedHref(baseHref: string, snapshot: OperationsSnapshot, next: { company?: string; period?: string; q?: string }) {
  return `${baseHref}${companyQuery(snapshot, next)}`;
}

function Pill({ children, tone }: { children: React.ReactNode; tone?: string | null }) {
  return <span className={cn("rounded-full border px-3 py-1 text-xs font-black", statusTone(tone))}>{children}</span>;
}

function MetricCard({ label, value, icon: Icon, tone = "default" }: { label: string; value: number | string; icon: LucideIcon; tone?: "default" | "warning" | "danger" | "muted" }) {
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", tone === "danger" ? "bg-red-50 text-red-600" : tone === "warning" ? "bg-amber-50 text-amber-600" : tone === "muted" ? "bg-slate-50 text-slate-500" : "bg-[#2ABFAB]/10 text-[#1B2F5B]")}>
          <Icon className="h-5 w-5" strokeWidth={2.4} />
        </span>
      </div>
      <p className={cn("mt-4 text-3xl font-black", tone === "danger" ? "text-red-700" : tone === "warning" ? "text-amber-700" : "text-[#1B2F5B]")}>{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-[#1B2F5B]">{value}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-lg font-black text-[#1B2F5B]">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-[#1B2F5B]">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

function CompanySelector({ snapshot, baseHref }: { snapshot: OperationsSnapshot; baseHref: string }) {
  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Link href={scopedHref(baseHref, snapshot, { company: "all" })} className={cn("shrink-0 rounded-full border px-4 py-2 text-xs font-black", snapshot.selectedSlug === "all" ? "border-[#2ABFAB] bg-[#2ABFAB] text-white" : "border-slate-200 bg-white text-[#1B2F5B] hover:border-[#2ABFAB]/40")}>Todas as empresas</Link>
        {snapshot.companies.map((company) => (
          <Link key={company.slug} href={scopedHref(baseHref, snapshot, { company: company.slug })} className={cn("shrink-0 rounded-full border px-4 py-2 text-xs font-black", snapshot.selectedSlug === company.slug ? "border-[#2ABFAB] bg-[#2ABFAB] text-white" : "border-slate-200 bg-white text-[#1B2F5B] hover:border-[#2ABFAB]/40")}>{company.name}</Link>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {operationsPeriods.map((period) => (
          <Link key={period.value} href={scopedHref(baseHref, snapshot, { period: period.value })} className={cn("shrink-0 rounded-full border px-3 py-2 text-xs font-black", snapshot.period === period.value ? "border-[#1B2F5B] bg-[#1B2F5B] text-white" : "border-slate-200 bg-white text-slate-500 hover:border-[#2ABFAB]/40")}>{period.label}</Link>
        ))}
      </div>
      <form action={baseHref} className="xl:col-span-2">
        {snapshot.selectedSlug !== "all" ? <input type="hidden" name="company" value={snapshot.selectedSlug} /> : null}
        {snapshot.period !== "30d" ? <input type="hidden" name="period" value={snapshot.period} /> : null}
        <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 focus-within:border-[#2ABFAB] focus-within:bg-white">
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">Buscar no Centro de Comando</span>
          <input name="q" defaultValue={snapshot.search} placeholder="Buscar empresa, canal, tarefa ou integração" className="min-w-0 flex-1 bg-transparent py-3 font-semibold outline-none placeholder:text-slate-400" />
          <button type="submit" className="rounded-full bg-[#1B2F5B] px-4 py-2 text-xs font-black text-white hover:bg-[#16284d]">Buscar</button>
          {snapshot.search ? <Link href={scopedHref(baseHref, snapshot, { q: "" })} className="rounded-full px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-100">Limpar</Link> : null}
        </label>
      </form>
    </div>
  );
}

export function OperationsFrame({ snapshot, activeHref, title, description, children }: FrameProps) {
  const activeItem = operationsNavItems.find((item) => item.href === activeHref);
  return (
    <div className="grid gap-6 xl:grid-cols-[240px_1fr]">
      <aside className="hidden h-fit rounded-[2rem] border border-slate-100 bg-white p-3 shadow-sm xl:sticky xl:top-6 xl:block">
        <div className="rounded-[1.5rem] bg-[#1B2F5B] p-4 text-white">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2ABFAB]">Centro</p>
          <p className="mt-1 text-lg font-black">Operações</p>
        </div>
        <nav className="mt-3 space-y-1">
          {operationsNavItems.map((item) => (
            <Link key={item.href} href={linkedHref(item.href, snapshot)} className={cn("flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition", activeHref === item.href ? "bg-[#2ABFAB] text-white" : "text-[#1B2F5B] hover:bg-slate-50")}>
              {(() => {
                const Icon = navIcons[item.href];
                return <Icon className="h-4 w-4 shrink-0" strokeWidth={2.35} />;
              })()}
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 space-y-8">
        <header className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#1B2F5B] px-3 py-1 text-xs font-black uppercase tracking-wide text-white">Uso interno Moriah</span>
                <OperationalStatus status={snapshot.summary.operationalAlerts > 0 ? "attention" : "healthy"} />
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">{snapshot.selectedCompany?.name ?? "Todas as empresas"}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                <Link href={linkedHref("/operations", snapshot)} className="hover:text-[#1B2F5B]">Centro de Comando</Link>
                <span>/</span>
                <span className="text-slate-600">{activeItem?.label || title}</span>
              </div>
              <h1 className="mt-4 text-3xl font-black text-[#1B2F5B] md:text-4xl">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
            </div>
            <div className="grid gap-3 xl:min-w-[360px]">
              <div className="grid grid-cols-2 gap-2 text-xs font-black text-slate-500 sm:grid-cols-3">
                <span className="rounded-2xl bg-slate-50 px-3 py-2">Alertas: {snapshot.summary.operationalAlerts}</span>
                <span className="rounded-2xl bg-slate-50 px-3 py-2">Saúde: {snapshot.summary.operationalAlerts > 0 ? "atenção" : "saudável"}</span>
                <span className="rounded-2xl bg-slate-50 px-3 py-2">Período: {operationsPeriods.find((period) => period.value === snapshot.period)?.label}</span>
              </div>
            </div>
          </div>
          <div className="mt-5"><CompanySelector snapshot={snapshot} baseHref={activeHref} /></div>
        </header>

        <nav className="flex gap-2 overflow-x-auto pb-1 xl:hidden">
          {operationsNavItems.map((item) => (
            <Link key={item.href} href={linkedHref(item.href, snapshot)} className={cn("inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-black", activeHref === item.href ? "border-[#2ABFAB] bg-[#2ABFAB] text-white" : "border-slate-200 bg-white text-[#1B2F5B]")}>{(() => { const Icon = navIcons[item.href]; return <Icon className="h-4 w-4" />; })()}{item.label}</Link>
          ))}
        </nav>

        {children}
      </div>
    </div>
  );
}

export function OperationsDashboard({ snapshot }: { snapshot: OperationsSnapshot }) {
  return (
    <OperationsFrame snapshot={snapshot} activeHref="/operations" title="Centro de Comando" description="Cockpit interno para acompanhar empresas próprias, produtos, operações, canais, conteúdo, tarefas, agenda e alertas sem misturar clientes SaaS externos.">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OperationsMetricCard label="Empresas internas" value={snapshot.companies.length} context={`${snapshot.summary.activeCompanies} em operação inicial ou ativa`} icon={Building2} href={linkedHref("/operations/companies", snapshot)} status="active" />
        <OperationsMetricCard label="Canais conectados" value={snapshot.summary.connectedChannels} context="WhatsApp, distribuição e social com status operacional" icon={Activity} href={linkedHref("/operations/channels", snapshot)} status="connected" />
        <OperationsMetricCard label="Canais com problema" value={snapshot.summary.disconnectedChannels} context="Desconectados, inativos ou com erro" icon={XCircle} href={linkedHref("/operations/channels", snapshot)} status={snapshot.summary.disconnectedChannels > 0 ? "failed" : "healthy"} />
        <OperationsMetricCard label="Conversas aguardando" value={snapshot.summary.waitingConversations} context={`${snapshot.summary.inProgressConversations} em andamento`} icon={MessageCircle} href={linkedHref("/operations/commercial", snapshot)} status={snapshot.summary.waitingConversations > 0 ? "attention" : "healthy"} />
        <OperationsMetricCard label="Tarefas vencidas" value={snapshot.summary.overdueTasks} context={`${snapshot.summary.todayTasks} vencem hoje`} icon={Clock} href={linkedHref("/operations/tasks", snapshot)} status={snapshot.summary.overdueTasks > 0 ? "failed" : "healthy"} />
        <OperationsMetricCard label="Publicações programadas" value={snapshot.summary.scheduledPosts} context={`${snapshot.summary.pendingApprovals} aguardando aprovação`} icon={FileText} href={linkedHref("/operations/content", snapshot)} status={snapshot.summary.pendingApprovals > 0 ? "attention" : "healthy"} />
        <OperationsMetricCard label="Oportunidades abertas" value={snapshot.summary.openOpportunities} context="Pipeline interno e próximos passos" icon={Sparkles} href={linkedHref("/operations/commercial", snapshot)} status="pending" />
        <OperationsMetricCard label="Alertas críticos" value={snapshot.summary.operationalAlerts} context="Canais, SLA, tarefas e integrações" icon={ShieldCheck} href={linkedHref("/operations/diagnostics", snapshot)} status={snapshot.summary.operationalAlerts > 0 ? "blocked" : "healthy"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel title="Saúde operacional" description="Leituras server-side do escopo atual.">
          {snapshot.health.map((item) => <Row key={item.label} title={item.label} meta={item.description} tone={item.status === "ok" ? "connected" : item.status === "attention" ? "attention" : "planned"} icon={ShieldCheck} />)}
        </Panel>
        <Panel title="Atividade recente" description="Eventos reais encontrados no período selecionado.">
          {snapshot.recentActivity.length > 0 ? snapshot.recentActivity.map((item) => <Row key={`${item.module}-${item.title}-${item.at}`} title={`${item.module}: ${item.title}`} meta={`Última alteração: ${formatDate(item.at)}`} tone={item.status} icon={Activity} />) : <EmptyState title="Nenhuma atividade recente" description="Não há registros reais no escopo selecionado." />}
        </Panel>
        <Panel title="Pendências" description="Itens que precisam de configuração ou atenção.">
          {snapshot.pendingItems.length > 0 ? snapshot.pendingItems.map((item) => <Row key={`${item.title}-${item.description}`} title={item.title} meta={item.description} tone={item.severity === "danger" ? "attention" : item.severity === "warning" ? "preparation" : "planned"} icon={ListChecks} />) : <EmptyState title="Nenhuma pendência encontrada" description="Não há tarefas vencidas, canais ausentes ou integrações degradadas no escopo atual." />}
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {snapshot.companies.map((company) => <CompanyCard key={company.slug} company={company} />)}
      </section>
    </OperationsFrame>
  );
}

function CompanyCard({ company }: { company: OperationsCompany }) {
  return (
    <Link href={`/operations/companies/${company.slug}`} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2ABFAB]/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-black text-[#1B2F5B]">{company.name}</p>
          <p className="mt-1 text-xs font-bold text-slate-400">{company.slug} · {company.type}</p>
        </div>
        <Pill tone={company.organizationId ? company.status : "preparation"}>{company.organizationId ? company.statusLabel : "Configuração pendente"}</Pill>
      </div>
      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">{company.description}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <MiniMetric label="Canais" value={company.metrics.channels} />
        <MiniMetric label="Redes" value={company.metrics.socialAccounts} />
        <MiniMetric label="Tarefas" value={company.metrics.openTasks} />
        <MiniMetric label="Alertas" value={company.metrics.alerts} />
      </div>
      <p className="mt-4 text-xs font-bold text-slate-400">Última atividade: {formatDate(company.lastActivityAt)}</p>
    </Link>
  );
}

export function OperationsCompaniesPage({ snapshot }: { snapshot: OperationsSnapshot }) {
  const companies = snapshot.search
    ? snapshot.companies.filter((company) =>
        [company.name, company.slug, company.type, company.statusLabel, company.description].some((value) =>
          value.toLowerCase().includes(snapshot.search),
        ),
      )
    : snapshot.companies;
  return (
    <OperationsFrame snapshot={snapshot} activeHref="/operations/companies" title="Empresas Internas" description="Lista restrita às operações Allan/Moriah. Lips, Hall, NutriFlow e demais clientes SaaS ficam fora deste centro.">
      <FilterBar>
        <SectionHeader title="Filtro aplicado" description={snapshot.search ? `Busca: ${snapshot.search}` : "Use o seletor global de empresa, período e busca para filtrar esta lista."} />
      </FilterBar>
      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {companies.map((company) => <CompanyCard key={company.slug} company={company} />)}
      </section>
      {companies.length === 0 ? <OperationsEmptyState title="Nenhuma empresa encontrada" description="A busca atual não encontrou empresas internas. Limpe a busca ou selecione Todas as empresas." /> : null}
    </OperationsFrame>
  );
}

export function OperationsCompanyDetailPage({ snapshot, company }: { snapshot: OperationsSnapshot; company: OperationsCompany }) {
  const tabs = [
    ["Resumo", "resumo"],
    ["Canais", "canais"],
    ["Redes sociais", "redes"],
    ["Conteúdo", "conteudo"],
    ["Agenda", "agenda"],
    ["Tarefas", "tarefas"],
    ["Comercial", "comercial"],
    ["Integrações", "integracoes"],
    ["Equipe", "equipe"],
    ["Auditoria", "auditoria"],
  ] as const;
  return (
    <OperationsFrame snapshot={snapshot} activeHref="/operations/companies" title={company.name} description={company.functionLabel}>
      <section id="resumo" className="scroll-mt-6 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={company.organizationId ? company.status : "preparation"}>{company.organizationId ? company.statusLabel : "Configuração pendente"}</Pill>
          <span className="text-sm font-bold text-slate-500">{company.type} · Última atividade: {formatDate(company.lastActivityAt)}</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">{tabs.map(([label, id]) => <a key={id} href={`#${id}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 hover:border-[#2ABFAB]/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2ABFAB]">{label}</a>)}</div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Canais" value={company.metrics.channels} icon={Activity} />
          <MetricCard label="Conversas aguardando" value={company.metrics.waitingConversations} icon={MessageCircle} />
          <MetricCard label="Tarefas abertas" value={company.metrics.openTasks} icon={ListChecks} />
          <MetricCard label="Alertas" value={company.metrics.alerts} icon={XCircle} tone={company.metrics.alerts > 0 ? "danger" : "default"} />
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4"><p className="font-black text-[#1B2F5B]">Resumo operacional</p><p className="mt-2 text-sm leading-6 text-slate-500">{company.description}</p><p className="mt-3 text-sm text-slate-500">Prioridade: <strong>{company.priority}</strong></p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="font-black text-[#1B2F5B]">Canais planejados</p><div className="mt-3 flex flex-wrap gap-2">{company.channels.map((channel) => <Pill key={channel.key} tone={channel.status}>{channel.label}</Pill>)}</div></div>
        </div>
      </section>
      {company.organizationId ? <CompanyOperationsForm company={company} /> : null}
      <section id="canais" className="scroll-mt-6 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
        <SectionHeader title="Canais" description="Canais reais vinculados à empresa selecionada." />
        <div className="mt-4"><SimpleRows rows={snapshot.channels} emptyTitle="Nenhum canal real" render={(item) => <Row key={item.id} title={item.name} meta={`Sessão: ${item.session_id || "sem sessão"} · Provider: ${item.provider || "whatsapp_web"} · Última atividade: ${formatDate(item.updated_at)}`} tone={item.active === false ? "disconnected" : item.status || "connected"} icon={MessageCircle} />} /></div>
      </section>
      <section id="redes" className="scroll-mt-6 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
        <SectionHeader title="Redes sociais" description="Contas sociais cadastradas sem exposição de tokens." />
        <div className="mt-4"><SimpleRows rows={snapshot.socialAccounts} emptyTitle="Nenhuma rede social configurada" render={(item) => <Row key={item.id} title={item.name || item.provider} meta={`Plataforma: ${item.provider} · Conta: ${item.masked_external_account_id || "não informada"} · Última sincronização: ${formatDate(item.updated_at)}`} tone={item.status || "not_configured"} icon={Users} />} /></div>
      </section>
      <section id="conteudo" className="scroll-mt-6 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
        <SectionHeader title="Conteúdo" description="Supervisão de conteúdo por status, sem publicação externa nesta fase." />
        <div className="mt-4"><SimpleRows rows={snapshot.broadcasts} emptyTitle="Nenhum conteúdo" render={(item) => <Row key={item.id} title={item.title} meta={`Status: ${item.status} · Programado: ${formatDate(item.scheduled_at)} · Última alteração: ${formatDate(item.updated_at || item.created_at)}`} tone={item.status} icon={FileText} />} /></div>
      </section>
      <section id="agenda" className="scroll-mt-6 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
        <SectionHeader title="Agenda" description="Eventos, compromissos e publicações programadas." />
        <div className="mt-4"><SimpleRows rows={snapshot.events} emptyTitle="Nenhum evento" render={(item) => <Row key={item.id} title={item.title} meta={`Status: ${item.status || "scheduled"} · Início: ${formatDate(item.starts_at)}`} tone={item.status || "scheduled"} icon={Clock} />} /></div>
      </section>
      <section id="tarefas" className="scroll-mt-6 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
        <SectionHeader title="Tarefas" description="Pendências e prazos reais da empresa." />
        <div className="mt-4"><SimpleRows rows={snapshot.tasks} emptyTitle="Nenhuma tarefa" render={(item) => <Row key={item.id} title={item.title} meta={`Prioridade: ${item.priority || "normal"} · Prazo: ${formatDate(item.due_at)} · Última alteração: ${formatDate(item.updated_at)}`} tone={item.status || "pending"} icon={ListChecks} />} /></div>
      </section>
      <section id="comercial" className="scroll-mt-6 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
        <SectionHeader title="Comercial" description="Oportunidades, follow-ups e próximas ações." />
        <div className="mt-4"><SimpleRows rows={snapshot.opportunities} emptyTitle="Nenhuma oportunidade" render={(item) => <Row key={item.id} title={item.title} meta={`Valor: ${item.value === null ? "Não informado" : item.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · Próxima ação: ${formatDate(item.expected_close_date)}`} tone="pending" icon={Sparkles} />} /></div>
      </section>
      <section id="integracoes" className="scroll-mt-6 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
        <SectionHeader title="Integrações" description="Fontes e agentes sem secrets ou URLs privadas." />
        <div className="mt-4"><SimpleRows rows={snapshot.integrationSources} emptyTitle="Nenhuma integração" render={(item) => <Row key={item.id} title={item.name} meta={`Tipo: ${item.source_type} · Status: ${item.status || "não configurado"} · Última atualização: ${formatDate(item.updated_at)}`} tone={item.status || "not_configured"} icon={Activity} />} /></div>
      </section>
      <section id="equipe" className="scroll-mt-6"><OperationsEmptyState title="Equipe não conectada a este módulo" description="A equipe operacional continua gerenciada nas configurações globais. Esta seção exibirá responsáveis por empresa quando houver fonte multiempresa segura." actionLabel="Abrir equipe" actionHref="/settings/team" /></section>
      <section id="auditoria" className="scroll-mt-6"><OperationsEmptyState title="Auditoria sanitizada pendente" description="Nenhum evento sanitizado foi encontrado para esta empresa no período selecionado. Payloads brutos não são exibidos aqui." /></section>
    </OperationsFrame>
  );
}

export function OperationsChannelsPage({ snapshot }: { snapshot: OperationsSnapshot }) {
  return (
    <OperationsFrame snapshot={snapshot} activeHref="/operations/channels" title="Canais" description="Inventário de canais internos conectados, em preparação ou planejados por empresa.">
      <FilterBar>
        <SectionHeader title="Filtros consistentes" description="Use empresa, período e busca no topo. Sessões Lips e Hall são excluídas deste inventário interno." />
      </FilterBar>
      <ResponsiveDataList>
        {snapshot.channels.map((channel) => (
          <div key={channel.id} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4"><div><p className="font-black text-[#1B2F5B]">{channel.name}</p><p className="mt-1 text-sm text-slate-500">{channel.companyName}</p></div><OperationalStatus status={channel.active === false ? "disconnected" : channel.status || "connected"} /></div>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2"><MiniMetric label="Sessão" value={channel.session_id || "Sem sessão"} /><MiniMetric label="Telefone" value={channel.phone || "Não informado"} /><MiniMetric label="Provider" value={channel.provider || "whatsapp_web"} /><MiniMetric label="Gateway" value={channel.provider_type || channel.channel_type || "web_gateway"} /><MiniMetric label="Última atividade" value={formatDate(channel.updated_at)} /><MiniMetric label="Última sincronização" value={formatDate(channel.lastSyncAt)} /><MiniMetric label="Mensagens recentes" value={channel.recentMessages} /><MiniMetric label="Erro atual" value={channel.currentError || "Nenhum"} /></div>
            <Link href={linkedHref("/operations/diagnostics/whatsapp-sync", snapshot)} className="mt-4 inline-flex rounded-full bg-[#2ABFAB] px-4 py-2 text-xs font-black text-white hover:bg-[#229d8e]">Abrir diagnóstico</Link>
          </div>
        ))}
      </ResponsiveDataList>
      {snapshot.channels.length === 0 && <OperationsEmptyState title="Nenhum canal configurado" description="Nenhuma sessão interna permitida foi encontrada em channels para o escopo selecionado. Ajuste empresa, período ou busca para ampliar a leitura." />}
    </OperationsFrame>
  );
}

export function OperationsSocialPage({ snapshot }: { snapshot: OperationsSnapshot }) {
  const draftCount = snapshot.broadcasts.filter((item) => item.status === "draft").length;
  const scheduledCount = snapshot.broadcasts.filter((item) => item.scheduled_at && item.status !== "published").length;
  const publishedCount = snapshot.broadcasts.filter((item) => item.status === "published").length;
  const failedCount = snapshot.broadcasts.filter((item) => item.status === "failed").length;
  const approvalCount = snapshot.broadcasts.filter((item) => item.status === "ready").length;
  return (
    <OperationsFrame snapshot={snapshot} activeHref="/operations/social" title="Redes Sociais" description="Supervisão de Instagram, Facebook e Messenger. Esta fase não publica em APIs externas nem expõe tokens.">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><MetricCard label="Rascunhos" value={draftCount} icon={FileText} /><MetricCard label="Aprovação" value={approvalCount} icon={CheckCircle2} /><MetricCard label="Programados" value={scheduledCount} icon={Clock} /><MetricCard label="Publicados" value={publishedCount} icon={CheckCircle2} /><MetricCard label="Falhas" value={failedCount} icon={XCircle} tone={failedCount > 0 ? "danger" : "default"} /></section>
      <section className="grid gap-4 lg:grid-cols-2">
        {snapshot.socialAccounts.map((account) => <Row key={account.id} title={`${companyName(snapshot, account.organization_id)} · ${account.name || account.provider}`} meta={`Plataforma: ${account.provider} · Conta: ${account.masked_external_account_id || "não informada"} · Última sincronização: ${formatDate(account.updated_at)}`} tone={account.status} icon={Activity} />)}
      </section>
      {snapshot.socialAccounts.length === 0 && <EmptyState title="Nenhuma rede conectada" description="Quando social_accounts tiver Instagram, Facebook ou Messenger das empresas internas, aparecerá aqui sem token de acesso." />}
    </OperationsFrame>
  );
}

export function OperationsContentPage({ snapshot }: { snapshot: OperationsSnapshot }) {
  const count = (status: string) => snapshot.broadcasts.filter((item) => item.status === status).length;
  return (
    <OperationsFrame snapshot={snapshot} activeHref="/operations/content" title="Conteúdo" description="Rascunhos, revisões, aprovações, programações internas e histórico. Não há publicação externa nesta fase.">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <OperationsMetricCard label="Rascunho" value={count("draft")} icon={FileText} status="pending" />
        <OperationsMetricCard label="Revisão" value={count("ready")} icon={CheckCircle2} status="attention" />
        <OperationsMetricCard label="Aprovado" value={count("approved")} icon={CheckCircle2} status="active" />
        <OperationsMetricCard label="Programado" value={snapshot.summary.scheduledPosts} icon={Clock} status="pending" />
        <OperationsMetricCard label="Publicado" value={count("published")} icon={CheckCircle2} status="healthy" />
        <OperationsMetricCard label="Falhou" value={count("failed")} icon={XCircle} status={count("failed") > 0 ? "failed" : "healthy"} />
      </section>
      <FilterBar>
        <SectionHeader title="Supervisão de conteúdo" description="Somente leitura nesta fase. A tela não cria publicação externa e não exibe tokens de plataforma." />
      </FilterBar>
      <ContentOperationsForm companies={snapshot.companies} />
      <SimpleRows rows={snapshot.broadcasts} emptyTitle="Nenhuma publicação programada" render={(item) => <Row key={item.id} title={`${companyName(snapshot, item.organization_id)} · ${item.title}`} meta={`Resumo: ${safeText(item.message_text)} · Responsável: ${item.created_by || "Não informado"} · Programado: ${formatDate(item.scheduled_at)} · Última alteração: ${formatDate(item.updated_at || item.created_at)}`} tone={item.status} icon={FileText} />} />
    </OperationsFrame>
  );
}

export function OperationsCalendarPage({ snapshot }: { snapshot: OperationsSnapshot }) {
  const scheduledPosts = snapshot.broadcasts.filter((item) => item.scheduled_at && item.status !== "published");
  return (
    <OperationsFrame snapshot={snapshot} activeHref="/operations/calendar" title="Agenda" description="Compromissos, eventos, publicações programadas, follow-ups e tarefas com data.">
      <EventOperationsForm companies={snapshot.companies} />
      <SimpleRows rows={[...snapshot.events, ...scheduledPosts]} emptyTitle="Nenhum evento interno encontrado" render={(item) => "starts_at" in item ? <Row key={item.id} title={`${companyName(snapshot, item.organization_id)} · ${item.title}`} meta={`Status: ${item.status || "scheduled"} · Início: ${formatDate(item.starts_at)}`} tone={item.status} icon={Clock} /> : <Row key={item.id} title={`${companyName(snapshot, item.organization_id)} · ${item.title}`} meta={`Publicação programada: ${formatDate(item.scheduled_at)}`} tone={item.status} icon={FileText} />} />
    </OperationsFrame>
  );
}

export function OperationsTasksPage({ snapshot }: { snapshot: OperationsSnapshot }) {
  return (
    <OperationsFrame snapshot={snapshot} activeHref="/operations/tasks" title="Tarefas" description="Pendências operacionais e comerciais acompanhadas por empresa, sem criar um segundo sistema de tarefas.">
      <TaskOperationsForm companies={snapshot.companies} />
      <SimpleRows rows={snapshot.tasks} emptyTitle="Nenhuma tarefa encontrada" render={(item) => <Row key={item.id} title={`${companyName(snapshot, item.organization_id)} · ${item.title}`} meta={`Módulo: CRM · Responsável: não informado · Prioridade: ${item.priority || "normal"} · Prazo: ${formatDate(item.due_at)} · Origem: crm_tasks`} tone={item.status} icon={ListChecks} />} />
    </OperationsFrame>
  );
}

export function OperationsCommercialPage({ snapshot }: { snapshot: OperationsSnapshot }) {
  return (
    <OperationsFrame snapshot={snapshot} activeHref="/operations/commercial" title="Comercial" description="Supervisão interna de oportunidades, follow-ups e próximas ações. Nenhum envio automático é ativado.">
      <section className="grid gap-4 md:grid-cols-3"><MetricCard label="Oportunidades abertas" value={snapshot.summary.openOpportunities} icon={Sparkles} /><MetricCard label="Follow-ups" value={snapshot.summary.todayTasks} icon={Clock} /><MetricCard label="Conversas abertas" value={snapshot.summary.waitingConversations} icon={Users} /></section>
      <SimpleRows rows={snapshot.opportunities} emptyTitle="Nenhuma oportunidade encontrada" render={(item) => <Row key={item.id} title={`${companyName(snapshot, item.organization_id)} · ${item.title}`} meta={`Valor: ${item.value === null ? "Não informado" : item.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · Próxima ação: ${formatDate(item.expected_close_date)} · Última alteração: ${formatDate(item.updated_at)}`} tone="planned" icon={Sparkles} />} />
    </OperationsFrame>
  );
}

export function OperationsIntegrationsPage({ snapshot }: { snapshot: OperationsSnapshot }) {
  return (
    <OperationsFrame snapshot={snapshot} activeHref="/operations/integrations" title="Integrações" description="Fontes, agentes e execuções de sincronização sem expor tokens, senhas, connection strings ou secrets.">
      <section className="grid gap-4 lg:grid-cols-2">{snapshot.integrations.map((item) => <Row key={item.label} title={item.label} meta={item.description} tone={item.status} icon={Activity} />)}</section>
      <SimpleRows rows={snapshot.integrationSources} emptyTitle="Nenhuma integração configurada" render={(item) => {
        const agent = snapshot.integrationAgents.find((candidate) => candidate.integration_source_id === item.id);
        const run = snapshot.integrationRuns.find((candidate) => candidate.integration_source_id === item.id);
        return <Row key={item.id} title={`${companyName(snapshot, item.organization_id)} · ${item.name}`} meta={`Tipo: ${item.source_type} · Status: ${item.status || "sem status"} · Agente instalado: ${agent ? "sim" : "não"} · Último sucesso: ${run?.status === "success" ? formatDate(run.finished_at) : "Sem registro"} · Último erro: ${run?.status === "failed" ? safeText(run.error_message, 80) : "Nenhum"}`} tone={item.status} icon={Activity} />;
      }} />
    </OperationsFrame>
  );
}

export function OperationsDiagnosticsPage({ snapshot }: { snapshot: OperationsSnapshot }) {
  return (
    <OperationsFrame snapshot={snapshot} activeHref="/operations/diagnostics" title="Diagnósticos" description="Checagens operacionais disponíveis para o Centro de Comando. Execuções com escrita seguem protegidas por feature flag.">
      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {snapshot.health.map((item) => <Row key={item.label} title={item.label} meta={item.description} tone={item.status === "ok" ? "healthy" : item.status === "attention" ? "attention" : "not_configured"} icon={ShieldCheck} />)}
        <Link href={linkedHref("/operations/diagnostics/whatsapp-sync", snapshot)} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm transition hover:border-[#2ABFAB]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2ABFAB] focus-visible:ring-offset-2"><p className="font-black text-[#1B2F5B]">WhatsApp Sync</p><p className="mt-2 text-sm leading-6 text-slate-500">Status do gateway, sessão Lips, paginação e integridade do Go-Live. Consultas seguras ficam separadas de execuções controladas.</p><div className="mt-4"><OperationalStatus status="attention" label="Feature de escrita protegida" /></div></Link>
        <Row title="Filas" meta={`${snapshot.summary.waitingConversations} conversa(s) aguardando e ${snapshot.summary.inProgressConversations} em andamento.`} tone={snapshot.summary.waitingConversations > 0 ? "attention" : "healthy"} icon={ListChecks} />
        <Row title="Integrações" meta={`${snapshot.summary.integrationErrors} erro(s) em fontes ou execuções de integração.`} tone={snapshot.summary.integrationErrors > 0 ? "failed" : "healthy"} icon={Activity} />
        <Row title="Deploy" meta="Deploy automático Vercel/GitHub monitorado fora desta tela. Nenhuma ação manual é disparada aqui." tone="not_configured" icon={ShieldCheck} />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {snapshot.systemAlerts.map((alert) => <AlertRow key={alert.id} alert={alert} />)}
      </section>
      {snapshot.systemAlerts.length === 0 ? <OperationsEmptyState title="Nenhum alerta aberto" description="Alertas do sistema aparecerão aqui para reconhecimento, tratamento e resolução sem apagar histórico." /> : null}
    </OperationsFrame>
  );
}

export function OperationsAuditPage({ snapshot }: { snapshot: OperationsSnapshot }) {
  return (
    <OperationsFrame snapshot={snapshot} activeHref="/operations/audit" title="Auditoria" description="Trilha de auditoria operacional com metadata sanitizada. Dados sensíveis, tokens, cookies e payloads integrais não são exibidos.">
      <FilterBar>
        <SectionHeader title="Filtros disponíveis" description="Empresa, período e busca global são preservados nesta rota. Filtros por usuário, ação e resultado serão habilitados quando houver fonte de auditoria multiempresa sanitizada." />
      </FilterBar>
      <section className="grid gap-4 md:grid-cols-2"><Row title="Escopo" meta="Somente tenant plataforma, operador global e Centro de Comando habilitado." tone="connected" icon={ShieldCheck} /><Row title="Última atualização" meta={formatDate(snapshot.generatedAt)} tone="planned" icon={Clock} /></section>
      <SimpleRows rows={snapshot.auditTrail} emptyTitle="Nenhum evento de auditoria exibido" render={(item) => <Row key={item.id} title={`${item.action} · ${item.entity_type}`} meta={`Usuário: ${item.actor_name || item.actor_email || "sistema"} · Campos: ${(item.changed_fields || []).join(", ") || "não informado"} · Data: ${formatDate(item.created_at)}`} tone="connected" icon={ShieldCheck} />} />
    </OperationsFrame>
  );
}

function SimpleRows<T>({ rows, emptyTitle, render }: { rows: T[]; emptyTitle: string; render: (row: T) => React.ReactNode }) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} description="Os registros aparecerão aqui quando existirem para as empresas internas selecionadas." />;
  return <section className="grid gap-4 lg:grid-cols-2">{rows.map(render)}</section>;
}

function AlertRow({ alert }: { alert: OperationsSnapshot["systemAlerts"][number] }) {
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><ShieldCheck className="h-5 w-5" strokeWidth={2.4} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><p className="font-black text-[#1B2F5B]">{alert.title}</p><OperationalStatus status={alert.status || alert.severity} /></div>
          <p className="mt-2 text-sm leading-6 text-slate-500">{safeText(alert.description)} · Módulo: {alert.module || "geral"} · Criado: {formatDate(alert.created_at)}</p>
          <AlertOperationsForm alertId={alert.id} />
        </div>
      </div>
    </div>
  );
}

function Row({ title, meta, tone, icon: Icon = Sparkles }: { title: string; meta: string; tone?: string | null; icon?: LucideIcon }) {
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2ABFAB]/10 text-[#1B2F5B]"><Icon className="h-5 w-5" strokeWidth={2.4} /></span>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-black text-[#1B2F5B]">{title}</p><OperationalStatus status={tone} /></div><p className="mt-2 text-sm leading-6 text-slate-500">{meta}</p></div>
      </div>
    </div>
  );
}

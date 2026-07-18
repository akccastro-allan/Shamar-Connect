import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppContext } from "@/lib/auth/app-context";
import { commandCenterEntities, channelCatalog, statusLabel, type ChannelKey } from "@/lib/admin/command-center-config";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import {
  allowedOperationsCompanySlugs,
  companySlugByName,
  internalCompanyNameSet,
  internalCompanySlugSet,
  internalWhatsappSessionSet,
} from "@/lib/operations/command-center-scope";

export { getOperationsCompanySlugs, internalWhatsappSessions, isAllowedOperationsCompanySlug } from "@/lib/operations/command-center-scope";

export type OperationsPeriod = "7d" | "30d" | "90d";

export type OperationsFilters = {
  company?: string;
  period?: string;
  q?: string;
};

export type OperationsCompany = {
  name: string;
  slug: string;
  group: "corporate" | "own_operation" | "product";
  type: string;
  status: string;
  statusLabel: string;
  description: string;
  functionLabel: string;
  priority: string;
  href: string;
  configHref: string;
  channels: Array<{ key: ChannelKey; label: string; status: string }>;
  organizationId: string | null;
  organizationStatus: string | null;
  lastActivityAt: string | null;
  metrics: {
    channels: number;
    socialAccounts: number;
    openTasks: number;
    alerts: number;
    waitingConversations: number;
    scheduledPosts: number;
  };
};

export type OperationsSnapshot = {
  companies: OperationsCompany[];
  selectedCompany: OperationsCompany | null;
  selectedSlug: string;
  search: string;
  period: OperationsPeriod;
  summary: {
    activeCompanies: number;
    connectedChannels: number;
    disconnectedChannels: number;
    waitingConversations: number;
    inProgressConversations: number;
    overdueTasks: number;
    todayTasks: number;
    pendingTasks: number;
    scheduledPosts: number;
    pendingApprovals: number;
    openOpportunities: number;
    integrationErrors: number;
    operationalAlerts: number;
  };
  channels: ChannelRow[];
  distributionChannels: DistributionChannelRow[];
  socialAccounts: SocialAccountRow[];
  broadcasts: BroadcastRow[];
  conversations: ConversationRow[];
  tasks: TaskRow[];
  events: CalendarEventRow[];
  opportunities: OpportunityRow[];
  integrations: IntegrationStatus[];
  integrationSources: IntegrationSourceRow[];
  integrationAgents: IntegrationAgentRow[];
  integrationRuns: IntegrationRunRow[];
  recentActivity: ActivityItem[];
  pendingItems: PendingItem[];
  health: HealthItem[];
  generatedAt: string;
};

export const operationsPeriods: Array<{ value: OperationsPeriod; label: string }> = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
];

export const operationsNavItems = [
  { href: "/operations", label: "Visão Geral" },
  { href: "/operations/companies", label: "Empresas" },
  { href: "/operations/channels", label: "Canais" },
  { href: "/operations/social", label: "Redes Sociais" },
  { href: "/operations/content", label: "Conteúdo" },
  { href: "/operations/calendar", label: "Agenda" },
  { href: "/operations/tasks", label: "Tarefas" },
  { href: "/operations/commercial", label: "Comercial" },
  { href: "/operations/integrations", label: "Integrações" },
  { href: "/operations/diagnostics", label: "Diagnósticos" },
  { href: "/operations/audit", label: "Auditoria" },
] as const;

const allowedSlugs = allowedOperationsCompanySlugs;

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  updated_at: string | null;
};

export type SocialAccountRow = {
  id: string;
  organization_id: string;
  provider: string;
  external_account_id: string | null;
  masked_external_account_id: string | null;
  name: string | null;
  status: string | null;
  updated_at: string | null;
};

type SocialAccountDbRow = Omit<SocialAccountRow, "masked_external_account_id">;

export type ChannelRow = {
  id: string;
  organization_id: string;
  companyName: string;
  name: string;
  session_id: string | null;
  phone: string | null;
  provider: string | null;
  provider_type: string | null;
  channel_type: string | null;
  status: string | null;
  active: boolean | null;
  updated_at: string | null;
  lastConnectionAt: string | null;
  lastSyncAt: string | null;
  recentMessages: number;
  currentError: string | null;
};

type ChannelDbRow = Omit<ChannelRow, "companyName" | "lastConnectionAt" | "lastSyncAt" | "recentMessages" | "currentError">;

export type DistributionChannelRow = {
  id: string;
  organization_id: string;
  name: string;
  provider: string;
  active: boolean | null;
  is_broadcast_only: boolean | null;
  allow_replies: boolean | null;
  description: string | null;
  updated_at: string | null;
};

export type BroadcastRow = {
  id: string;
  organization_id: string;
  title: string;
  message_text: string | null;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  created_at: string | null;
};

export type ConversationRow = {
  id: string;
  organization_id: string;
  name: string | null;
  status: string | null;
  queue_status: string | null;
  unread_count: number | null;
  requires_human: boolean | null;
  sla_status: string | null;
  updated_at: string | null;
};

export type TaskRow = {
  id: string;
  organization_id: string;
  title: string;
  status: string | null;
  priority: string | null;
  due_at: string | null;
  updated_at: string | null;
};

export type CalendarEventRow = {
  id: string;
  organization_id: string;
  title: string;
  status: string | null;
  starts_at: string | null;
  updated_at: string | null;
};

export type OpportunityRow = {
  id: string;
  organization_id: string;
  title: string;
  value: number | null;
  expected_close_date: string | null;
  updated_at: string | null;
};

export type IntegrationSourceRow = {
  id: string;
  organization_id: string;
  name: string;
  source_type: string;
  status: string | null;
  updated_at: string | null;
};

export type IntegrationAgentRow = {
  id: string;
  organization_id: string;
  integration_source_id: string;
  agent_name: string | null;
  name: string | null;
  status: string | null;
  last_seen_at: string | null;
  updated_at: string | null;
};

export type IntegrationRunRow = {
  id: string;
  organization_id: string;
  integration_source_id: string;
  agent_id: string | null;
  sync_type: string | null;
  status: string | null;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
};

export type IntegrationStatus = {
  label: string;
  status: "connected" | "preparation" | "planned" | "attention";
  description: string;
};

export type ActivityItem = {
  module: string;
  title: string;
  at: string | null;
  status?: string | null;
};

export type PendingItem = {
  title: string;
  description: string;
  severity: "info" | "warning" | "danger";
};

export type HealthItem = {
  label: string;
  status: "ok" | "attention" | "pending";
  description: string;
};

function normalizePeriod(value?: string): OperationsPeriod {
  return value === "7d" || value === "90d" ? value : "30d";
}

function buildCompany(entity: (typeof commandCenterEntities)[number], organization?: OrganizationRow): OperationsCompany {
  return {
    name: entity.name,
    slug: companySlugByName[entity.name],
    group: entity.group,
    type: entity.type,
    status: entity.status,
    statusLabel: statusLabel(entity.status),
    description: entity.description,
    functionLabel: entity.function,
    priority: entity.priority,
    href: entity.href,
    configHref: entity.configHref,
    channels: entity.channels.map((key) => ({ key, label: channelCatalog[key].label, status: channelCatalog[key].status })),
    organizationId: organization?.id ?? null,
    organizationStatus: organization?.status ?? null,
    lastActivityAt: organization?.updated_at ?? null,
    metrics: {
      channels: 0,
      socialAccounts: 0,
      openTasks: 0,
      alerts: 0,
      waitingConversations: 0,
      scheduledPosts: 0,
    },
  };
}

async function maybeLoad<T>(loader: () => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  try {
    const { data, error } = await loader();
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

async function loadOrganizations(db: SupabaseClient, tenantId: string): Promise<OrganizationRow[]> {
  const organizations = await maybeLoad<OrganizationRow>(() =>
    db
      .from("organizations")
      .select("id, name, slug, status, updated_at")
      .eq("tenant_id", tenantId),
  );
  return organizations.filter((organization) =>
    internalCompanyNameSet.has(String(organization.name || "").toLowerCase()) || internalCompanySlugSet.has(String(organization.slug || "")),
  );
}

function filterBySelected<T extends { organization_id: string }>(rows: T[], organizationIds: Set<string>) {
  if (organizationIds.size === 0) return rows;
  return rows.filter((row) => organizationIds.has(row.organization_id));
}

function latestDate(current: string | null, next?: string | null) {
  if (!next) return current;
  if (!current) return next;
  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
}

function isWaitingConversation(row: ConversationRow) {
  return row.queue_status === "waiting" || row.status === "open" || row.status === "pending" || row.requires_human === true;
}

function isInProgressConversation(row: ConversationRow) {
  return row.queue_status === "in_progress" || row.status === "in_progress" || row.status === "assigned";
}

function isPendingTask(row: TaskRow) {
  return row.status !== "completed" && row.status !== "done" && row.status !== "cancelled";
}

function isOverdueTask(row: TaskRow) {
  return isPendingTask(row) && Boolean(row.due_at) && new Date(row.due_at as string).getTime() < Date.now();
}

function isTodayTask(row: TaskRow) {
  if (!isPendingTask(row) || !row.due_at) return false;
  const due = new Date(row.due_at);
  const now = new Date();
  return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth() && due.getDate() === now.getDate();
}

function isScheduledBroadcast(row: BroadcastRow) {
  return Boolean(row.scheduled_at) && row.status !== "published" && row.status !== "failed";
}

function isAlertingChannel(row: SocialAccountRow | SocialAccountDbRow | DistributionChannelRow | ChannelRow | ChannelDbRow) {
  if ("active" in row) return row.active === false || ("status" in row && (row.status === "error" || row.status === "disabled"));
  return row.status === "disabled";
}

function isConnectedChannel(row: ChannelRow | ChannelDbRow | DistributionChannelRow | SocialAccountRow | SocialAccountDbRow) {
  if ("active" in row) return row.active !== false && (!("status" in row) || (row.status !== "error" && row.status !== "disabled"));
  return row.status === "active";
}

function maskExternalId(value?: string | null) {
  const text = String(value || "");
  if (!text) return null;
  if (text.length <= 6) return `${text.slice(0, 2)}...`;
  return `${text.slice(0, 3)}...${text.slice(-3)}`;
}

function safeText(value?: string | null, max = 180) {
  return String(value || "").replace(/https?:\/\/\S+/g, "[url]").slice(0, max);
}

function normalizeSearch(value?: string) {
  return String(value || "").trim().toLowerCase().slice(0, 80);
}

function matchesSearch(values: Array<string | number | null | undefined>, search: string) {
  if (!search) return true;
  return values.some((value) => String(value || "").toLowerCase().includes(search));
}

function companyNameFromId(companies: OperationsCompany[], organizationId?: string | null) {
  return companies.find((company) => company.organizationId === organizationId)?.name || "";
}

function buildIntegrations(channels: ChannelRow[], distributionChannels: DistributionChannelRow[], socialAccounts: SocialAccountRow[], sources: IntegrationSourceRow[], agents: IntegrationAgentRow[]): IntegrationStatus[] {
  const hasWhatsappWeb = channels.some((channel) => channel.provider === "whatsapp_web" || channel.channel_type === "whatsapp_web");
  const hasDistribution = distributionChannels.some((channel) => channel.active !== false);
  const hasSocial = socialAccounts.some((account) => account.status === "active");
  const hasAgent = agents.some((agent) => agent.status === "active");
  const hasSourceError = sources.some((source) => source.status === "error");

  return [
    {
      label: "WhatsApp Conectado",
      status: hasWhatsappWeb ? "connected" : "planned",
      description: "Sessões WhatsApp Web operadas pelo gateway Railway.",
    },
    {
      label: "WhatsApp Oficial Meta",
      status: "preparation",
      description: "Preparação para provider meta_whatsapp e Cloud API.",
    },
    {
      label: "Distribuição de conteúdo",
      status: hasDistribution ? "connected" : "planned",
      description: "Canais de broadcast para conteúdo e informativos.",
    },
    {
      label: "Instagram e Facebook",
      status: hasSocial ? "connected" : "planned",
      description: "Contas sociais cadastradas sem expor tokens.",
    },
    {
      label: "Calendário e tarefas",
      status: "preparation",
      description: "Base interna para operação assistida e acompanhamento.",
    },
    {
      label: "Agentes de integração",
      status: hasSourceError ? "attention" : hasAgent ? "connected" : "planned",
      description: "Fontes e agentes locais sem exposição de credenciais.",
    },
  ];
}

export function getCompanyBySlug(slug: string) {
  if (!allowedSlugs.has(slug)) return null;
  return commandCenterEntities.find((entity) => companySlugByName[entity.name] === slug) ?? null;
}


export async function getOperationsSnapshot(context: AppContext, filters: OperationsFilters = {}): Promise<OperationsSnapshot> {
  const db = createSupabaseWriteClient();
  const period = normalizePeriod(filters.period);
  const search = normalizeSearch(filters.q);
  const selectedSlug = filters.company && allowedSlugs.has(filters.company) ? filters.company : "all";
  const organizations = await loadOrganizations(db, context.tenantId);
  const orgByName = new Map(organizations.map((organization) => [organization.name, organization]));
  const companies = commandCenterEntities.map((entity) => buildCompany(entity, orgByName.get(entity.name)));
  const selectedCompany = selectedSlug === "all" ? null : companies.find((company) => company.slug === selectedSlug) ?? null;
  const orgIds = companies.map((company) => company.organizationId).filter((id): id is string => Boolean(id));
  const selectedOrgIds = new Set(selectedCompany?.organizationId ? [selectedCompany.organizationId] : []);

  const [allSocialAccountsRaw, allChannels, allDistributionChannels, allBroadcasts, allConversations, allTasks, allEvents, allOpportunities, allIntegrationSources, allIntegrationAgents, allIntegrationRuns] = orgIds.length > 0
    ? await Promise.all([
        maybeLoad<SocialAccountDbRow>(() => db.from("social_accounts").select("id, organization_id, provider, external_account_id, name, status, updated_at").eq("tenant_id", context.tenantId).in("organization_id", orgIds)),
        maybeLoad<ChannelDbRow>(() => db.from("channels").select("id, organization_id, name, session_id, phone, provider, provider_type, channel_type, status, active, updated_at").eq("tenant_id", context.tenantId).in("organization_id", orgIds)),
        maybeLoad<DistributionChannelRow>(() => db.from("distribution_channels").select("id, organization_id, name, provider, active, is_broadcast_only, allow_replies, description, updated_at").eq("tenant_id", context.tenantId).in("organization_id", orgIds)),
        maybeLoad<BroadcastRow>(() => db.from("content_broadcasts").select("id, organization_id, title, message_text, status, scheduled_at, published_at, created_at, updated_at, created_by").eq("tenant_id", context.tenantId).in("organization_id", orgIds)),
        maybeLoad<ConversationRow>(() => db.from("whatsapp_conversations").select("id, organization_id, name, status, queue_status, unread_count, requires_human, sla_status, updated_at").eq("tenant_id", context.tenantId).in("organization_id", orgIds)),
        maybeLoad<TaskRow>(() => db.from("crm_tasks").select("id, organization_id, title, status, priority, due_at, updated_at").eq("tenant_id", context.tenantId).in("organization_id", orgIds)),
        maybeLoad<CalendarEventRow>(() => db.from("calendar_events").select("id, organization_id, title, status, starts_at, updated_at").eq("tenant_id", context.tenantId).in("organization_id", orgIds)),
        maybeLoad<OpportunityRow>(() => db.from("pipeline_items").select("id, organization_id, title, value, expected_close_date, updated_at").eq("tenant_id", context.tenantId).in("organization_id", orgIds)),
        maybeLoad<IntegrationSourceRow>(() => db.from("integration_sources").select("id, organization_id, name, source_type, status, updated_at").eq("tenant_id", context.tenantId).in("organization_id", orgIds)),
        maybeLoad<IntegrationAgentRow>(() => db.from("integration_agents").select("id, organization_id, integration_source_id, agent_name, name, status, last_seen_at, updated_at").eq("tenant_id", context.tenantId).in("organization_id", orgIds)),
        maybeLoad<IntegrationRunRow>(() => db.from("integration_sync_runs").select("id, organization_id, integration_source_id, agent_id, sync_type, status, started_at, finished_at, error_message").eq("tenant_id", context.tenantId).in("organization_id", orgIds)),
      ])
    : [[], [], [], [], [], [], [], [], [], [], []];

  const orgNameById = new Map(companies.map((company) => [company.organizationId, company.name]).filter(([id]) => Boolean(id)) as Array<[string, string]>);
  const socialAccounts = filterBySelected(
    allSocialAccountsRaw.map((account) => ({ ...account, masked_external_account_id: maskExternalId(account.external_account_id) })),
    selectedOrgIds,
  ).filter((account) => matchesSearch([account.name, account.provider, companyNameFromId(companies, account.organization_id)], search));
  const normalizedChannels = allChannels
    .filter((channel) => !channel.session_id || internalWhatsappSessionSet.has(channel.session_id))
    .filter((channel) => channel.session_id !== "lips-main" && channel.session_id !== "hall-main")
    .map((channel) => ({
      ...channel,
      companyName: orgNameById.get(channel.organization_id) || "Configuração pendente",
      lastConnectionAt: null,
      lastSyncAt: null,
      recentMessages: 0,
      currentError: null,
    }));
  const channels = filterBySelected(normalizedChannels, selectedOrgIds).filter((channel) => matchesSearch([channel.name, channel.session_id, channel.provider, channel.companyName], search));
  const distributionChannels = filterBySelected(allDistributionChannels, selectedOrgIds).filter((channel) => matchesSearch([channel.name, channel.provider, channel.description], search));
  const broadcasts = filterBySelected(allBroadcasts, selectedOrgIds).filter((broadcast) => matchesSearch([broadcast.title, broadcast.status], search));
  const conversations = filterBySelected(allConversations, selectedOrgIds).filter((conversation) => matchesSearch([conversation.name, conversation.status, conversation.queue_status], search));
  const tasks = filterBySelected(allTasks, selectedOrgIds).filter((task) => matchesSearch([task.title, task.status, task.priority], search));
  const events = filterBySelected(allEvents, selectedOrgIds).filter((event) => matchesSearch([event.title, event.status], search));
  const opportunities = filterBySelected(allOpportunities, selectedOrgIds).filter((opportunity) => matchesSearch([opportunity.title], search));
  const integrationSources = filterBySelected(allIntegrationSources, selectedOrgIds).filter((source) => matchesSearch([source.name, source.source_type, source.status], search));
  const integrationAgents = filterBySelected(allIntegrationAgents, selectedOrgIds);
  const integrationRuns = filterBySelected(allIntegrationRuns, selectedOrgIds);
  const visibleCompanies = selectedCompany ? [selectedCompany] : companies;

  for (const company of companies) {
    const orgRows = {
      socialAccounts: allSocialAccountsRaw.filter((row) => row.organization_id === company.organizationId),
      channels: allChannels.filter((row) => row.organization_id === company.organizationId),
      conversations: allConversations.filter((row) => row.organization_id === company.organizationId),
      broadcasts: allBroadcasts.filter((row) => row.organization_id === company.organizationId),
      tasks: allTasks.filter((row) => row.organization_id === company.organizationId),
    };
    company.metrics.channels = orgRows.channels.filter((row) => !row.session_id || internalWhatsappSessionSet.has(row.session_id)).filter((row) => row.active !== false).length;
    company.metrics.socialAccounts = orgRows.socialAccounts.length;
    company.metrics.openTasks = orgRows.tasks.filter(isPendingTask).length;
    company.metrics.alerts = orgRows.socialAccounts.filter(isAlertingChannel).length + orgRows.channels.filter(isAlertingChannel).length;
    company.metrics.waitingConversations = orgRows.conversations.filter(isWaitingConversation).length;
    company.metrics.scheduledPosts = orgRows.broadcasts.filter(isScheduledBroadcast).length;
    for (const row of [...orgRows.socialAccounts, ...orgRows.channels, ...orgRows.conversations, ...orgRows.broadcasts, ...orgRows.tasks]) {
      company.lastActivityAt = latestDate(company.lastActivityAt, "created_at" in row ? row.created_at : row.updated_at);
    }
  }

  const disconnectedChannels = socialAccounts.filter(isAlertingChannel).length + channels.filter(isAlertingChannel).length + distributionChannels.filter(isAlertingChannel).length;
  const waitingConversations = conversations.filter(isWaitingConversation).length;
  const inProgressConversations = conversations.filter(isInProgressConversation).length;
  const pendingTasks = tasks.filter(isPendingTask).length;
  const overdueTasks = tasks.filter(isOverdueTask).length;
  const todayTasks = tasks.filter(isTodayTask).length;
  const scheduledPosts = broadcasts.filter(isScheduledBroadcast).length;
  const pendingApprovals = broadcasts.filter((row) => row.status === "draft" || row.status === "ready").length;
  const breachedSla = conversations.filter((row) => row.sla_status === "breached").length;
  const integrationErrors = integrationSources.filter((row) => row.status === "error").length + integrationRuns.filter((row) => row.status === "failed").length;
  const operationalAlerts = disconnectedChannels + breachedSla + overdueTasks + integrationErrors;
  const recentActivity = [
    ...channels.map((row) => ({ module: "Canais", title: row.name, at: row.updated_at, status: row.status })),
    ...conversations.map((row) => ({ module: "Mensagens", title: row.name || "Conversa", at: row.updated_at, status: row.status })),
    ...tasks.map((row) => ({ module: "Tarefas", title: row.title, at: row.updated_at, status: row.status })),
    ...broadcasts.map((row) => ({ module: "Conteúdo", title: row.title, at: row.updated_at || row.created_at, status: row.status })),
    ...integrationRuns.map((row) => ({ module: "Integrações", title: row.sync_type || "Sincronização", at: row.started_at, status: row.status })),
  ].sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime()).slice(0, 8);
  const pendingItems: PendingItem[] = [
    ...visibleCompanies.filter((company) => !company.organizationId).map((company) => ({ title: company.name, description: "Configuração pendente em organizations.", severity: "warning" as const })),
    ...visibleCompanies.filter((company) => company.organizationId && company.metrics.channels === 0).map((company) => ({ title: company.name, description: "Nenhum canal real configurado para esta empresa.", severity: "info" as const })),
    ...(overdueTasks > 0 ? [{ title: "Tarefas vencidas", description: `${overdueTasks} tarefa(s) vencida(s) no escopo atual.`, severity: "danger" as const }] : []),
    ...(pendingApprovals > 0 ? [{ title: "Conteúdos aguardando", description: `${pendingApprovals} conteúdo(s) em rascunho/revisão.`, severity: "warning" as const }] : []),
    ...(integrationErrors > 0 ? [{ title: "Integrações degradadas", description: `${integrationErrors} erro(s) de integração no escopo atual.`, severity: "danger" as const }] : []),
  ];
  const health: HealthItem[] = [
    { label: "Supabase", status: "ok", description: "Consultas server-side concluídas sem expor credenciais." },
    { label: "Aplicação", status: "ok", description: "Centro de Comando renderizado via App Router." },
    { label: "Gateway WhatsApp", status: channels.length > 0 ? "ok" : "pending", description: channels.length > 0 ? "Canais internos encontrados." : "Nenhum canal interno real encontrado no escopo." },
    { label: "Canais internos", status: disconnectedChannels > 0 ? "attention" : "ok", description: `${disconnectedChannels} canal(is) desconectado(s) ou com atenção.` },
    { label: "Sincronizações", status: integrationErrors > 0 ? "attention" : "pending", description: integrationRuns.length > 0 ? `${integrationRuns.length} execução(ões) recente(s).` : "Nenhuma execução registrada." },
    { label: "Últimas falhas", status: integrationErrors > 0 ? "attention" : "ok", description: integrationErrors > 0 ? "Há falhas recentes de integração." : "Nenhuma falha registrada no escopo." },
  ];

  return {
    companies,
    selectedCompany,
    selectedSlug,
    search,
    period,
    summary: {
      activeCompanies: visibleCompanies.filter((company) => company.status === "active" || company.status === "production_initial").length,
      connectedChannels: channels.filter(isConnectedChannel).length + distributionChannels.filter(isConnectedChannel).length + socialAccounts.filter(isConnectedChannel).length,
      disconnectedChannels,
      waitingConversations,
      inProgressConversations,
      overdueTasks,
      todayTasks,
      pendingTasks,
      scheduledPosts,
      pendingApprovals,
      openOpportunities: opportunities.length,
      integrationErrors,
      operationalAlerts,
    },
    channels,
    distributionChannels,
    socialAccounts,
    broadcasts,
    conversations,
    tasks,
    events,
    opportunities,
    integrations: buildIntegrations(channels, distributionChannels, socialAccounts, integrationSources, integrationAgents),
    integrationSources,
    integrationAgents,
    integrationRuns,
    recentActivity,
    pendingItems,
    health,
    generatedAt: new Date().toISOString(),
  };
}

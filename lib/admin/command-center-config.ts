export type CommandCenterGroup = "corporate" | "own_operation" | "product";
export type CommandCenterStatus = "active" | "planned" | "pending_setup" | "production_initial" | "development" | "official_whatsapp_preparation" | "go_live";
export type ChannelStatus = "active" | "in_use" | "preparation" | "planned" | "future";
export type ChannelKey =
  | "whatsapp_connected"
  | "whatsapp_official_preparation"
  | "whatsapp_official_parents"
  | "whatsapp_official_support_sales"
  | "whatsapp_planned"
  | "whatsapp_support_planned"
  | "instagram_planned"
  | "facebook_planned"
  | "tiktok_planned"
  | "email_future"
  | "site_form_future"
  | "chat_future"
  | "ai_assistant_future";
export type ChannelMode = "connected_whatsapp" | "official_whatsapp";
export type MetaReadinessStatus = "pending" | "in_progress" | "ready" | "blocked";

export const commandCenterMode = {
  internalOnly: true,
  productizable: true,
  commercialEnabled: false,
  aiMode: "off" as const,
};

export const channelCatalog: Record<ChannelKey, { label: string; status: ChannelStatus; mode?: ChannelMode }> = {
  whatsapp_connected: { label: "WhatsApp Conectado", status: "in_use", mode: "connected_whatsapp" },
  whatsapp_official_preparation: { label: "WhatsApp Oficial Meta", status: "preparation", mode: "official_whatsapp" },
  whatsapp_official_parents: { label: "WhatsApp Oficial - Pais", status: "preparation", mode: "official_whatsapp" },
  whatsapp_official_support_sales: { label: "WhatsApp Oficial - Suporte/Vendas", status: "preparation", mode: "official_whatsapp" },
  whatsapp_planned: { label: "WhatsApp", status: "planned" },
  whatsapp_support_planned: { label: "WhatsApp para suporte", status: "planned" },
  instagram_planned: { label: "Instagram", status: "planned" },
  facebook_planned: { label: "Facebook", status: "planned" },
  tiktok_planned: { label: "TikTok", status: "planned" },
  email_future: { label: "E-mail", status: "future" },
  site_form_future: { label: "Site/Formulário", status: "future" },
  chat_future: { label: "Chat", status: "future" },
  ai_assistant_future: { label: "Assistente de Atendimento", status: "future" },
};

export const commandCenterEntities = [
  {
    name: "Moriah Systems",
    group: "corporate" as const,
    type: "empresa",
    status: "active" as const,
    description: "Empresa principal da operação Allan/Moriah.",
    function: "Administração geral, visão macro, produtos e operações próprias.",
    priority: "Alta",
    channels: ["whatsapp_planned", "email_future", "site_form_future"] as ChannelKey[],
    href: "/admin",
    configHref: "/settings/team",
  },
  {
    name: "Allan / Pessoal",
    group: "corporate" as const,
    type: "pessoal/admin",
    status: "planned" as const,
    description: "Gestão pessoal, prioridades, tarefas e acompanhamento administrativo.",
    function: "WhatsApp pessoal / administrativo.",
    priority: "Média",
    channels: ["whatsapp_planned", "email_future"] as ChannelKey[],
    href: "/dashboard",
    configHref: "/settings/profile",
  },
  {
    name: "Viciados em Trilhas",
    group: "own_operation" as const,
    type: "operação própria",
    status: "planned" as const,
    description: "Turismo, trilhas, rapel, aventuras e eventos.",
    function: "Leads, dúvidas sobre trilhas, reservas, eventos e pagamentos encaminhados para humano.",
    priority: "Média",
    channels: ["whatsapp_planned", "instagram_planned", "facebook_planned", "tiktok_planned", "email_future"] as ChannelKey[],
    href: "/distribution",
    configHref: "/settings/whatsapp",
  },
  {
    name: "MK Shalom",
    group: "own_operation" as const,
    type: "operação própria",
    status: "planned" as const,
    description: "Agência, marketing, sites e serviços digitais.",
    function: "Leads, orçamento, atendimento comercial, suporte de clientes e projetos.",
    priority: "Média",
    channels: ["whatsapp_planned", "instagram_planned", "facebook_planned", "email_future"] as ChannelKey[],
    href: "/dashboard",
    configHref: "/settings/whatsapp",
  },
  {
    name: "Shamar Connect",
    group: "product" as const,
    type: "produto SaaS",
    status: "production_initial" as const,
    description: "Motor de comunicação, interação, atendimento, automação por regra, fila e relacionamento da Moriah.",
    function: "Inbox, canais próprios, fila, automações por regra, SLA, histórico, relacionamento e futura IA assistiva.",
    priority: "Alta",
    channels: ["whatsapp_connected", "whatsapp_official_preparation", "instagram_planned", "facebook_planned", "tiktok_planned", "email_future", "chat_future", "ai_assistant_future"] as ChannelKey[],
    href: "/inbox",
    configHref: "/settings/whatsapp",
  },
  {
    name: "Shamar ERP",
    group: "product" as const,
    type: "produto",
    status: "development" as const,
    description: "Financeiro, fiscal, gestão e operação empresarial.",
    function: "Suporte operacional, financeiro, fiscal, administrativo e notificações futuras.",
    priority: "Média",
    channels: ["whatsapp_support_planned", "email_future"] as ChannelKey[],
    href: "/dashboard",
    configHref: "/settings/billing",
  },
  {
    name: "Shamar Church",
    group: "product" as const,
    type: "produto",
    status: "planned" as const,
    description: "Produto para igrejas, membros, células, eventos e ministérios.",
    function: "Atendimento pastoral/administrativo, eventos, células e relacionamento com membros.",
    priority: "Média",
    channels: ["whatsapp_planned", "instagram_planned", "facebook_planned", "email_future"] as ChannelKey[],
    href: "/dashboard",
    configHref: "/settings/whatsapp",
  },
  {
    name: "Shamar Kids",
    group: "product" as const,
    type: "produto",
    status: "official_whatsapp_preparation" as const,
    description: "Primeiro caso futuro usando WhatsApp API oficial.",
    function: "Gestão infantil/escola/igreja/família com WhatsApp Oficial Meta.",
    priority: "Alta após Lips estável",
    channels: ["whatsapp_official_parents", "whatsapp_official_support_sales", "email_future"] as ChannelKey[],
    href: "/settings/whatsapp-cloud",
    configHref: "/settings/whatsapp-cloud",
  },
  {
    name: "Shamar Events",
    group: "product" as const,
    type: "produto",
    status: "planned" as const,
    description: "Produto para eventos, inscrições, confirmações e suporte.",
    function: "Eventos, inscrições, confirmações, suporte e relacionamento.",
    priority: "Média",
    channels: ["whatsapp_planned", "instagram_planned", "facebook_planned", "tiktok_planned", "email_future"] as ChannelKey[],
    href: "/dashboard",
    configHref: "/settings/whatsapp",
  },
  {
    name: "OriahFin",
    group: "product" as const,
    type: "produto",
    status: "planned" as const,
    description: "Produto financeiro em preparação.",
    function: "Atendimento de produto financeiro, suporte, leads e formulários futuros.",
    priority: "Média",
    channels: ["whatsapp_planned", "email_future", "site_form_future"] as ChannelKey[],
    href: "/financeiro",
    configHref: "/settings/billing",
  },
];

export const metaReadinessItems = [
  { label: "Business Manager Moriah", status: "pending" as MetaReadinessStatus },
  { label: "Verificação da empresa", status: "pending" as MetaReadinessStatus },
  { label: "Domínio verificado", status: "pending" as MetaReadinessStatus },
  { label: "Meta Developer App", status: "pending" as MetaReadinessStatus },
  { label: "WhatsApp Business Platform", status: "pending" as MetaReadinessStatus },
  { label: "Webhook oficial", status: "pending" as MetaReadinessStatus },
  { label: "Número oficial Shamar Kids", status: "pending" as MetaReadinessStatus },
  { label: "Templates", status: "pending" as MetaReadinessStatus },
  { label: "Opt-in / Consentimento", status: "pending" as MetaReadinessStatus },
  { label: "Privacidade / LGPD", status: "pending" as MetaReadinessStatus },
  { label: "Pricing / rate limits", status: "pending" as MetaReadinessStatus },
  { label: "Suporte e auditoria", status: "pending" as MetaReadinessStatus },
  { label: "Embedded signup futuro", status: "pending" as MetaReadinessStatus },
  { label: "Preparação operacional", status: "pending" as MetaReadinessStatus },
];

export const channelRoadmap = [
  { label: "WhatsApp Conectado", description: "OpenWA / web_gateway", status: "em uso" },
  { label: "WhatsApp Oficial Meta", description: "Meta WhatsApp Business Platform / official_api", status: "em preparação" },
  { label: "Instagram", description: "Atendimento social e leads", status: "planejado" },
  { label: "Facebook", description: "Páginas, mensagens e comentários", status: "planejado" },
  { label: "TikTok", description: "Leads e interação social futura", status: "planejado" },
  { label: "E-mail", description: "Caixa de entrada e suporte futuro", status: "futuro" },
  { label: "IA assistiva", description: "Copiloto do atendente humano", status: "futuro" },
];

export function statusLabel(status: CommandCenterStatus) {
  const labels: Record<CommandCenterStatus, string> = {
    active: "Ativa",
    planned: "Planejado",
    pending_setup: "A configurar",
    production_initial: "Em produção inicial",
    development: "Em desenvolvimento",
    official_whatsapp_preparation: "Preparação WhatsApp Oficial",
    go_live: "Go-live",
  };

  return labels[status];
}

export type CommandCenterStatus = "active" | "pending_setup" | "production_initial" | "development" | "meta_official_preparation" | "go_live";
export type ChannelMode = "connected_whatsapp" | "official_whatsapp";
export type MetaReadinessStatus = "pending" | "in_progress" | "ready" | "blocked";

export const LIPS_ORGANIZATION_ID = "8f074193-bf58-4537-9842-720619a9f259";
export const LIPS_CHANNEL_ID = "1f65f8d2-2609-42d9-ae57-709aecdb43da";
export const LIPS_SESSION_ID = "lips-main";

export const commandCenterOperations = {
  ownOperations: [
    {
      name: "Moriah Systems",
      type: "empresa",
      status: "active" as const,
      channel: "Administração interna",
      description: "Empresa principal da operação Allan/Moriah.",
      function: "Holding/operação principal",
      href: "/admin",
      configHref: "/settings/team",
    },
    {
      name: "MK Shalom",
      type: "operacao_propria",
      status: "pending_setup" as const,
      channel: "A configurar",
      description: "Agência, marketing, sites e serviços digitais.",
      function: "Agência/marketing/sites",
      href: "/dashboard",
      configHref: "/settings/whatsapp",
    },
    {
      name: "Viciados em Trilhas",
      type: "operacao_propria",
      status: "pending_setup" as const,
      channel: "A configurar",
      description: "Turismo, trilhas, rapel, aventuras e eventos.",
      function: "Turismo, eventos, trilhas e rapel",
      href: "/distribution",
      configHref: "/settings/whatsapp",
    },
    {
      name: "Pessoal Allan",
      type: "pessoal",
      status: "pending_setup" as const,
      channel: "A configurar",
      description: "Gestão pessoal, prioridades e tarefas.",
      function: "Gestão pessoal, tarefas e prioridades",
      href: "/dashboard",
      configHref: "/settings/profile",
    },
  ],
  products: [
    {
      name: "Shamar Connect",
      type: "produto SaaS",
      status: "production_initial" as const,
      environment: "Produção inicial",
      priority: "Alta",
      description: "Central de atendimento, WhatsApp, fila e automação por regra.",
      function: "Atendimento, WhatsApp, fila, automação por regra e clientes",
      href: "/operations",
    },
    {
      name: "Shamar ERP",
      type: "produto",
      status: "development" as const,
      environment: "Desenvolvimento",
      priority: "Média",
      description: "Financeiro, fiscal, gestão e operação empresarial.",
      function: "Financeiro/fiscal/gestão",
      href: "/dashboard",
    },
    {
      name: "Shamar Kids",
      type: "produto",
      status: "meta_official_preparation" as const,
      environment: "Preparação WhatsApp Oficial",
      priority: "Alta após Lips estável",
      description: "Produto futuro com WhatsApp Oficial / Meta.",
      function: "Gestão infantil/escola/igreja/família",
      href: "/settings/whatsapp-cloud",
    },
    {
      name: "OriahFin",
      type: "produto",
      status: "pending_setup" as const,
      environment: "A configurar",
      priority: "Média",
      description: "Produto financeiro/gestão.",
      function: "Financeiro/gestão",
      href: "/financeiro",
    },
  ],
  clients: [
    {
      name: "Lips",
      type: "cliente",
      status: "go_live" as const,
      product: "Shamar Connect",
      channelMode: "connected_whatsapp" as ChannelMode,
      provider: "openwa",
      sessionId: LIPS_SESSION_ID,
      href: "/inbox",
      configHref: "/settings/whatsapp",
    },
    {
      name: "Futuros clientes",
      type: "clientes",
      status: "pending_setup" as const,
      product: "Shamar Connect",
      channelMode: "connected_whatsapp" as ChannelMode,
      provider: "a definir",
      sessionId: null,
      href: "/admin/implantacao",
      configHref: "/admin/clients",
    },
  ],
};

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
  { label: "Partner readiness", status: "pending" as MetaReadinessStatus },
];

export function statusLabel(status: CommandCenterStatus) {
  const labels: Record<CommandCenterStatus, string> = {
    active: "Ativa",
    pending_setup: "A configurar",
    production_initial: "Em produção inicial",
    development: "Em desenvolvimento",
    meta_official_preparation: "Preparação WhatsApp Oficial",
    go_live: "Go-live",
  };

  return labels[status];
}

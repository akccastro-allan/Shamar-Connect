export interface CompetitorFeature {
  vendor: string;
  category: "inbox" | "crm" | "automation" | "ai" | "commerce" | "analytics" | "white_label" | "integration";
  feature: string;
  mvpPriority: "P0" | "P1" | "P2";
  testImplementation: string;
  officialApiPath: string;
}

export const competitorFeatureMatrix: CompetitorFeature[] = [
  {
    vendor: "Umbler Talk / ChatPro / Helena / Bolten",
    category: "inbox",
    feature: "Inbox multiatendente com filas, responsáveis, status e histórico por contato",
    mvpPriority: "P0",
    testImplementation: "Mock provider + conversas locais com status open, pending e resolved",
    officialApiPath: "WhatsApp Cloud API webhooks para mensagens recebidas e endpoint /messages para envio",
  },
  {
    vendor: "ChatPro / Helena / Bolten",
    category: "crm",
    feature: "CRM integrado ao WhatsApp com funil, tags, etapas e oportunidades",
    mvpPriority: "P0",
    testImplementation: "Lead scoring e criação automática de oportunidade a partir da conversa",
    officialApiPath: "Normalizar contato por telefone vindo do webhook oficial e sincronizar oportunidade no CRM interno",
  },
  {
    vendor: "Suri AI / Blip",
    category: "ai",
    feature: "IA generativa para atendimento, recomendação de resposta e classificação de intenção",
    mvpPriority: "P0",
    testImplementation: "Classificador determinístico no feature lab e depois OpenAI com guardrails",
    officialApiPath: "Processar mensagens do webhook, sugerir resposta e exigir revisão humana antes do envio",
  },
  {
    vendor: "RD Station / Nuvemshop / Zendesk / Kyte",
    category: "automation",
    feature: "Follow-up, respostas rápidas, recuperação de carrinho e nutrição com consentimento",
    mvpPriority: "P1",
    testImplementation: "Playbooks de resposta e lembretes baseados em próximo passo",
    officialApiPath: "Templates aprovados para mensagens iniciadas pela empresa e janela de atendimento para conversa ativa",
  },
  {
    vendor: "Kyte / Jumpseller / Nuvemshop",
    category: "commerce",
    feature: "Catálogo, pedido, checkout, link de pagamento e atualização de status",
    mvpPriority: "P1",
    testImplementation: "Objetos de pedido mockados ligados a contato e oportunidade",
    officialApiPath: "Integrações via links externos, API de catálogo/commerce e mensagens template transacionais",
  },
  {
    vendor: "Helena / Bolten",
    category: "white_label",
    feature: "White label, multiempresa e permissões por equipe",
    mvpPriority: "P2",
    testImplementation: "TenantId em todos os modelos e shell com marca configurável",
    officialApiPath: "Separar credenciais por tenant e phone_number_id por conta oficial",
  },
  {
    vendor: "Zendesk / RD Station",
    category: "analytics",
    feature: "Métricas de atendimento, conversão, tempo médio, origem e receita por campanha",
    mvpPriority: "P1",
    testImplementation: "KPIs mockados + eventos CRM normalizados",
    officialApiPath: "Persistir status de mensagens, timestamps de webhook e eventos de etapa no CRM",
  },
];

export const mvpFeatureDecisions = {
  phase01: ["Inbox multiatendente", "CRM/funil básico", "IA copiloto", "QR mockado", "lead score determinístico"],
  phase02: ["Webhook Meta Cloud API", "templates", "status de mensagens", "regras de follow-up"],
  phase03: ["catálogo/pedido", "pagamentos", "campanhas segmentadas", "white label"],
};

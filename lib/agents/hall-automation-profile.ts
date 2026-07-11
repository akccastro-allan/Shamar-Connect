import { formatAutomationMenu, type OrganizationAutomationProfile } from "./automation-profile.ts";

export const HALL_ORGANIZATION_ID = "6fb7ec30-a05a-47de-9bd8-cddf7495413a";
export const HALL_SESSION_ID = "hall-main";

export const hallAutomationProfile: OrganizationAutomationProfile = {
  organizationId: HALL_ORGANIZATION_ID,
  enabled: false,
  personaName: "Atendente Hall",
  personaLabel: "Hall — Panificação, confeitaria e encomendas",
  greetingMessage: "Olá! Sou a atendente virtual da Hall. Como posso ajudar?",
  menuOptions: [
    { key: "products", label: "Ver produtos e valores", intent: "catalog" },
    { key: "order", label: "Fazer uma encomenda", intent: "order_request" },
    { key: "delivery", label: "Consultar retirada ou entrega", intent: "pickup_delivery" },
    { key: "human", label: "Falar com atendimento", intent: "human_handoff" },
  ],
  catalogEnabled: true,
  safeAutoReply: true,
  categories: ["pães", "bolos", "doces", "salgados", "kits", "produtos sazonais", "encomendas"],
  safeActions: [
    "informar produto cadastrado",
    "informar preço cadastrado",
    "listar até 3 opções",
    "informar data da última atualização do catálogo",
    "pedir quantidade",
    "pedir data desejada",
    "pedir retirada ou entrega",
  ],
  blockedActions: [
    "confirmar encomenda",
    "confirmar data",
    "reservar produto",
    "confirmar entrega",
    "calcular taxa sem regra cadastrada",
    "cobrar cliente",
    "enviar PIX",
    "fechar pagamento",
  ],
  handoffRules: [
    {
      intent: "order_confirmation",
      department: "Encomendas",
      reason: "customer_wants_to_order",
      autoReply: "Perfeito. Vou direcionar para o atendimento confirmar disponibilidade, data, retirada ou entrega antes de finalizar.",
    },
    {
      intent: "payment_or_reservation",
      department: "Supervisor",
      reason: "payment_or_reservation_intent",
      autoReply: "Certo. Vou chamar um responsável para confirmar os detalhes antes de qualquer pagamento ou reserva.",
    },
    {
      intent: "human_handoff",
      department: "Atendimento",
      reason: "customer_requested_human",
      autoReply: "Entendi. Vou direcionar seu atendimento para a equipe da Hall te ajudar certinho.",
    },
  ],
  cooldownMinutes: 5,
};

export const hallMenuMessage = formatAutomationMenu(hallAutomationProfile);

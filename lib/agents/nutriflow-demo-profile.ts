import { formatAutomationMenu, type OrganizationAutomationProfile } from "./automation-profile.ts";

export const NUTRIFLOW_DEMO_LABEL = "NutriFlow — Demonstração";

export const nutriflowDemoProfile: OrganizationAutomationProfile = {
  organizationId: "demo-nutriflow",
  enabled: false,
  personaName: "Assistente NutriFlow Demo",
  personaLabel: NUTRIFLOW_DEMO_LABEL,
  greetingMessage: "Olá! Como podemos ajudar?",
  menuOptions: [
    { key: "services", label: "Conhecer serviços", intent: "service_info" },
    { key: "schedule", label: "Agendar uma conversa", intent: "schedule_request" },
    { key: "support", label: "Suporte", intent: "support" },
    { key: "human", label: "Falar com atendimento", intent: "human_handoff" },
  ],
  catalogEnabled: false,
  safeAutoReply: true,
  categories: ["triagem", "agendamento", "suporte", "atendimento humano"],
  safeActions: [
    "apresentar serviços cadastrados",
    "pedir nome e melhor horário",
    "classificar motivo do contato",
    "encaminhar para atendimento humano",
    "registrar notas internas de demonstração",
  ],
  blockedActions: [
    "dar aconselhamento nutricional",
    "prescrever dieta",
    "interpretar exames",
    "confirmar consulta real",
    "usar dados reais de pacientes",
    "apresentar dados demo como produção",
  ],
  handoffRules: [
    {
      intent: "schedule_request",
      department: "Atendimento",
      reason: "demo_schedule_request",
      autoReply: "Perfeito. Vou direcionar para a equipe confirmar disponibilidade e próximos passos.",
    },
    {
      intent: "nutrition_advice",
      department: "Supervisor",
      reason: "nutrition_advice_blocked",
      autoReply: "Para orientações nutricionais, vou direcionar para um profissional responsável. Não faço recomendações clínicas por aqui.",
    },
  ],
  cooldownMinutes: 5,
};

export const nutriflowDemoMenuMessage = formatAutomationMenu(nutriflowDemoProfile);

import type { CommercialAgentProfile, FeatureStage } from "./types.ts";

export const COMMERCIAL_AGENT_FEATURE_STAGES: Record<string, FeatureStage> = {
  ai_internal: "internal_alpha",
  commercial_agent: "internal_alpha",
  commercial_agent_lips: "internal_alpha",
  commercial_agent_suggestions: "internal_alpha",
  commercial_agent_automation: "hidden",
};

export const LIPS_COMMERCIAL_PROFILE: CommercialAgentProfile = {
  id: "lips-commercial-observer",
  tenantId: "lips",
  organizationId: "lips",
  enabled: true,
  stage: "internal_alpha",
  businessName: "Lips Comercial",
  positioning: "Autopeças e oficina com atendimento consultivo por WhatsApp.",
  targetAudience: ["motoristas", "clientes de balcão", "clientes de oficina", "pequenas frotas"],
  products: [
    {
      id: "autopecas",
      name: "Autopeças",
      category: "balcao",
      description: "Peças automotivas consultadas no catálogo da Lips.",
      qualifiers: ["veículo", "ano", "peça", "posição", "lado"],
    },
    {
      id: "oficina",
      name: "Serviços de oficina",
      category: "oficina",
      description: "Oportunidades de serviço encaminhadas para avaliação humana.",
      qualifiers: ["serviço desejado", "urgência", "sintoma", "disponibilidade"],
    },
  ],
  qualificationQuestions: [
    { id: "vehicle", question: "Qual é o veículo?", required: true, field: "vehicle" },
    { id: "year", question: "Qual é o ano do veículo?", required: true, field: "year" },
    { id: "part", question: "Qual peça ou serviço você procura?", required: true, field: "part_or_service" },
    { id: "urgency", question: "É para hoje ou pode aguardar?", required: false, field: "urgency" },
  ],
  objections: [
    {
      id: "price",
      objection: "preço",
      safeResponseGuidance: "Reconhecer a objeção e encaminhar para humano avaliar condição, sem prometer desconto.",
      requiresHuman: true,
    },
    {
      id: "availability",
      objection: "estoque/disponibilidade",
      safeResponseGuidance: "Usar somente status do catálogo; se houver dúvida, pedir confirmação humana.",
      requiresHuman: true,
    },
  ],
  allowedCallsToAction: [
    "pedir dados do veículo",
    "encaminhar para balcão",
    "encaminhar para oficina",
    "preparar follow-up",
    "pedir confirmação humana",
  ],
  approvedClaims: [
    "preços vêm do catálogo quando houver match seguro",
    "estoque precisa seguir o status do catálogo",
    "descontos, reservas e pagamentos dependem de atendente",
  ],
  forbiddenClaims: [
    "garantir estoque",
    "garantir aplicação sem match seguro",
    "prometer desconto",
    "enviar PIX",
    "confirmar reserva",
    "confirmar retirada",
    "confirmar agenda",
    "fechar venda automaticamente",
  ],
  pricingAuthority: "catalog",
  stockAuthority: "catalog",
  responseMode: "observer",
};

export const INTERNAL_COMMERCIAL_PROFILE_PLACEHOLDERS: CommercialAgentProfile[] = [
  buildInternalPlaceholder("moriah-systems-commercial", "Moriah Systems"),
  buildInternalPlaceholder("allan-personal-commercial", "Allan/Pessoal"),
  buildInternalPlaceholder("viciados-commercial", "Viciados em Trilhas"),
  buildInternalPlaceholder("mk-shalom-commercial", "MK Shalom"),
  buildInternalPlaceholder("oriahfin-commercial", "OriahFin"),
  buildInternalPlaceholder("moriah-products-commercial", "Produtos próprios da Moriah"),
];

export const COMMERCIAL_AGENT_PROFILES = [
  LIPS_COMMERCIAL_PROFILE,
  ...INTERNAL_COMMERCIAL_PROFILE_PLACEHOLDERS,
];

function buildInternalPlaceholder(id: string, businessName: string): CommercialAgentProfile {
  return {
    id,
    tenantId: "platform",
    organizationId: id.replace(/-commercial$/, ""),
    enabled: false,
    stage: "internal_alpha",
    businessName,
    positioning: "Perfil comercial interno em preparação controlada.",
    targetAudience: [],
    products: [],
    qualificationQuestions: [],
    objections: [],
    allowedCallsToAction: ["observar conversa", "sugerir follow-up manual"],
    approvedClaims: [],
    forbiddenClaims: ["enviar automaticamente", "prometer condições não aprovadas"],
    pricingAuthority: "human",
    stockAuthority: "human",
    responseMode: "observer",
  };
}

export function getCommercialAgentProfile(input: { tenantId: string; organizationId: string }) {
  return COMMERCIAL_AGENT_PROFILES.find(
    (profile) => profile.tenantId === input.tenantId && profile.organizationId === input.organizationId,
  ) ?? null;
}

export function isLipsCommercialProfile(profile: CommercialAgentProfile) {
  return profile.id === LIPS_COMMERCIAL_PROFILE.id;
}

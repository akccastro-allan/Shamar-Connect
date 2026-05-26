import type { CrmConversationEvent, CrmStage, LeadIntent, LeadScoreResult } from "@/types/crm";

const intentKeywords: Record<LeadIntent, string[]> = {
  quote: ["preço", "valor", "orçamento", "plano", "proposta", "quanto custa"],
  catalog: ["catálogo", "produto", "modelos", "opções", "estoque"],
  payment: ["pagamento", "pix", "boleto", "cartão", "link"],
  follow_up: ["retorno", "amanhã", "depois", "semana", "reunião", "teste"],
  support: ["problema", "erro", "ajuda", "suporte", "não funciona"],
  unknown: [],
};

const urgencyKeywords = ["urgente", "hoje", "agora", "fechar", "contratar"];

function includesAnyKeyword(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function detectIntent(text: string): LeadIntent {
  const entries = Object.entries(intentKeywords) as Array<[LeadIntent, string[]]>;
  const match = entries.find(([, keywords]) => includesAnyKeyword(text, keywords));
  return match?.[0] ?? "unknown";
}

function stageFromIntent(intent: LeadIntent): CrmStage {
  if (intent === "quote" || intent === "payment") return "proposal";
  if (intent === "catalog" || intent === "follow_up") return "qualified";
  return "new";
}

export function scoreConversationForCrm(event: Pick<CrmConversationEvent, "body" | "direction">): LeadScoreResult {
  const intent = detectIntent(event.body);
  const reasons: string[] = [];
  let score = event.direction === "inbound" ? 20 : 10;

  if (intent === "quote") {
    score += 45;
    reasons.push("Pediu preço, orçamento ou proposta.");
  }

  if (intent === "payment") {
    score += 55;
    reasons.push("Falou sobre pagamento ou fechamento.");
  }

  if (intent === "catalog") {
    score += 30;
    reasons.push("Demonstrou interesse por produto ou catálogo.");
  }

  if (intent === "follow_up") {
    score += 25;
    reasons.push("Indicou janela de retorno ou próximo passo.");
  }

  if (intent === "support") {
    score += 10;
    reasons.push("Demanda parece atendimento ou suporte.");
  }

  if (includesAnyKeyword(event.body, urgencyKeywords)) {
    score += 20;
    reasons.push("Sinal de urgência ou intenção de fechamento.");
  }

  const finalScore = Math.min(score, 100);
  const recommendedStage = stageFromIntent(intent);
  const recommendedAction = finalScore >= 75
    ? "Priorizar atendimento humano e criar proposta no CRM."
    : finalScore >= 45
      ? "Qualificar necessidade, registrar oportunidade e agendar follow-up."
      : "Responder com triagem consultiva e enriquecer contato.";

  return {
    score: finalScore,
    intent,
    recommendedStage,
    recommendedAction,
    reasons: reasons.length ? reasons : ["Ainda não há sinal comercial forte."],
  };
}

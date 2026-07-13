import type { CommercialAnalysis, CommercialContext, CommercialStage, LeadTemperature } from "./types.ts";

const HOT_PATTERNS = [/\bhoje\b/i, /\bagora\b/i, /\burgente\b/i, /\bfechar\b/i, /\bcomprar\b/i, /\btem\s+ai\b/i];
const OBJECTION_PATTERNS = [
  { label: "preço", pattern: /\b(caro|preço|valor|desconto|mais barato)\b/i },
  { label: "estoque", pattern: /\b(tem em estoque|dispon[ií]vel|pra hoje|retirar)\b/i },
  { label: "aplicação", pattern: /\b(serve|aplica|compat[ií]vel|d[aá] certo)\b/i },
  { label: "pagamento", pattern: /\b(pix|cart[aã]o|parcel|boleto)\b/i },
];

export function analyzeCommercialConversation(context: CommercialContext): CommercialAnalysis {
  const text = context.messages.map((message) => message.body ?? "").join("\n");
  const missingInformation = collectMissingInformation(context, text);
  const objections = OBJECTION_PATTERNS.filter((item) => item.pattern.test(text)).map((item) => item.label);
  const stage = detectStage(text, missingInformation, objections);
  const temperature = detectTemperature(text, stage);
  const riskFlags = collectRiskFlags(context, text);

  return {
    intent: detectIntent(context, text),
    stage,
    temperature,
    confidence: confidenceFor(context, text, missingInformation),
    objections,
    missingInformation,
    recommendedNextAction: nextActionFor(stage, missingInformation, objections),
    recommendedDepartment: recommendedDepartmentFor(context, text),
    requiresHuman: riskFlags.length > 0 || objections.includes("preço") || objections.includes("pagamento"),
    riskFlags,
    summary: summarize(context, text),
  };
}

function detectIntent(context: CommercialContext, text: string) {
  if (context.classification?.intent) return context.classification.intent;
  if (/\b(oficina|agenda|revis[aã]o|servi[cç]o|barulho|trocar)\b/i.test(text)) return "service_opportunity";
  if (/\b(pe[cç]a|pastilha|filtro|correia|amortecedor|vela)\b/i.test(text)) return "parts_quote";
  if (/\b(pre[cç]o|valor|quanto)\b/i.test(text)) return "price_check";
  return "commercial_conversation";
}

function detectStage(text: string, missingInformation: string[], objections: string[]): CommercialStage {
  if (/\b(comprei|fechado|pago|vou ficar|pode separar)\b/i.test(text)) return "ready_to_close";
  if (objections.length > 0) return "objection";
  if (/\b(or[cç]amento|proposta|valor final)\b/i.test(text)) return "offer_preparation";
  if (missingInformation.length === 0 && /\b(ve[ií]culo|ano|modelo|pe[cç]a|servi[cç]o)\b/i.test(text)) return "qualified";
  if (text.trim()) return "qualifying";
  return "new";
}

function detectTemperature(text: string, stage: CommercialStage): LeadTemperature {
  if (HOT_PATTERNS.some((pattern) => pattern.test(text)) || ["ready_to_close", "negotiation"].includes(stage)) return "hot";
  if (["qualified", "offer_preparation", "objection"].includes(stage)) return "warm";
  return "cold";
}

function collectMissingInformation(context: CommercialContext, text: string) {
  const fromClassifier = context.classification?.missingFields ?? [];
  const missing = new Set(fromClassifier);

  for (const question of context.profile.qualificationQuestions) {
    if (!question.required) continue;
    if (question.field === "vehicle" && !context.classification?.vehicle && !/\b(gol|palio|corolla|corsa|nivus|uno|fox|hb20|onix)\b/i.test(text)) missing.add("veículo");
    if (question.field === "year" && !context.classification?.year && !/\b(19|20)\d{2}\b/.test(text)) missing.add("ano do veículo");
    if (question.field === "part_or_service" && !context.classification?.family && !/\b(pe[cç]a|filtro|pastilha|correia|servi[cç]o|oficina)\b/i.test(text)) missing.add("peça ou serviço");
  }

  return Array.from(missing);
}

function collectRiskFlags(context: CommercialContext, text: string) {
  const flags = new Set<string>();
  if (context.conversation.isGroup) flags.add("group_conversation");
  if (/\b(pix|desconto|reserva|retirada|agenda|garante|garantido)\b/i.test(text)) flags.add("human_commercial_authority_required");
  if (context.classification?.stockStatus === "confirm") flags.add("stock_requires_confirmation");
  if (!context.classification?.safeMatch && /\b(serve|aplica|compat[ií]vel)\b/i.test(text)) flags.add("application_requires_safe_match");
  return Array.from(flags);
}

function confidenceFor(context: CommercialContext, text: string, missingInformation: string[]) {
  let confidence = text.trim() ? 0.55 : 0.2;
  if (context.classification?.safeMatch) confidence += 0.2;
  if (missingInformation.length === 0) confidence += 0.15;
  if (context.messages.length >= 3) confidence += 0.1;
  return Math.min(0.95, Number(confidence.toFixed(2)));
}

function nextActionFor(stage: CommercialStage, missingInformation: string[], objections: string[]) {
  if (missingInformation.length > 0) return `qualificar: pedir ${missingInformation.join(", ")}`;
  if (objections.includes("preço")) return "acionar humano para avaliar condição sem prometer desconto";
  if (objections.includes("estoque")) return "confirmar disponibilidade pelo catálogo ou com atendente";
  if (stage === "ready_to_close") return "handoff humano para fechamento manual";
  if (stage === "qualified") return "preparar orçamento ou encaminhar ao departamento correto";
  return "continuar qualificação comercial";
}

function recommendedDepartmentFor(context: CommercialContext, text: string) {
  if (/\b(oficina|agenda|revis[aã]o|servi[cç]o|barulho|trocar)\b/i.test(text)) return "Oficina";
  if (/\b(pix|pagamento|boleto|nota|financeiro)\b/i.test(text)) return "Financeiro";
  if (context.profile.businessName.toLowerCase().includes("lips")) return "Balcão";
  return undefined;
}

function summarize(context: CommercialContext, text: string) {
  if (!text.trim()) return "Conversa sem mensagens suficientes para análise comercial.";
  const lastInbound = [...context.messages].reverse().find((message) => message.direction === "inbound")?.body;
  return lastInbound ? `Cliente demonstrou interesse comercial. Última mensagem: ${lastInbound}` : "Conversa comercial em acompanhamento.";
}

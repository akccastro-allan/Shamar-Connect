// Supervised WhatsApp AI — deterministic/mock engine.
// No external LLM calls until an API key is wired in.
// All business rules are enforced here; nothing is sent without human approval.

export type AiMode = "off" | "copilot" | "assisted" | "human_only";

export type AiIntent =
  | "greeting"
  | "quote"
  | "scheduling"
  | "finance"
  | "urgent"
  | "human_requested"
  | "media"
  | "price"
  | "date_event"
  | "difficulty"
  | "equipment"
  | "safety"
  | "booking"
  | "cancellation"
  | "complaint"
  | "unknown";

export type RiskLevel = "low" | "medium" | "high";

export type ClassifyResult = {
  intent: AiIntent;
  riskLevel: RiskLevel;
  blockedReason: string | null;
};

export type SuggestResult = {
  suggestion: string;
  intent: AiIntent;
  riskLevel: RiskLevel;
  blockedReason: string | null;
  blocked: boolean;
};

export type ConversationForAi = {
  id: string;
  is_group: boolean | null;
  external_chat_id: string;
  requires_human?: boolean | null;
  pending_reason?: string | null;
};

// Words that trigger HIGH risk — human must handle
const HIGH_RISK_PATTERNS = [
  /\bpagamento\b/i,
  /\bpagar\b/i,
  /\bpix\b/i,
  /\bdesconto\b/i,
  /\bcancelar\b/i,
  /\bcancelamento\b/i,
  /\breembolso\b/i,
  /\bdevolu/i,
  /\breclamação\b/i,
  /\breclamo\b/i,
  /\bjurídico\b/i,
  /\bprocon\b/i,
  /\bjuiz\b/i,
  /\bprocesso\b/i,
  /\badvogado\b/i,
];

// Words that map to MEDIUM risk — AI suggests cautiously
const MEDIUM_RISK_PATTERNS = [
  /\breserva\b/i,
  /\bconfirm/i,
  /\bvaga\b/i,
  /\bdisponível\b/i,
  /\bgarantia\b/i,
];

const INTENT_MAP: Array<{ patterns: RegExp[]; intent: AiIntent }> = [
  { patterns: [/\boi\b/i, /\bolá\b/i, /\bbom dia\b/i, /\bboa tarde\b/i, /\bboa noite\b/i, /\btudo bem\b/i], intent: "greeting" },
  { patterns: [/\borçamento\b/i, /\bvalor\b/i, /\bpreço\b/i, /\bquanto\b/i, /\bcotação\b/i, /\bpeça\b/i], intent: "quote" },
  { patterns: [/\bagendar\b/i, /\bagenda\b/i, /\bharário\b/i, /\bmarcar\b/i, /\brevisão\b/i], intent: "scheduling" },
  { patterns: [/\bboleto\b/i, /\bsegunda via\b/i, /\bfinanceiro\b/i, /\bnota\b/i, /\bnf\b/i, /\bcobrança\b/i], intent: "finance" },
  { patterns: [/\burgente\b/i, /\bemergência\b/i, /\bsocorro\b/i], intent: "urgent" },
  { patterns: [/\batendente\b/i, /\bhumano\b/i, /\bpessoa\b/i, /\bvendedor\b/i, /\bfalar com\b/i], intent: "human_requested" },
  // Viciados em Trilhas specific
  { patterns: [/\btrilha\b/i, /\bdificuldade\b/i, /\bnível\b/i, /\bpercurso\b/i], intent: "difficulty" },
  { patterns: [/\bequipamento\b/i, /\bboots?\b/i, /\bmochila\b/i, /\bcantil\b/i], intent: "equipment" },
  { patterns: [/\bseguro\b/i, /\bsegurança\b/i, /\bperigo\b/i, /\barriscado\b/i], intent: "safety" },
  { patterns: [/\bcancelar\b/i, /\bcancelamento\b/i], intent: "cancellation" },
  { patterns: [/\breclamação\b/i, /\binsatisfeit/i, /\bproblema com\b/i], intent: "complaint" },
  { patterns: [/\bpagamento\b/i, /\bpagar\b/i, /\bpix\b/i, /\bdesconto\b/i], intent: "booking" },
];

// Canned responses for deterministic mock — grouped by intent
const RESPONSES: Record<AiIntent, string> = {
  greeting: "Olá! Tudo bem? Em que posso ajudar hoje?",
  quote: "Perfeito. Para orçamento, envie por favor: modelo do veículo, ano, peça ou serviço desejado, e uma foto se tiver. Assim que recebermos, um atendente confirma valor.",
  scheduling: "Certo. Para agendamento, me informe: nome, serviço desejado, melhor dia e horário. Um atendente vai confirmar disponibilidade.",
  finance: "Entendi. Para localizar seu atendimento, informe o nome completo do titular ou CPF/CNPJ.",
  urgent: "Entendi a urgência. Vou encaminhar para um atendente agora.",
  human_requested: "Certo. Vou encaminhar você para um atendente.",
  media: "Recebi sua mídia. Um atendente vai verificar e retornar em breve.",
  price: "Vou confirmar essa informação com a equipe para te passar certinho.",
  date_event: "Vou confirmar essa informação com a equipe para te passar certinho.",
  difficulty: "A dificuldade de cada trilha varia. Posso perguntar à equipe os detalhes do percurso que você tem interesse. Qual trilha é?",
  equipment: "Os equipamentos recomendados dependem do percurso. Quer que eu passe para a equipe verificar a lista do passeio que você quer?",
  safety: "Segurança é nossa prioridade. Todos os percursos passam por checagem de segurança. Posso passar mais detalhes com a equipe — qual passeio te interessa?",
  booking: "Para reservas e pagamento, vou encaminhar para um atendente confirmar disponibilidade e condições.",
  cancellation: "Entendi. Para cancelamentos, preciso encaminhar para um atendente responsável.",
  complaint: "Sinto muito pela experiência. Vou encaminhar você para um atendente para resolvermos isso.",
  unknown: "Recebi sua mensagem. Um atendente vai verificar e retornar em breve.",
};

export function classifyWhatsAppMessage(text: string): ClassifyResult {
  const normalized = text.toLowerCase();

  // Check high risk first
  if (HIGH_RISK_PATTERNS.some((pattern) => pattern.test(normalized))) {
    const intent = detectIntent(normalized);
    return { intent, riskLevel: "high", blockedReason: "high_risk_topic" };
  }

  const intent = detectIntent(normalized);

  // These intents are always high risk regardless of keyword matching
  if (intent === "cancellation" || intent === "complaint" || intent === "booking") {
    return { intent, riskLevel: "high", blockedReason: "high_risk_intent" };
  }

  const riskLevel: RiskLevel = MEDIUM_RISK_PATTERNS.some((p) => p.test(normalized)) ? "medium" : "low";

  return { intent, riskLevel, blockedReason: null };
}

function detectIntent(text: string): AiIntent {
  for (const { patterns, intent } of INTENT_MAP) {
    if (patterns.some((pattern) => pattern.test(text))) return intent;
  }
  return "unknown";
}

export function generateSuggestedReply(
  text: string,
  messageType?: string | null,
): SuggestResult {
  // Media/sticker always forwards to human
  if (messageType && ["image", "video", "audio", "ptt", "document", "sticker"].includes(messageType)) {
    return {
      suggestion: RESPONSES.media,
      intent: "media",
      riskLevel: "medium",
      blockedReason: null,
      blocked: false,
    };
  }

  const { intent, riskLevel, blockedReason } = classifyWhatsAppMessage(text);

  // High risk — suggest escalation text but mark blocked so it requires explicit human approval
  if (riskLevel === "high") {
    return {
      suggestion: RESPONSES[intent] ?? RESPONSES.unknown,
      intent,
      riskLevel: "high",
      blockedReason: blockedReason ?? "high_risk_topic",
      blocked: false, // still show suggestion — human decides; send-approved checks high risk
    };
  }

  return {
    suggestion: RESPONSES[intent] ?? RESPONSES.unknown,
    intent,
    riskLevel,
    blockedReason: null,
    blocked: false,
  };
}

export function shouldBlockAiForConversation(conversation: ConversationForAi): { blocked: boolean; reason: string | null } {
  // ABSOLUTE RULE: groups are never auto-replied
  if (
    conversation.is_group === true ||
    (conversation.external_chat_id && conversation.external_chat_id.endsWith("@g.us"))
  ) {
    return { blocked: true, reason: "group_lead_source_only" };
  }

  return { blocked: false, reason: null };
}

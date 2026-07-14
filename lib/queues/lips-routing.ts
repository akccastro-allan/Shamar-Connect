export type QueueKey = "balcao" | "oficina" | "financeiro" | "supervisao";
export type QueuePriority = "low" | "normal" | "high" | "urgent";
export type QueueStatus = "waiting" | "in_progress" | "awaiting_customer" | "resolved" | "closed";
export type QueueActorRole = "agent" | "supervisor";

export type LipsRoutingInput = {
  conversationId: string;
  messageBody: string;
  automationResult?: string;
  commercialIntent?: string;
  requiresHuman: boolean;
  currentDepartmentId?: string | null;
  currentAssignedUserId?: string | null;
  currentStatus?: string;
};

export type LipsRoutingDecision = {
  queueKey: QueueKey;
  priority: QueuePriority;
  slaMinutes: number;
  reason: string;
  preserveCurrentAssignment: boolean;
};

export const QUEUE_STATUS_TRANSITIONS: Record<QueueStatus, QueueStatus[]> = {
  waiting: ["in_progress"],
  in_progress: ["awaiting_customer", "resolved"],
  awaiting_customer: ["in_progress", "resolved"],
  resolved: ["waiting", "in_progress", "closed"],
  closed: [],
};

const ACTIVE_STATUSES = new Set(["waiting", "in_progress", "awaiting_customer"]);
const PURCHASE_PATTERN = /\b(quero|quero sim|vou querer|pode ser|fechar|comprar|fico com|leva[r]? essa)\b/i;
const PAYMENT_PATTERN = /\b(pix|pagar|pagamento|cart[aã]o|boleto|comprovante|cobran[cç]a|vou pagar|manda.*pix|chave|problema.*pagamento)\b/i;
const RESERVATION_PATTERN = /\b(separa|separar|reserva|reservar|guarda|guardar|deixa separado|retirada|retirar)\b/i;
const SERVICE_PATTERN = /\b(oficina|servi[cç]o|troca|trocar|instala[cç][aã]o|instalar|agend|manuten[cç][aã]o|diagn[oó]stico|m[aã]o de obra|[óo]leo)\b/i;
const COMPLAINT_PATTERN = /\b(reclama[cç][aã]o|gerente|respons[aá]vel|fornecedor|parceria|conflito|problema|ruim|defeito|irritad[oa]|insatisfeito|não gostei|nao gostei)\b/i;
const QUOTE_PATTERN = /\b(tem|pre[cç]o|valor|quanto|cota[cç][aã]o|produto|disponibilidade|compatibilidade|desconto|negocia[cç][aã]o|pastilha|filtro|correia|amortecedor|vela|pe[cç]a)\b/i;

export function routeLipsConversation(input: LipsRoutingInput): LipsRoutingDecision {
  const text = `${input.messageBody || ""} ${input.automationResult || ""} ${input.commercialIntent || ""}`.trim();
  const preserveCurrentAssignment = Boolean(input.currentAssignedUserId && ACTIVE_STATUSES.has(String(input.currentStatus || "")));

  if (PAYMENT_PATTERN.test(text)) return urgent("financeiro", "payment_or_pix", preserveCurrentAssignment);
  if (RESERVATION_PATTERN.test(text)) return { queueKey: "balcao", priority: "urgent", slaMinutes: 20, reason: "reservation_or_separation", preserveCurrentAssignment };
  if (COMPLAINT_PATTERN.test(text)) return urgent("supervisao", "complaint_or_manager", preserveCurrentAssignment);
  if (SERVICE_PATTERN.test(text)) return { queueKey: "oficina", priority: "high", slaMinutes: 10, reason: "service_or_schedule", preserveCurrentAssignment };
  if (PURCHASE_PATTERN.test(text)) return { queueKey: "balcao", priority: "high", slaMinutes: 20, reason: "purchase_intent", preserveCurrentAssignment };

  if (!input.requiresHuman && QUOTE_PATTERN.test(text)) {
    return { queueKey: "balcao", priority: "normal", slaMinutes: 20, reason: "safe_quote_automation_allowed", preserveCurrentAssignment: true };
  }

  if (input.requiresHuman) return urgent("supervisao", "unknown_human_required", preserveCurrentAssignment);
  return { queueKey: "balcao", priority: "low", slaMinutes: 20, reason: "default_balcao", preserveCurrentAssignment };
}

export function normalizeDepartmentName(value: string): QueueKey | null {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("balcao")) return "balcao";
  if (normalized.includes("oficina")) return "oficina";
  if (normalized.includes("financeiro")) return "financeiro";
  if (normalized.includes("supervis")) return "supervisao";
  if (normalized.includes("supervisor")) return "supervisao";
  return null;
}

export function departmentLabel(key: QueueKey) {
  if (key === "balcao") return "Balcão";
  if (key === "oficina") return "Oficina";
  if (key === "financeiro") return "Financeiro";
  return "Supervisão";
}

export function canClaimConversation(input: { assignedUserId?: string | null; status?: string | null }) {
  return !input.assignedUserId && String(input.status || "") === "waiting";
}

export function canTransitionQueueStatus(input: {
  from?: string | null;
  to: QueueStatus;
  actorRole?: QueueActorRole;
  hasAssignee?: boolean;
  reassigningResolved?: boolean;
}) {
  const from = String(input.from || "waiting") as QueueStatus;
  if (!OFFICIAL_QUEUE_STATUS_SET.has(from) || !OFFICIAL_QUEUE_STATUS_SET.has(input.to)) return false;
  if (from === input.to) return true;
  if (input.to === "closed" && input.actorRole !== "supervisor") return false;
  if (from === "closed") return false;
  if (from === "resolved" && input.to === "in_progress") return input.reassigningResolved === true && input.hasAssignee === true;
  if (input.to === "in_progress" && input.hasAssignee !== true) return false;
  return QUEUE_STATUS_TRANSITIONS[from].includes(input.to);
}

export function assertQueueTransition(input: Parameters<typeof canTransitionQueueStatus>[0]) {
  if (!canTransitionQueueStatus(input)) throw new Error(`invalid_queue_transition:${input.from || "waiting"}->${input.to}`);
}

export function reopenAssignment(input: { lastAssignedUserId?: string | null; lastResolvedAt?: string | null; now?: Date; preferWithinHours?: number }) {
  if (!input.lastAssignedUserId) return null;
  if (!input.lastResolvedAt) return input.lastAssignedUserId;
  const resolvedAt = new Date(input.lastResolvedAt).getTime();
  if (Number.isNaN(resolvedAt)) return null;
  const now = input.now ?? new Date();
  const windowMs = (input.preferWithinHours ?? 72) * 60 * 60 * 1000;
  return now.getTime() - resolvedAt <= windowMs ? input.lastAssignedUserId : null;
}

export const OFFICIAL_QUEUE_STATUS_SET = new Set<QueueStatus>(["waiting", "in_progress", "awaiting_customer", "resolved", "closed"]);

export function queueStatusLabel(status?: string | null) {
  if (status === "waiting") return "Aguardando atendimento";
  if (status === "in_progress") return "Em atendimento";
  if (status === "awaiting_customer") return "Aguardando cliente";
  if (status === "resolved") return "Resolvida";
  if (status === "closed") return "Encerrada";
  if (status === "open") return "Aberta";
  if (status === "pending") return "Pendente";
  if (status === "archived") return "Arquivada";
  return "Aguardando atendimento";
}

function urgent(queueKey: QueueKey, reason: string, preserveCurrentAssignment: boolean): LipsRoutingDecision {
  return { queueKey, priority: "urgent", slaMinutes: 5, reason, preserveCurrentAssignment };
}

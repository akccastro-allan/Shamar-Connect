export type QueueKey = "balcao" | "oficina" | "supervisao";
export type QueuePriority = "normal" | "high" | "urgent";
export type QueueStatus = "new" | "queued" | "assigned" | "in_progress" | "awaiting_customer" | "pending_internal" | "resolved" | "closed";

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

const ACTIVE_STATUSES = new Set(["assigned", "in_progress", "awaiting_customer", "pending_internal"]);
const PURCHASE_PATTERN = /\b(quero|quero sim|vou querer|pode ser|fechar|comprar|fico com|leva[r]? essa)\b/i;
const PAYMENT_PATTERN = /\b(pix|pagar|pagamento|cart[aã]o|boleto|vou pagar|manda.*pix|chave)\b/i;
const RESERVATION_PATTERN = /\b(separa|separar|reserva|reservar|guarda|guardar|deixa separado)\b/i;
const SERVICE_PATTERN = /\b(oficina|servi[cç]o|troca|trocar|instala[cç][aã]o|instalar|agend|manuten[cç][aã]o|diagn[oó]stico|[óo]leo)\b/i;
const COMPLAINT_PATTERN = /\b(reclama[cç][aã]o|gerente|respons[aá]vel|problema|ruim|defeito|insatisfeito|não gostei|nao gostei)\b/i;
const QUOTE_PATTERN = /\b(tem|pre[cç]o|valor|quanto|cota[cç][aã]o|pastilha|filtro|correia|amortecedor|vela|pe[cç]a)\b/i;

export function routeLipsConversation(input: LipsRoutingInput): LipsRoutingDecision {
  const text = `${input.messageBody || ""} ${input.automationResult || ""} ${input.commercialIntent || ""}`.trim();
  const preserveCurrentAssignment = Boolean(input.currentAssignedUserId && ACTIVE_STATUSES.has(String(input.currentStatus || "")));

  if (PAYMENT_PATTERN.test(text)) return urgent("supervisao", "payment_or_pix", preserveCurrentAssignment);
  if (RESERVATION_PATTERN.test(text)) return urgent("supervisao", "reservation_or_separation", preserveCurrentAssignment);
  if (COMPLAINT_PATTERN.test(text)) return urgent("supervisao", "complaint_or_manager", preserveCurrentAssignment);
  if (SERVICE_PATTERN.test(text)) return { queueKey: "oficina", priority: "high", slaMinutes: 10, reason: "service_or_schedule", preserveCurrentAssignment };
  if (PURCHASE_PATTERN.test(text)) return { queueKey: "balcao", priority: "high", slaMinutes: 20, reason: "purchase_intent", preserveCurrentAssignment };

  if (!input.requiresHuman && QUOTE_PATTERN.test(text)) {
    return { queueKey: "balcao", priority: "normal", slaMinutes: 20, reason: "safe_quote_automation_allowed", preserveCurrentAssignment: true };
  }

  if (input.requiresHuman) return urgent("supervisao", "unknown_human_required", preserveCurrentAssignment);
  return { queueKey: "balcao", priority: "normal", slaMinutes: 20, reason: "default_balcao", preserveCurrentAssignment };
}

export function normalizeDepartmentName(value: string): QueueKey | null {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("balcao")) return "balcao";
  if (normalized.includes("oficina")) return "oficina";
  if (normalized.includes("supervis")) return "supervisao";
  if (normalized.includes("supervisor")) return "supervisao";
  return null;
}

export function departmentLabel(key: QueueKey) {
  if (key === "balcao") return "Balcão";
  if (key === "oficina") return "Oficina";
  return "Supervisão";
}

export function canClaimConversation(input: { assignedUserId?: string | null; status?: string | null }) {
  return !input.assignedUserId && ["new", "queued", "assigned"].includes(String(input.status || ""));
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

function urgent(queueKey: QueueKey, reason: string, preserveCurrentAssignment: boolean): LipsRoutingDecision {
  return { queueKey, priority: "urgent", slaMinutes: 0, reason, preserveCurrentAssignment };
}

export const LIPS_TENANT_ID = "e6abeaae-29fc-4186-b56a-361a69cb846d";
export const LIPS_ORGANIZATION_ID = "8f074193-bf58-4537-9842-720619a9f259";
export const LIPS_CHANNEL_ID = "1f65f8d2-2609-42d9-ae57-709aecdb43da";
export const LIPS_CURRENT_SESSION_ID = "lips-main";
export const LIPS_OFFICIAL_STAGING_SESSION_ID = "lips-main-6108";
export const LIPS_OFFICIAL_PHONE = "552133946108";
export const LIPS_OFFICIAL_PHONE_MASKED = "5521***6108";
export const LIPS_ACTIVATION_CONFIRMATION = "ATIVAR LIPS 6108";

export type LipsCutoverState =
  | "sessao_atual_identificada"
  | "aguardando_aparelho"
  | "qr_pronto"
  | "aguardando_leitura"
  | "sessao_conectando"
  | "numero_incorreto"
  | "numero_oficial_confirmado"
  | "pronto_para_ativacao"
  | "ativo"
  | "falhou";

export type LipsStaffRole = "atendente" | "supervisor" | "oficina" | "financeiro";

export const LIPS_REQUIRED_DEPARTMENTS = ["Balcão", "Oficina", "Financeiro", "Supervisão"] as const;

export const LIPS_DAY_ONE_QUICK_REPLIES = [
  {
    title: "Saudação",
    body: "Olá! Você está falando com a Auto Peças e Auto Center Lips. Como podemos ajudar?",
    category: "lips",
    tags: ["lips", "primeiro-dia", "saudacao"],
  },
  {
    title: "Dados do veículo",
    body: "Para localizar a peça correta, informe modelo, ano, motorização e, se possível, a placa.",
    category: "lips",
    tags: ["lips", "primeiro-dia", "veiculo"],
  },
  {
    title: "Consulta de peça",
    body: "Vamos verificar disponibilidade e valor. Um atendente dará continuidade ao orçamento.",
    category: "lips",
    tags: ["lips", "primeiro-dia", "orcamento"],
  },
  {
    title: "Oficina",
    body: "Também realizamos serviços e agendamentos. Informe o veículo e o serviço desejado.",
    category: "lips",
    tags: ["lips", "primeiro-dia", "oficina"],
  },
  {
    title: "Encaminhamento",
    body: "Sua solicitação foi encaminhada para o setor responsável.",
    category: "lips",
    tags: ["lips", "primeiro-dia", "transferencia"],
  },
  {
    title: "Aguarde",
    body: "Recebemos sua mensagem. Em breve um atendente continuará o atendimento.",
    category: "lips",
    tags: ["lips", "primeiro-dia", "aguarde"],
  },
] as const;

export const LIPS_STAFF_PROFILES: Record<LipsStaffRole, { label: string; permissions: string[]; forbidden: string[] }> = {
  atendente: {
    label: "Atendente",
    permissions: ["visualizar_inbox_lips", "assumir_conversa", "responder", "transferir", "nota_interna", "encerrar", "reabrir"],
    forbidden: ["financeiro", "centro_de_comando", "integracoes"],
  },
  supervisor: {
    label: "Supervisor",
    permissions: ["visualizar_todas_filas", "redistribuir", "acompanhar_atendentes", "metricas", "reabrir"],
    forbidden: ["centro_de_comando"],
  },
  oficina: {
    label: "Oficina",
    permissions: ["visualizar_oficina", "responder", "nota_interna", "encaminhar_balcao"],
    forbidden: ["administrar_usuarios", "centro_de_comando"],
  },
  financeiro: {
    label: "Financeiro",
    permissions: ["visualizar_financeiro", "responder_quando_necessario"],
    forbidden: ["conversas_gerais_sem_permissao", "centro_de_comando"],
  },
};

export function normalizePhone(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

export function maskLipsPhone(value?: string | null) {
  const digits = normalizePhone(value);
  if (!digits) return null;
  if (digits === LIPS_OFFICIAL_PHONE) return LIPS_OFFICIAL_PHONE_MASKED;
  if (digits.length <= 4) return `***${digits}`;
  return `${digits.slice(0, 4)}***${digits.slice(-4)}`;
}

export function isLipsOfficialPhone(value?: string | null) {
  return normalizePhone(value) === LIPS_OFFICIAL_PHONE;
}

export function normalizeQueueStatus(value?: string | null) {
  return value || "waiting";
}

export function isUnassignedConversation(input: { queue_status?: string | null; assigned_user_id?: string | null; assigned_to?: string | null }) {
  return !input.assigned_user_id && !input.assigned_to && normalizeQueueStatus(input.queue_status) === "waiting";
}

export function canShowLipsOfficialQr(input: { isGlobalOperator: boolean; appliancePresent: boolean; featureExecute: boolean }) {
  return input.isGlobalOperator === true && input.appliancePresent === true && input.featureExecute === false;
}

export function evaluateLipsOfficialSession(input: { status?: string | null; phone?: string | null }) {
  const status = String(input.status || "unknown");
  if (status === "ready" && isLipsOfficialPhone(input.phone)) {
    return { state: "numero_oficial_confirmado" as LipsCutoverState, phoneMasked: LIPS_OFFICIAL_PHONE_MASKED, valid: true };
  }
  if (status === "ready" && normalizePhone(input.phone)) {
    return { state: "numero_incorreto" as LipsCutoverState, phoneMasked: maskLipsPhone(input.phone), valid: false };
  }
  if (status === "qr") return { state: "qr_pronto" as LipsCutoverState, phoneMasked: null, valid: false };
  if (status === "authenticated" || status === "connecting") return { state: "sessao_conectando" as LipsCutoverState, phoneMasked: null, valid: false };
  if (status === "error" || status === "failed") return { state: "falhou" as LipsCutoverState, phoneMasked: null, valid: false };
  return { state: "aguardando_aparelho" as LipsCutoverState, phoneMasked: null, valid: false };
}

export function canPreflightActivateLipsOfficialSession(input: {
  confirmation: string;
  sessionStatus?: string | null;
  phone?: string | null;
  tenantId?: string | null;
  organizationId?: string | null;
  channelId?: string | null;
  noActiveRuns: boolean;
  noLocks: boolean;
  featureExecute: boolean;
}) {
  const blockers: string[] = [];
  if (input.confirmation !== LIPS_ACTIVATION_CONFIRMATION) blockers.push("confirmacao_incorreta");
  if (input.tenantId !== LIPS_TENANT_ID) blockers.push("tenant_lips_incorreto");
  if (input.organizationId !== LIPS_ORGANIZATION_ID) blockers.push("organization_lips_incorreta");
  if (input.channelId !== LIPS_CHANNEL_ID) blockers.push("channel_lips_incorreto");
  if (input.sessionStatus !== "ready") blockers.push("sessao_nao_ready");
  if (!isLipsOfficialPhone(input.phone)) blockers.push("telefone_nao_6108");
  if (!input.noActiveRuns) blockers.push("run_ativa");
  if (!input.noLocks) blockers.push("lock_ativo");
  if (input.featureExecute !== false) blockers.push("feature_execute_deve_permanecer_false");
  return { ok: blockers.length === 0, blockers };
}

export function sanitizeAuditMetadata(input: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const lower = key.toLowerCase();
    if (["token", "cookie", "secret", "authorization", "qr", "qrcode", "baseurl", "password", "hash"].some((part) => lower.includes(part))) continue;
    if (typeof value === "string") sanitized[key] = value.replace(/https?:\/\/\S+/g, "[url-redacted]").replace(/\b\d{10,13}\b/g, "[phone-redacted]").slice(0, 220);
    else sanitized[key] = value;
  }
  return sanitized;
}

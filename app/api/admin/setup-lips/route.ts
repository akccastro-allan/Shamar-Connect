/**
 * POST /api/admin/setup-lips
 * Configura a operação inicial da Lips de forma idempotente:
 * - Departamentos: Balcão, Oficina, Supervisão
 * - Pipeline com etapas do funil de atendimento
 * - Respostas rápidas iniciais
 * Restrito a administradores da plataforma.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { assertPlatformAdminApi } from "@/lib/features/api-guards";

const LIPS_DEPARTMENTS = [
  { name: "Balcão",     color: "#2ABFAB", description: "Peças, produtos, preços e estoque" },
  { name: "Oficina",    color: "#C9952A", description: "Serviços, agendamento e manutenção" },
  { name: "Supervisão", color: "#1B2F5B", description: "Escalações e acompanhamento gerencial" },
  { name: "Geral",      color: "#94a3b8", description: "Triagem e conversas não classificadas" },
];

const LIPS_PIPELINE_STAGES = [
  { name: "Novo contato",              color: "#94a3b8", position: 1 },
  { name: "Triagem automática",        color: "#2ABFAB", position: 2 },
  { name: "Encaminhado para Balcão",   color: "#3b82f6", position: 3 },
  { name: "Aguardando Balcão",         color: "#f59e0b", position: 4 },
  { name: "Encaminhado para Oficina",  color: "#8b5cf6", position: 5 },
  { name: "Aguardando Oficina",        color: "#f59e0b", position: 6 },
  { name: "Escalado para Supervisor",  color: "#ef4444", position: 7 },
  { name: "Atendimento respondido",    color: "#10b981", position: 8 },
  { name: "Aguardando cliente",        color: "#6b7280", position: 9 },
  { name: "Finalizado",                color: "#1B2F5B", position: 10 },
  { name: "Perdido",                   color: "#dc2626", position: 11 },
];

const LIPS_QUICK_REPLIES = [
  {
    shortcut: "saudacao",
    title: "Saudação",
    body: "Olá! Bem-vindo à Lips Auto Center. Sou do atendimento. Como posso te ajudar hoje?",
  },
  {
    shortcut: "pedir_ano",
    title: "Pedir ano do veículo",
    body: "Qual o ano do seu veículo?",
  },
  {
    shortcut: "pedir_modelo",
    title: "Pedir modelo do veículo",
    body: "Qual o modelo do seu veículo? (Ex: Corolla, HB20, Strada...)",
  },
  {
    shortcut: "pedir_compatibilidade",
    title: "Pedir dados para compatibilidade",
    body: "Para verificar a compatibilidade correta, poderia informar o modelo, ano e versão do veículo?",
  },
  {
    shortcut: "encaminhar_balcao",
    title: "Encaminhar para Balcão",
    body: "Vou encaminhar você para o nosso Balcão, que vai confirmar disponibilidade, preço e prazo. Um momento! 🔧",
  },
  {
    shortcut: "encaminhar_oficina",
    title: "Encaminhar para Oficina",
    body: "Vou encaminhar para nossa equipe de Oficina, que vai te dar mais detalhes sobre o serviço e agendamento. Um momento! 🚗",
  },
  {
    shortcut: "fora_horario",
    title: "Fora do horário",
    body: "Olá! No momento estamos fora do horário de atendimento. Atendemos de segunda a sexta das 8h às 18h e sábados das 8h às 14h. Sua mensagem foi registrada e responderemos no próximo horário de atendimento. Obrigado pela compreensão!",
  },
  {
    shortcut: "preco_estoque",
    title: "Informar preço/estoque com última sincronização",
    body: "Temos disponível: [PRODUTO] por R$ [PREÇO]. Estoque conforme última sincronização: [QUANTIDADE] unidade(s). Nosso Balcão confirma disponibilidade antes da separação.",
  },
  {
    shortcut: "produto_nao_encontrado",
    title: "Produto não encontrado no catálogo",
    body: "Não localizei essa peça no nosso catálogo no momento. Vou encaminhar para o Balcão verificar diretamente no sistema. Pode acontecer de termos sem registro atualizado.",
  },
  {
    shortcut: "confirmar_setor",
    title: "Confirmar com setor responsável",
    body: "Perfeito! Vou confirmar com o setor responsável e já retorno com mais detalhes. Aguarde um instante!",
  },
];

export async function POST(request: NextRequest) {
  try {
    const ctx = await getRequiredAppContext();
    const admin = await assertPlatformAdminApi(ctx, "Acesso restrito a administradores da plataforma.");
    if (!admin.ok) return admin.response;

    const body = await request.json().catch(() => ({}));
    const tenantId     = String(body?.tenantId     || "").trim();
    const organizationId = String(body?.organizationId || "").trim();

    if (!tenantId || !organizationId) {
      return NextResponse.json({ ok: false, error: "tenantId e organizationId são obrigatórios." }, { status: 400 });
    }

    const db = createSupabaseWriteClient();

    // Valida org
    const { data: org } = await db.from("organizations").select("id").eq("id", organizationId).eq("tenant_id", tenantId).maybeSingle();
    if (!org) return NextResponse.json({ ok: false, error: "Organização não encontrada para o tenant." }, { status: 404 });

    const now = new Date().toISOString();
    const report: Record<string, unknown> = {};

    // --- Departamentos ---
    const { data: existingDepts } = await db.from("departments").select("name").eq("tenant_id", tenantId).eq("organization_id", organizationId);
    const existingDeptNames = new Set((existingDepts ?? []).map((d: { name: string }) => d.name));
    const newDepts = LIPS_DEPARTMENTS.filter((d) => !existingDeptNames.has(d.name));

    if (newDepts.length > 0) {
      const { data: created } = await db.from("departments").insert(
        newDepts.map((d) => ({ tenant_id: tenantId, organization_id: organizationId, name: d.name, color: d.color, is_active: true, created_at: now, updated_at: now }))
      ).select("name");
      report.departments_created = (created ?? []).map((d: { name: string }) => d.name);
    } else {
      report.departments_created = [];
    }
    report.departments_skipped = [...existingDeptNames].filter((n) => LIPS_DEPARTMENTS.some((d) => d.name === n));

    // --- Pipeline ---
    // Verifica se existe tabela pipeline_stages (pode não existir ainda)
    let pipelineCreated = 0;
    try {
      const { data: existingStages } = await db.from("pipeline_stages").select("name").eq("tenant_id", tenantId).eq("organization_id", organizationId);
      const existingStageNames = new Set((existingStages ?? []).map((s: { name: string }) => s.name));
      const newStages = LIPS_PIPELINE_STAGES.filter((s) => !existingStageNames.has(s.name));
      if (newStages.length > 0) {
        await db.from("pipeline_stages").insert(
          newStages.map((s) => ({ tenant_id: tenantId, organization_id: organizationId, name: s.name, color: s.color, position: s.position, is_active: true, created_at: now, updated_at: now }))
        );
        pipelineCreated = newStages.length;
      }
    } catch {
      report.pipeline_note = "Tabela pipeline_stages ainda não existe — pular esta etapa.";
    }
    report.pipeline_stages_created = pipelineCreated;

    // --- Respostas rápidas ---
    let qrCreated = 0;
    try {
      const { data: existingQr } = await db.from("quick_replies").select("shortcut").eq("tenant_id", tenantId).eq("organization_id", organizationId);
      const existingShortcuts = new Set((existingQr ?? []).map((q: { shortcut: string }) => q.shortcut));
      const newQr = LIPS_QUICK_REPLIES.filter((q) => !existingShortcuts.has(q.shortcut));
      if (newQr.length > 0) {
        await db.from("quick_replies").insert(
          newQr.map((q) => ({ tenant_id: tenantId, organization_id: organizationId, shortcut: q.shortcut, title: q.title, body: q.body, is_active: true, created_at: now, updated_at: now }))
        );
        qrCreated = newQr.length;
      }
    } catch {
      report.quick_replies_note = "Tabela quick_replies com schema diferente — verificar manualmente.";
    }
    report.quick_replies_created = qrCreated;

    return NextResponse.json({ ok: true, tenantId, organizationId, ...report });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha no setup." }, { status: 500 });
  }
}

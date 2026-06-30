/**
 * POST /api/cron/lips-sla
 * Verifica conversas abertas da Lips com SLA estourado e marca para escalação.
 *
 * Chamar via cron externo (GitHub Actions ou similar) com header:
 *   Authorization: Bearer $CRON_SECRET
 *
 * O que faz:
 * - Busca conversas abertas/pending da Lips dentro do horário comercial.
 * - Calcula tempo decorrido desde last_inbound_at (última mensagem do cliente).
 * - Marca prioridade e flag de escalação quando SLA estourado.
 * - Não envia notificação automática (MVP) — apenas registra para que o
 *   supervisor veja na tela de operações.
 *
 * Futuro: disparar notificação WhatsApp para supervisor via canal interno.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { isWithinBusinessHours, LIPS_ROUTING } from "@/lib/tenant-routing";

export const dynamic = "force-dynamic";

const LIPS_TENANT_ID    = "e6abeaae-29fc-4186-b56a-361a69cb846d";
const LIPS_ORG_ID       = "8f074193-bf58-4537-9842-720619a9f259";
const SLA_BY_DEPT: Record<string, number> = {
  Balcão:  30,
  Oficina: 50,
  Geral:   60,
};
const DEFAULT_SLA = 60;

function slaMinutes(deptName: string | null): number {
  if (!deptName) return DEFAULT_SLA;
  return SLA_BY_DEPT[deptName] ?? DEFAULT_SLA;
}

function assertCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!assertCronSecret(request)) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }

  // Só executar durante horário comercial
  if (!isWithinBusinessHours(LIPS_ROUTING)) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Fora do horário comercial." });
  }

  const db = createSupabaseWriteClient();
  const now = new Date();
  const nowIso = now.toISOString();

  // Busca conversas abertas/pendentes da Lips que precisam de atenção
  const { data: conversations, error } = await db
    .from("whatsapp_conversations")
    .select("id, status, last_inbound_at, department_id, sla_status, departments:department_id(name)")
    .eq("tenant_id", LIPS_TENANT_ID)
    .eq("organization_id", LIPS_ORG_ID)
    .in("status", ["open", "pending"])
    .not("last_inbound_at", "is", null);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const escalated: string[] = [];
  const ok_list: string[] = [];

  for (const conv of (conversations ?? [])) {
    const lastInbound = new Date(conv.last_inbound_at as string);
    const elapsedMin = (now.getTime() - lastInbound.getTime()) / 60_000;
    const deptName = (conv.departments as unknown as { name: string } | null)?.name ?? null;
    const slaMins = slaMinutes(deptName);
    const overdue = elapsedMin > slaMins;
    const currentSla = conv.sla_status as string | null;

    if (overdue && currentSla !== "overdue") {
      const { error: updErr } = await db
        .from("whatsapp_conversations")
        .update({
          sla_status: "overdue",
          updated_at: nowIso,
          metadata: {
            sla_escalated_at: nowIso,
            sla_elapsed_min: Math.round(elapsedMin),
            sla_limit_min: slaMins,
            escalate_to_role: "supervisor",
          },
        })
        .eq("id", conv.id as string);

      if (!updErr) escalated.push(conv.id as string);
    } else {
      ok_list.push(conv.id as string);
    }
  }

  return NextResponse.json({
    ok: true,
    checkedAt: nowIso,
    total: (conversations ?? []).length,
    escalatedCount: escalated.length,
    withinSlaCount: ok_list.length,
    escalatedIds: escalated,
  });
}

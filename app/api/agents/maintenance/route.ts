/**
 * POST /api/agents/maintenance
 * Endpoint opcional: Agent pode chamar para recalcular SLA/status operacional.
 *
 * Autenticação: Bearer token do Agent (mesmo do sync/heartbeat)
 * Roda apenas para tenant/organization do Agent autenticado.
 *
 * O que faz:
 * - Recalcula SLA de conversas abertas da Lips
 * - Marca prioridade quando SLA estourado
 * - Não envia notificação automática (MVP)
 * - Não depende de CRON_SECRET nem Vercel Cron
 *
 * Futuro: disparar notificação para supervisor
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getAuthenticatedAgent } from "@/lib/integrations/agent-auth";
import { isWithinBusinessHours, LIPS_ROUTING } from "@/lib/tenant-routing";

export const dynamic = "force-dynamic";

const SLA_BY_DEPT: Record<string, number> = {
  Balcão: 20,
  Oficina: 10,
  Geral: 60,
};
const DEFAULT_SLA = 60;

function slaMinutes(deptName: string | null): number {
  if (!deptName) return DEFAULT_SLA;
  return SLA_BY_DEPT[deptName] ?? DEFAULT_SLA;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate via Agent Bearer token (same as sync/heartbeat)
    const { agent, source } = await getAuthenticatedAgent(request);

    const tenantId = (agent as Record<string, unknown>).tenant_id as string;
    const organizationId = (agent as Record<string, unknown>).organization_id as string;

    const db = createSupabaseWriteClient();
    const now = new Date();
    const nowIso = now.toISOString();

    // Recalculate SLA for open/pending conversations
    const { data: conversations, error } = await db
      .from("whatsapp_conversations")
      .select("id, status, last_inbound_at, department_id, sla_status, metadata, departments:department_id(name)")
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId)
      .in("status", ["open", "pending"])
      .not("last_inbound_at", "is", null);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const escalated: string[] = [];
    const withinSla: string[] = [];
    const outOfHours: string[] = [];

    for (const conv of conversations ?? []) {
      const lastInbound = new Date(conv.last_inbound_at as string);
      const elapsedMin = (now.getTime() - lastInbound.getTime()) / 60_000;
      const deptName = (conv.departments as unknown as { name: string } | null)?.name ?? null;
      const slaMins = slaMinutes(deptName);
      const currentSla = conv.sla_status as string | null;
      const currentMetadata =
        conv.metadata && typeof conv.metadata === "object" && !Array.isArray(conv.metadata)
          ? conv.metadata as Record<string, unknown>
          : {};
      const escalationReason = deptName === "Oficina" ? "sla_oficina_timeout" : "sla_balcao_timeout";

      // Check if within business hours
      const inBusinessHours = isWithinBusinessHours(LIPS_ROUTING);

      // If outside business hours, don't count as breach
      if (!inBusinessHours) {
        outOfHours.push(conv.id as string);
        // Mark as pending, not breached
        if (currentSla === "overdue" || currentSla === "breached") {
          await db
            .from("whatsapp_conversations")
            .update({
              sla_status: "pending",
              updated_at: nowIso,
            })
            .eq("id", conv.id as string);
        }
        continue;
      }

      // During business hours, check SLA
      const overdue = elapsedMin > slaMins;

      if (overdue && currentSla !== "overdue" && currentSla !== "breached") {
        const { error: updErr } = await db
          .from("whatsapp_conversations")
            .update({
              sla_status: "breached",
              requires_human: true,
              pending_reason: escalationReason,
              updated_at: nowIso,
              metadata: {
                ...currentMetadata,
                sla_escalated_at: nowIso,
                escalated_at: nowIso,
                sla_elapsed_min: Math.round(elapsedMin),
                sla_limit_min: slaMins,
                escalate_to_role: "supervisor",
                escalated_to_role: "supervisor",
                assigned_role: "supervisor",
                escalation_reason: escalationReason,
              },
            })
          .eq("id", conv.id as string);

        if (!updErr) {
          escalated.push(conv.id as string);
        }
      } else if (!overdue) {
        withinSla.push(conv.id as string);
      }
    }

    return NextResponse.json({
      ok: true,
      checkedAt: nowIso,
      tenantId,
      organizationId,
      total: (conversations ?? []).length,
      escalatedCount: escalated.length,
      withinSlaCount: withinSla.length,
      outOfHoursCount: outOfHours.length,
      escalatedIds: escalated,
      withinBusinessHours: isWithinBusinessHours(LIPS_ROUTING),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("AgentAuthError")) {
      return NextResponse.json({ ok: false, error: "Agent não autenticado ou token inválido." }, { status: 401 });
    }
    console.error("[agents/maintenance] erro:", error);
    return NextResponse.json(
      { ok: false, error: "Falha ao recalcular SLA." },
      { status: 500 },
    );
  }
}

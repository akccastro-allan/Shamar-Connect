import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function GET() {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseWriteClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: conversations, error } = await db
      .from("whatsapp_conversations")
      .select("id, queue_status, department_id, assigned_user_id, assigned_to, sla_status, requires_human, queue_entered_at, first_human_response_at, resolved_at, departments:department_id(name)")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .gte("updated_at", today.toISOString());
    if (error) throw error;

    const rows = conversations ?? [];
    const byDepartment = new Map<string, number>();
    for (const row of rows) {
      const departmentRelation = row.departments as { name?: string | null } | { name?: string | null }[] | null;
      const dept = Array.isArray(departmentRelation) ? departmentRelation[0]?.name : departmentRelation?.name;
      byDepartment.set(dept || "Sem departamento", (byDepartment.get(dept || "Sem departamento") ?? 0) + 1);
    }

    return NextResponse.json({
      ok: true,
      metrics: {
        received: rows.length,
        waiting: rows.filter((row) => row.queue_status === "waiting").length,
        unassigned: rows.filter((row) => !(row.assigned_user_id ?? row.assigned_to) && row.queue_status === "waiting").length,
        slaBreached: rows.filter((row) => row.sla_status === "breached").length,
        slaCompleted: rows.filter((row) => row.sla_status === "completed").length,
        requiresHuman: rows.filter((row) => row.requires_human).length,
        resolvedToday: rows.filter((row) => row.resolved_at && row.resolved_at >= today.toISOString()).length,
        byDepartment: Array.from(byDepartment.entries()).map(([department, count]) => ({ department, count })),
      },
    });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao carregar métricas." }, { status: 500 });
  }
}

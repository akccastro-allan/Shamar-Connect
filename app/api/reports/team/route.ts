import { NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

export async function GET() {
  try {
    const ctx = await getRequiredAppContext();
    const isSupervisor = ctx.role === "owner" || ctx.role === "admin";
    if (!isSupervisor) {
      return NextResponse.json({ ok: false, error: "Acesso restrito a supervisores." }, { status: 403 });
    }

    const db = createSupabaseWriteClient();

    // Membros da equipe
    const { data: members } = await db
      .from("tenant_users")
      .select("app_user_id, role, department_id, app_users:app_user_id(name, email), departments:department_id(name, color)")
      .eq("tenant_id", ctx.tenantId)
      .eq("organization_id", ctx.organizationId)
      .eq("status", "active")
      .neq("role", "viewer");

    // Conversas ativas por atendente
    const { data: active } = await db
      .from("whatsapp_conversations")
      .select("assigned_to, status")
      .eq("tenant_id", ctx.tenantId)
      .eq("organization_id", ctx.organizationId)
      .not("assigned_to", "is", null)
      .in("status", ["open", "pending"]);

    // Conversas resolvidas nos últimos 30 dias por atendente
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: resolved } = await db
      .from("whatsapp_conversations")
      .select("assigned_to, last_outbound_at, last_inbound_at")
      .eq("tenant_id", ctx.tenantId)
      .eq("organization_id", ctx.organizationId)
      .eq("status", "resolved")
      .not("assigned_to", "is", null)
      .gte("updated_at", since);

    // Fila sem atendente por setor
    const { data: unassigned } = await db
      .from("whatsapp_conversations")
      .select("department_id, departments:department_id(name, color)")
      .eq("tenant_id", ctx.tenantId)
      .eq("organization_id", ctx.organizationId)
      .is("assigned_to", null)
      .in("status", ["open", "pending"]);

    // Agrega por atendente
    const activeByUser = new Map<string, number>();
    for (const c of active || []) {
      if (c.assigned_to) activeByUser.set(c.assigned_to, (activeByUser.get(c.assigned_to) || 0) + 1);
    }

    const resolvedByUser = new Map<string, number>();
    for (const c of resolved || []) {
      if (c.assigned_to) resolvedByUser.set(c.assigned_to, (resolvedByUser.get(c.assigned_to) || 0) + 1);
    }

    // Agrega fila sem atendente por setor
    const queueByDept = new Map<string, { name: string; color: string; count: number }>();
    for (const c of unassigned || []) {
      const dept = (c as unknown as { departments?: { name: string; color: string } | null }).departments;
      const key = c.department_id || "__none__";
      const existing = queueByDept.get(key);
      if (existing) {
        existing.count++;
      } else {
        queueByDept.set(key, { name: dept?.name || "Sem setor", color: dept?.color || "#94a3b8", count: 1 });
      }
    }

    const stats = (members || []).map((m) => {
      const userId = m.app_user_id;
      const user = (m.app_users as unknown as { name: string | null; email: string } | null);
      const dept = (m.departments as unknown as { name: string; color: string } | null);
      return {
        app_user_id: userId,
        name: user?.name || user?.email || "—",
        email: user?.email || "",
        role: m.role,
        department: dept ? { name: dept.name, color: dept.color } : null,
        active_conversations: activeByUser.get(userId) || 0,
        resolved_30d: resolvedByUser.get(userId) || 0,
      };
    });

    return NextResponse.json({
      ok: true,
      stats,
      queue_by_dept: Array.from(queueByDept.values()),
      period_days: 30,
    });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao carregar relatório" }, { status: 500 });
  }
}

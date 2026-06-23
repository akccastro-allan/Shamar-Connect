import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

type Params = { params: Promise<{ conversationId: string }> };

// Atribui a conversa a um atendente (lock) e/ou transfere de setor.
// body: { assignTo?: "me" | <appUserId> | null, departmentId?: <uuid> | null }
export async function POST(request: NextRequest, ctxParams: Params) {
  try {
    const ctx = await getRequiredAppContext();
    const { conversationId } = await ctxParams.params;
    const body = await request.json().catch(() => ({}));

    const db = createSupabaseWriteClient();

    const { data: conversation, error: convError } = await db
      .from("whatsapp_conversations")
      .select("id, assigned_to, department_id")
      .eq("id", conversationId)
      .eq("tenant_id", ctx.tenantId)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();

    if (convError) throw convError;
    if (!conversation) return NextResponse.json({ ok: false, error: "Conversa não encontrada." }, { status: 404 });

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const events: { type: string; description: string; metadata: Record<string, unknown> }[] = [];

    // Atribuição
    if (body?.assignTo !== undefined) {
      const target = body.assignTo === "me" ? ctx.appUserId : (body.assignTo || null);
      // Atendente só pode pegar para si ou soltar; supervisor pode atribuir a qualquer um.
      const isSupervisor = ctx.role === "owner" || ctx.role === "admin";
      if (!isSupervisor && target && target !== ctx.appUserId) {
        return NextResponse.json({ ok: false, error: "Você só pode pegar a conversa para si." }, { status: 403 });
      }
      patch.assigned_to = target;
      events.push({
        type: target ? "assigned_to_user" : "unassigned",
        description: target ? (target === ctx.appUserId ? `${ctx.name} pegou a conversa.` : "Conversa atribuída.") : "Conversa liberada da fila.",
        metadata: { assigned_to: target, by: ctx.appUserId },
      });
    }

    // Transferência de setor
    if (body?.departmentId !== undefined) {
      patch.department_id = body.departmentId || null;
      events.push({
        type: "queue_changed",
        description: "Conversa transferida de setor.",
        metadata: { department_id: body.departmentId || null, by: ctx.appUserId },
      });
    }

    const { error: updError } = await db
      .from("whatsapp_conversations")
      .update(patch)
      .eq("id", conversationId)
      .eq("tenant_id", ctx.tenantId)
      .eq("organization_id", ctx.organizationId);
    if (updError) throw updError;

    for (const ev of events) {
      await db.from("whatsapp_conversation_events").insert({
        tenant_id: ctx.tenantId,
        organization_id: ctx.organizationId,
        conversation_id: conversationId,
        event_type: ev.type,
        event_source: "service_center",
        description: ev.description,
        metadata: ev.metadata,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao atribuir" }, { status: 500 });
  }
}

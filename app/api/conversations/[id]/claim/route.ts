import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { assertConversationAccess, recordQueueEvent, userCanAccessDepartment } from "@/lib/queues/lips-queue";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  try {
    const context = await getRequiredAppContext();
    const { id } = await params;
    const db = createSupabaseWriteClient();
    const conversation = await assertConversationAccess(db, context, id);
    if (!(await userCanAccessDepartment(db, context, conversation.department_id))) {
      return NextResponse.json({ ok: false, error: "Você não pertence a este departamento." }, { status: 403 });
    }

    const now = new Date().toISOString();
    const { data, error } = await db
      .from("whatsapp_conversations")
      .update({
        assigned_to: context.appUserId,
        last_assigned_user_id: context.appUserId,
        last_assigned_at: now,
        status: "in_progress",
        updated_at: now,
      })
      .eq("id", id)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .is("assigned_to", null)
      .in("status", ["new", "queued", "assigned"])
      .select("id, assigned_to, status")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ ok: false, error: "Conversa já foi assumida por outra pessoa." }, { status: 409 });

    await recordQueueEvent(db, {
      tenantId: context.tenantId,
      organizationId: context.organizationId,
      conversationId: id,
      actorType: "user",
      actorId: context.appUserId,
      eventType: "assigned",
      previousState: conversation.status,
      newState: "in_progress",
      description: "Atendente assumiu atendimento.",
      metadata: { assignedTo: context.appUserId },
    });

    return NextResponse.json({ ok: true, conversation: data });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao assumir atendimento." }, { status: 500 });
  }
}

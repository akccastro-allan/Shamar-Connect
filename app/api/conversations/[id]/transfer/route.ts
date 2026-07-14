import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { assertConversationAccess, isSupervisorRole, recordQueueEvent, userCanAccessDepartment } from "@/lib/queues/lips-queue";

type Params = { params: Promise<{ id: string }> };
const schema = z.object({ departmentId: z.string().uuid().nullable().optional(), assignTo: z.string().uuid().nullable().optional(), reason: z.string().trim().min(3).max(240) });

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const context = await getRequiredAppContext();
    const { id } = await params;
    const body = schema.parse(await request.json().catch(() => ({})));
    const db = createSupabaseWriteClient();
    const conversation = await assertConversationAccess(db, context, id);
    if (!isSupervisorRole(context.role) && conversation.assigned_to !== context.appUserId) {
      return NextResponse.json({ ok: false, error: "Somente responsável ou supervisor pode transferir." }, { status: 403 });
    }
    if (body.departmentId && !(await userCanAccessDepartment(db, context, body.departmentId)) && !isSupervisorRole(context.role)) {
      return NextResponse.json({ ok: false, error: "Sem acesso ao departamento de destino." }, { status: 403 });
    }

    const now = new Date().toISOString();
    const assignedTo = body.assignTo ?? null;
    const status = assignedTo ? "assigned" : "queued";
    const { data, error } = await db
      .from("whatsapp_conversations")
      .update({
        department_id: body.departmentId ?? conversation.department_id,
        assigned_to: assignedTo,
        last_assigned_user_id: assignedTo,
        last_assigned_at: assignedTo ? now : conversation.last_assigned_at,
        status,
        queue_entered_at: assignedTo ? conversation.queue_entered_at : now,
        updated_at: now,
      })
      .eq("id", id)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .select("id, assigned_to, department_id, status")
      .single();
    if (error) throw error;
    await recordQueueEvent(db, {
      tenantId: context.tenantId,
      organizationId: context.organizationId,
      conversationId: id,
      actorType: "user",
      actorId: context.appUserId,
      eventType: "transferred",
      previousState: conversation.status,
      newState: status,
      description: "Atendimento transferido.",
      metadata: { previousAssignedTo: conversation.assigned_to, assignedTo, previousDepartmentId: conversation.department_id, departmentId: body.departmentId ?? conversation.department_id, reason: body.reason },
    });
    return NextResponse.json({ ok: true, conversation: data });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao transferir." }, { status: 500 });
  }
}

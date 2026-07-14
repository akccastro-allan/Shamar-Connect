import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { assertConversationAccess, isSupervisorRole, OFFICIAL_QUEUE_STATUSES, recordQueueEvent } from "@/lib/queues/lips-queue";
import { assertQueueTransition, type QueueStatus } from "@/lib/queues/lips-routing";

type Params = { params: Promise<{ id: string }> };
const schema = z.object({ status: z.enum(OFFICIAL_QUEUE_STATUSES as [QueueStatus, ...QueueStatus[]]) });

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const context = await getRequiredAppContext();
    const { id } = await params;
    const body = schema.parse(await request.json().catch(() => ({})));
    const nextStatus = body.status as QueueStatus;
    const db = createSupabaseWriteClient();
    const conversation = await assertConversationAccess(db, context, id);
    const assignee = conversation.assigned_user_id ?? conversation.assigned_to;
    assertQueueTransition({
      from: conversation.queue_status,
      to: nextStatus,
      actorRole: isSupervisorRole(context.role) ? "supervisor" : "agent",
      hasAssignee: Boolean(assignee),
      reassigningResolved: conversation.queue_status === "resolved" && nextStatus === "in_progress",
    });

    const now = new Date().toISOString();
    const patch: Record<string, string | boolean | null> = { queue_status: nextStatus, updated_at: now };
    if (nextStatus === "resolved") Object.assign(patch, { requires_human: false, pending_reason: null, sla_status: "completed", resolved_at: now });
    if (nextStatus === "closed") Object.assign(patch, { closed_at: now });
    if (nextStatus === "waiting") Object.assign(patch, { assigned_user_id: null, assigned_to: null, assigned_at: null, queue_entered_at: conversation.queue_entered_at ?? now });

    const { data, error } = await db
      .from("whatsapp_conversations")
      .update(patch)
      .eq("id", id)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .select("id, queue_status")
      .single();
    if (error) throw error;
    await recordQueueEvent(db, { tenantId: context.tenantId, organizationId: context.organizationId, conversationId: id, actorType: "user", actorId: context.appUserId, eventType: nextStatus, previousState: conversation.queue_status, newState: nextStatus, description: `Status da fila alterado para ${nextStatus}.` });
    return NextResponse.json({ ok: true, conversation: data });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao atualizar status." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { assertConversationAccess, recordQueueEvent } from "@/lib/queues/lips-queue";
import { assertQueueTransition, reopenAssignment } from "@/lib/queues/lips-routing";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  try {
    const context = await getRequiredAppContext();
    const { id } = await params;
    const db = createSupabaseWriteClient();
    const conversation = await assertConversationAccess(db, context, id);
    const now = new Date().toISOString();
    const preferredAssignee = reopenAssignment({ lastAssignedUserId: conversation.last_assigned_user_id, lastResolvedAt: conversation.resolved_at, now: new Date(now) });
    let assignBack: string | null = null;
    if (preferredAssignee) {
      const { data: availability, error: availabilityError } = await db
        .from("agent_availability")
        .select("app_user_id")
        .eq("tenant_id", context.tenantId)
        .eq("organization_id", context.organizationId)
        .eq("app_user_id", preferredAssignee)
        .eq("status", "available")
        .eq("accepting_new_conversations", true)
        .maybeSingle();
      if (availabilityError) throw availabilityError;
      assignBack = availability?.app_user_id ?? null;
    }
    const nextStatus = assignBack ? "in_progress" : "waiting";
    assertQueueTransition({ from: conversation.queue_status, to: nextStatus, hasAssignee: Boolean(assignBack), reassigningResolved: Boolean(assignBack) });
    const { data, error } = await db
      .from("whatsapp_conversations")
      .update({ queue_status: nextStatus, assigned_user_id: assignBack, assigned_to: assignBack, assigned_at: assignBack ? now : null, requires_human: true, reopened_at: now, queue_entered_at: now, updated_at: now })
      .eq("id", id)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .select("id, queue_status, assigned_user_id, assigned_to, reopened_at")
      .single();
    if (error) throw error;
    await recordQueueEvent(db, { tenantId: context.tenantId, organizationId: context.organizationId, conversationId: id, actorType: "user", actorId: context.appUserId, eventType: "reopened", previousState: conversation.queue_status, newState: nextStatus, description: "Atendimento reaberto.", metadata: { assignedTo: assignBack } });
    return NextResponse.json({ ok: true, conversation: data });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao reabrir." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { assertConversationAccess, recordQueueEvent } from "@/lib/queues/lips-queue";
import { assertQueueTransition } from "@/lib/queues/lips-routing";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  try {
    const context = await getRequiredAppContext();
    const { id } = await params;
    const db = createSupabaseWriteClient();
    const conversation = await assertConversationAccess(db, context, id);
    const assignee = conversation.assigned_user_id ?? conversation.assigned_to;
    if (assignee && assignee !== context.appUserId && context.role !== "owner" && context.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Somente responsável ou supervisor pode resolver." }, { status: 403 });
    }
    assertQueueTransition({ from: conversation.queue_status, to: "resolved", hasAssignee: Boolean(assignee) });
    const now = new Date().toISOString();
    const { data, error } = await db
      .from("whatsapp_conversations")
      .update({ queue_status: "resolved", requires_human: false, pending_reason: null, sla_status: "completed", resolved_at: now, updated_at: now })
      .eq("id", id)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .select("id, queue_status, resolved_at")
      .single();
    if (error) throw error;
    await recordQueueEvent(db, { tenantId: context.tenantId, organizationId: context.organizationId, conversationId: id, actorType: "user", actorId: context.appUserId, eventType: "resolved", previousState: conversation.queue_status, newState: "resolved", description: "Atendimento resolvido." });
    return NextResponse.json({ ok: true, conversation: data });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao resolver." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { assertConversationAccess, recordQueueEvent } from "@/lib/queues/lips-queue";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  try {
    const context = await getRequiredAppContext();
    const { id } = await params;
    const db = createSupabaseWriteClient();
    const conversation = await assertConversationAccess(db, context, id);
    if (conversation.status === "closed" && context.role !== "owner" && context.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Somente supervisor reabre encerradas." }, { status: 403 });
    }
    const now = new Date().toISOString();
    const assignBack = conversation.last_assigned_user_id ?? null;
    const { data, error } = await db.from("whatsapp_conversations").update({ status: assignBack ? "assigned" : "queued", assigned_to: assignBack, requires_human: true, reopened_at: now, queue_entered_at: now, updated_at: now }).eq("id", id).select("id, status, assigned_to, reopened_at").single();
    if (error) throw error;
    await recordQueueEvent(db, { tenantId: context.tenantId, organizationId: context.organizationId, conversationId: id, actorType: "user", actorId: context.appUserId, eventType: "reopened", previousState: conversation.status, newState: assignBack ? "assigned" : "queued", description: "Atendimento reaberto.", metadata: { preferredAssignee: assignBack } });
    return NextResponse.json({ ok: true, conversation: data });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao reabrir." }, { status: 500 });
  }
}

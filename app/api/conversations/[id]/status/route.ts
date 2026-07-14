import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { assertConversationAccess, OFFICIAL_QUEUE_STATUSES, recordQueueEvent } from "@/lib/queues/lips-queue";

type Params = { params: Promise<{ id: string }> };
const schema = z.object({ status: z.enum(OFFICIAL_QUEUE_STATUSES as [string, ...string[]]) });

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const context = await getRequiredAppContext();
    const { id } = await params;
    const body = schema.parse(await request.json().catch(() => ({})));
    const db = createSupabaseWriteClient();
    const conversation = await assertConversationAccess(db, context, id);
    if (conversation.status === "closed" && body.status !== "closed" && context.role !== "owner" && context.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Somente supervisor reabre encerradas." }, { status: 403 });
    }
    const { data, error } = await db.from("whatsapp_conversations").update({ status: body.status, updated_at: new Date().toISOString() }).eq("id", id).select("id, status").single();
    if (error) throw error;
    await recordQueueEvent(db, { tenantId: context.tenantId, organizationId: context.organizationId, conversationId: id, actorType: "user", actorId: context.appUserId, eventType: body.status, previousState: conversation.status, newState: body.status, description: `Status alterado para ${body.status}.` });
    return NextResponse.json({ ok: true, conversation: data });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao atualizar status." }, { status: 500 });
  }
}

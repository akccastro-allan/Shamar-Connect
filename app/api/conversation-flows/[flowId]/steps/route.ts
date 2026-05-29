import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

type Params = { params: Promise<{ flowId: string }> };

export async function POST(request: NextRequest, context: Params) {
  try {
    const { flowId } = await context.params;
    const body = await request.json();
    const title = String(body?.title || "").trim();
    const messageBody = String(body?.messageBody || "").trim();
    const stepOrder = Number(body?.stepOrder || 1);
    const waitMinutes = Number(body?.waitMinutes || 0);
    const stepType = String(body?.stepType || "message");

    if (!title || !messageBody) {
      return NextResponse.json({ ok: false, error: "Título e mensagem são obrigatórios." }, { status: 400 });
    }

    const db = createSupabaseWriteClient();
    const { data, error } = await db
      .from("conversation_flow_steps")
      .insert({
        flow_id: flowId,
        step_order: stepOrder,
        title,
        message_body: messageBody,
        wait_minutes: waitMinutes,
        step_type: stepType,
        quick_reply_id: body?.quickReplyId || null,
      })
      .select("id, step_order, title, message_body, wait_minutes, step_type, quick_reply_id")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, step: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to create flow step" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const id = String(body?.id || "");
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    if (body?.title !== undefined) update.title = String(body.title).trim();
    if (body?.messageBody !== undefined) update.message_body = String(body.messageBody).trim();
    if (body?.stepOrder !== undefined) update.step_order = Number(body.stepOrder);
    if (body?.waitMinutes !== undefined) update.wait_minutes = Number(body.waitMinutes);
    if (body?.stepType !== undefined) update.step_type = String(body.stepType);
    if (body?.quickReplyId !== undefined) update.quick_reply_id = body.quickReplyId || null;

    const db = createSupabaseWriteClient();
    const { data, error } = await db
      .from("conversation_flow_steps")
      .update(update)
      .eq("id", id)
      .select("id, step_order, title, message_body, wait_minutes, step_type, quick_reply_id")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, step: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to update flow step" }, { status: 500 });
  }
}

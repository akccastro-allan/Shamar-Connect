import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

type Params = { params: Promise<{ flowId: string }> };

export async function POST(request: NextRequest, context: Params) {
  try {
    const { flowId } = await context.params;
    const body = await request.json();
    const conversationId = String(body?.conversationId || "");
    const contactId = body?.contactId ? String(body.contactId) : null;

    if (!conversationId) {
      return NextResponse.json({ ok: false, error: "conversationId is required" }, { status: 400 });
    }

    const db = createSupabaseWriteClient();

    const { data: existing } = await db
      .from("conversation_flow_sessions")
      .select("id, status, current_step_order")
      .eq("flow_id", flowId)
      .eq("conversation_id", conversationId)
      .in("status", ["active", "paused"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, session: existing, reused: true });
    }

    const { data, error } = await db
      .from("conversation_flow_sessions")
      .insert({
        flow_id: flowId,
        conversation_id: conversationId,
        contact_id: contactId,
        current_step_order: 1,
        status: "active",
        metadata: body?.metadata || {},
      })
      .select("id, flow_id, conversation_id, contact_id, current_step_order, status, started_at, completed_at, last_sent_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, session: data, reused: false });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to start conversation flow" }, { status: 500 });
  }
}

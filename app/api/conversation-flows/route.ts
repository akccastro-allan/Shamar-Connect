import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function GET() {
  try {
    const db = createSupabaseServerClient();
    const { data, error } = await db
      .from("conversation_flows")
      .select("id, name, description, trigger_type, status, tags, created_at, updated_at, conversation_flow_steps(id, step_order, title, message_body, wait_minutes, step_type, quick_reply_id)")
      .neq("status", "archived")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const flows = (data || []).map((flow: any) => ({
      ...flow,
      conversation_flow_steps: [...(flow.conversation_flow_steps || [])].sort((a, b) => a.step_order - b.step_order),
    }));

    return NextResponse.json({ ok: true, flows });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load conversation flows" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body?.name || "").trim();
    const description = String(body?.description || "").trim();
    const firstMessage = String(body?.firstMessage || "").trim();

    if (!name || !firstMessage) {
      return NextResponse.json({ ok: false, error: "Nome e primeira mensagem são obrigatórios." }, { status: 400 });
    }

    const db = createSupabaseWriteClient();
    const { data: flow, error: flowError } = await db
      .from("conversation_flows")
      .insert({
        name,
        description: description || null,
        trigger_type: "manual",
        status: "active",
        tags: Array.isArray(body?.tags) ? body.tags : [],
      })
      .select("id, name, description, trigger_type, status, tags, created_at, updated_at")
      .single();

    if (flowError) throw flowError;

    const { error: stepError } = await db
      .from("conversation_flow_steps")
      .insert({
        flow_id: flow.id,
        step_order: 1,
        title: "Mensagem inicial",
        message_body: firstMessage,
        wait_minutes: 0,
        step_type: "message",
      });

    if (stepError) throw stepError;

    return NextResponse.json({ ok: true, flow });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to create conversation flow" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const id = String(body?.id || "");
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    if (body?.name !== undefined) update.name = String(body.name).trim();
    if (body?.description !== undefined) update.description = String(body.description).trim() || null;
    if (body?.status !== undefined) update.status = String(body.status);
    if (body?.trigger_type !== undefined) update.trigger_type = String(body.trigger_type);
    if (body?.tags !== undefined) update.tags = Array.isArray(body.tags) ? body.tags : [];

    const db = createSupabaseWriteClient();
    const { data, error } = await db
      .from("conversation_flows")
      .update(update)
      .eq("id", id)
      .select("id, name, description, trigger_type, status, tags, created_at, updated_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, flow: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to update conversation flow" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

const allowedStatuses = new Set(["open", "pending", "resolved", "archived"]);
const allowedPriorities = new Set(["baixa", "normal", "alta", "urgente"]);

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const conversationId = String(body?.conversationId || "");
    const status = body?.status ? String(body.status) : undefined;
    const stage = body?.stage ? String(body.stage) : undefined;
    const priority = body?.priority ? String(body.priority) : undefined;

    if (!conversationId) {
      return NextResponse.json({ ok: false, error: "conversationId is required" }, { status: 400 });
    }

    if (status && !allowedStatuses.has(status)) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }

    if (priority && !allowedPriorities.has(priority)) {
      return NextResponse.json({ ok: false, error: "Invalid priority" }, { status: 400 });
    }

    const updates: Record<string, string> = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (stage) updates.stage = stage;
    if (priority) updates.priority = priority;

    const client = createSupabaseWriteClient();
    const { data, error } = await client
      .from("whatsapp_conversations")
      .update(updates)
      .eq("id", conversationId)
      .select("id, status, stage, priority")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, conversation: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to update conversation" }, { status: 500 });
  }
}

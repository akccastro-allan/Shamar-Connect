import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

const allowedStatuses = new Set(["open", "pending", "resolved", "archived"]);
const allowedPriorities = new Set(["baixa", "normal", "alta", "urgente"]);

export async function PATCH(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
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
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .select("id, status, stage, priority")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ ok: false, error: "Conversa não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, conversation: data });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to update conversation" },
      { status: 500 },
    );
  }
}


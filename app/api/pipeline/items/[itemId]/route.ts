import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

type Params = { params: Promise<{ itemId: string }> };

export async function PUT(request: NextRequest, context: Params) {
  try {
    const appContext = await getRequiredAppContext();
    const { itemId } = await context.params;
    const body = await request.json();

    const db = createSupabaseWriteClient();
    const now = new Date().toISOString();

    const updates: Record<string, unknown> = { updated_at: now };

    if (body?.stageId) {
      // Validate stage belongs to this org
      const { data: stage } = await db
        .from("pipeline_stages")
        .select("id")
        .eq("id", String(body.stageId))
        .eq("tenant_id", appContext.tenantId)
        .eq("organization_id", appContext.organizationId)
        .maybeSingle();

      if (!stage) return NextResponse.json({ ok: false, error: "Etapa inválida." }, { status: 400 });
      updates.stage_id = body.stageId;

      // Auto-set closed/lost timestamps
      const stageName = String(body?.stageName || "").toLowerCase();
      if (stageName === "fechado") updates.closed_at = now;
      if (stageName === "perdido") { updates.lost_at = now; updates.lost_reason = body?.lostReason ?? null; }
    }

    if (body?.title) updates.title = String(body.title).trim();
    if (body?.notes !== undefined) updates.notes = body.notes ? String(body.notes) : null;
    if (body?.value !== undefined) updates.value = body.value != null ? Number(body.value) : null;

    const { data, error } = await db
      .from("pipeline_items")
      .update(updates)
      .eq("id", itemId)
      .eq("tenant_id", appContext.tenantId)
      .eq("organization_id", appContext.organizationId)
      .select("id, stage_id, title, updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, item: data });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao atualizar item" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Params) {
  try {
    const appContext = await getRequiredAppContext();
    const { itemId } = await context.params;

    const db = createSupabaseWriteClient();
    const { error } = await db
      .from("pipeline_items")
      .delete()
      .eq("id", itemId)
      .eq("tenant_id", appContext.tenantId)
      .eq("organization_id", appContext.organizationId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao remover item" }, { status: 500 });
  }
}

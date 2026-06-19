import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const { searchParams } = new URL(request.url);
    const stageId = searchParams.get("stageId");
    const channelId = searchParams.get("channelId");
    const limit = Math.min(200, Number(searchParams.get("limit") || 100));

    const db = createSupabaseServerClient();

    let query = db
      .from("pipeline_items")
      .select("id, stage_id, title, notes, value, expected_close_date, created_at, updated_at, contact_id, conversation_id, channel_id, crm_contacts(id, name, phone, company), channels(id, name, slug, color)")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (stageId) query = query.eq("stage_id", stageId);
    if (channelId) query = query.eq("channel_id", channelId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ ok: true, items: data || [] });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao carregar itens" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const body = await request.json();

    const title = String(body?.title || "").trim();
    const stageId = String(body?.stageId || "").trim();
    if (!title) return NextResponse.json({ ok: false, error: "title obrigatório." }, { status: 400 });
    if (!stageId) return NextResponse.json({ ok: false, error: "stageId obrigatório." }, { status: 400 });

    const db = createSupabaseWriteClient();

    // Validate stage belongs to this org
    const { data: stage } = await db
      .from("pipeline_stages")
      .select("id")
      .eq("id", stageId)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .maybeSingle();

    if (!stage) return NextResponse.json({ ok: false, error: "Etapa inválida." }, { status: 400 });

    const now = new Date().toISOString();
    const { data, error } = await db
      .from("pipeline_items")
      .insert({
        tenant_id: context.tenantId,
        organization_id: context.organizationId,
        stage_id: stageId,
        title,
        notes: body?.notes ? String(body.notes) : null,
        value: body?.value ? Number(body.value) : null,
        contact_id: body?.contactId ? String(body.contactId) : null,
        conversation_id: body?.conversationId ? String(body.conversationId) : null,
        channel_id: body?.channelId ? String(body.channelId) : null,
        expected_close_date: body?.expectedCloseDate ? String(body.expectedCloseDate) : null,
        created_at: now,
        updated_at: now,
      })
      .select("id, stage_id, title, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, item: data });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao criar item" }, { status: 500 });
  }
}

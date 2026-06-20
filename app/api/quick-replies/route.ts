import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function GET() {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseWriteClient();

    const { data, error } = await db
      .from("quick_replies")
      .select("id, title, body, category, tags, usage_count, is_active, created_at, updated_at")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("title", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, quickReplies: data || [] });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load quick replies" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const body = await request.json();
    const title = String(body?.title || "").trim();
    const replyBody = String(body?.body || "").trim();
    const category = String(body?.category || "geral").trim() || "geral";

    if (!title || !replyBody) {
      return NextResponse.json({ ok: false, error: "Título e mensagem são obrigatórios." }, { status: 400 });
    }

    const db = createSupabaseWriteClient();
    const { data, error } = await db
      .from("quick_replies")
      .insert({
        tenant_id: context.tenantId,
        organization_id: context.organizationId,
        title,
        body: replyBody,
        category,
        tags: Array.isArray(body?.tags) ? body.tags : [],
        is_active: true,
      })
      .select("id, title, body, category, tags, usage_count, is_active, created_at, updated_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, quickReply: data });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to create quick reply" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const body = await request.json();
    const id = String(body?.id || "");
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    if (body?.title !== undefined) update.title = String(body.title).trim();
    if (body?.body !== undefined) update.body = String(body.body).trim();
    if (body?.category !== undefined) update.category = String(body.category).trim() || "geral";
    if (body?.tags !== undefined) update.tags = Array.isArray(body.tags) ? body.tags : [];
    if (body?.is_active !== undefined) update.is_active = Boolean(body.is_active);

    const db = createSupabaseWriteClient();
    const { data, error } = await db
      .from("quick_replies")
      .update(update)
      .eq("id", id)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .select("id, title, body, category, tags, usage_count, is_active, created_at, updated_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, quickReply: data });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to update quick reply" }, { status: 500 });
  }
}

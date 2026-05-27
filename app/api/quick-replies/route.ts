import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function GET() {
  try {
    const db = createSupabaseServerClient();
    const { data, error } = await db
      .from("quick_replies")
      .select("id, title, body, category, is_active, created_at")
      .order("category", { ascending: true })
      .order("title", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, quickReplies: data || [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load quick replies" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = String(body?.title || "").trim();
    const replyBody = String(body?.body || "").trim();
    const category = String(body?.category || "geral").trim() || "geral";

    if (!title || !replyBody) {
      return NextResponse.json({ ok: false, error: "title and body are required" }, { status: 400 });
    }

    const db = createSupabaseWriteClient();
    const { data, error } = await db
      .from("quick_replies")
      .insert({ title, body: replyBody, category, is_active: true })
      .select("id, title, body, category, is_active, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, quickReply: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to create quick reply" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const id = String(body?.id || "");
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    if (body?.title !== undefined) update.title = String(body.title).trim();
    if (body?.body !== undefined) update.body = String(body.body).trim();
    if (body?.category !== undefined) update.category = String(body.category).trim() || "geral";
    if (body?.is_active !== undefined) update.is_active = Boolean(body.is_active);

    const db = createSupabaseWriteClient();
    const { data, error } = await db
      .from("quick_replies")
      .update(update)
      .eq("id", id)
      .select("id, title, body, category, is_active, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, quickReply: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to update quick reply" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = String(body?.id || "");

    if (!id) {
      return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    const db = createSupabaseWriteClient();

    const { data: current, error: currentError } = await db
      .from("quick_replies")
      .select("id, usage_count")
      .eq("id", id)
      .single();

    if (currentError) throw currentError;

    const { data, error } = await db
      .from("quick_replies")
      .update({ usage_count: Number(current?.usage_count || 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, title, body, category, tags, usage_count, is_active, created_at, updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, quickReply: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to register quick reply usage" }, { status: 500 });
  }
}

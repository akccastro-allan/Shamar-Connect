import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const db = createSupabaseServerClient();
    const { data, error } = await db
      .from("quick_replies")
      .select("id, title, body, category")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("title", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, quickReplies: data || [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load quick replies" }, { status: 500 });
  }
}

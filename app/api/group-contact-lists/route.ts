import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const db = createSupabaseServerClient();

    const { data, error } = await db
      .from("group_contact_lists")
      .select("id, name, status, total_participants, unique_contacts, duplicates_removed, created_at, whatsapp_groups(name, external_group_id)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({ ok: true, lists: data || [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load imported lists" }, { status: 500 });
  }
}

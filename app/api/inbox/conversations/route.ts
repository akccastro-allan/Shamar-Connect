import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const client = createSupabaseServerClient();

    const { data, error } = await client
      .from("whatsapp_conversations")
      .select("id, provider, external_chat_id, name, is_group, status, unread_count, last_message_at, created_at, updated_at, crm_contacts(id, name, phone)")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, conversations: data || [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load inbox conversations" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const client = createSupabaseServerClient();

    const { data, error } = await client
      .from("whatsapp_messages")
      .select("id, external_message_id, direction, from_id, to_id, body, message_type, created_at, crm_contacts(name, phone), whatsapp_conversations(name, external_chat_id, is_group)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, messages: data || [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load inbox messages" }, { status: 500 });
  }
}

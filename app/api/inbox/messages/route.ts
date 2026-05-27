import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const conversationId = request.nextUrl.searchParams.get("conversationId");
    const client = createSupabaseServerClient();

    let query = client
      .from("whatsapp_messages")
      .select("id, external_message_id, provider, conversation_id, contact_id, direction, from_id, to_id, body, message_type, raw_payload, created_at, crm_contacts(id, name, phone)")
      .order("created_at", { ascending: true })
      .limit(200);

    if (conversationId) {
      query = query.eq("conversation_id", conversationId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, messages: data || [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load inbox messages" }, { status: 500 });
  }
}

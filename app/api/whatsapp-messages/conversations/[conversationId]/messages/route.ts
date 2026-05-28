import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ conversationId: string }> };

export async function GET(_request: NextRequest, context: Params) {
  try {
    const { conversationId } = await context.params;
    const db = createSupabaseServerClient();

    const { data, error } = await db
      .from("whatsapp_messages")
      .select("id, external_message_id, direction, from_id, to_id, body, message_type, created_at, raw_payload")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(300);

    if (error) throw error;

    return NextResponse.json({ ok: true, messages: data || [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load messages" }, { status: 500 });
  }
}

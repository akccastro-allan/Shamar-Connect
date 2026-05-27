import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function GET(request: NextRequest) {
  try {
    const contactId = request.nextUrl.searchParams.get("contactId");
    const conversationId = request.nextUrl.searchParams.get("conversationId");

    if (!contactId && !conversationId) {
      return NextResponse.json({ ok: false, error: "contactId or conversationId is required" }, { status: 400 });
    }

    const client = createSupabaseServerClient();
    let query = client
      .from("crm_contact_notes")
      .select("id, contact_id, conversation_id, note, created_by, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (contactId) query = query.eq("contact_id", contactId);
    if (!contactId && conversationId) query = query.eq("conversation_id", conversationId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ ok: true, notes: data || [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load notes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const contactId = body?.contactId ? String(body.contactId) : null;
    const conversationId = body?.conversationId ? String(body.conversationId) : null;
    const note = String(body?.note || "").trim();

    if (!note || (!contactId && !conversationId)) {
      return NextResponse.json({ ok: false, error: "note and contactId or conversationId are required" }, { status: 400 });
    }

    const client = createSupabaseWriteClient();
    const { data, error } = await client
      .from("crm_contact_notes")
      .insert({ contact_id: contactId, conversation_id: conversationId, note, created_by: "ShamarConnect" })
      .select("id, contact_id, conversation_id, note, created_by, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, note: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to save note" }, { status: 500 });
  }
}

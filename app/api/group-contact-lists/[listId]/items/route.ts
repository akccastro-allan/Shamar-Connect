import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

type Params = { params: Promise<{ listId: string }> };

export async function GET(_request: NextRequest, context: Params) {
  try {
    const { listId } = await context.params;
    const db = createSupabaseServerClient();

    const { data, error } = await db
      .from("group_contact_list_items")
      .select("id, name, phone, source_group_name, consent_status, crm_status, review_status, notes, created_at, crm_contacts(name, phone, email, company)")
      .eq("list_id", listId)
      .order("created_at", { ascending: true })
      .limit(1000);

    if (error) throw error;

    return NextResponse.json({ ok: true, items: data || [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load imported list items" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const { listId } = await context.params;
    const body = await request.json();
    const itemId = String(body?.itemId || "");
    const reviewStatus = String(body?.reviewStatus || "");

    if (!itemId || !["pending", "approved", "rejected"].includes(reviewStatus)) {
      return NextResponse.json({ ok: false, error: "itemId and valid reviewStatus are required" }, { status: 400 });
    }

    const db = createSupabaseWriteClient();
    const { error } = await db
      .from("group_contact_list_items")
      .update({ review_status: reviewStatus })
      .eq("id", itemId)
      .eq("list_id", listId);

    if (error) throw error;

    return NextResponse.json({ ok: true, itemId, reviewStatus });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to update review status" }, { status: 500 });
  }
}

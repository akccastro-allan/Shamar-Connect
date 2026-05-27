import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from("crm_contacts")
      .select("id, name, phone, email, company, source, consent_status, tags, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, contacts: data || [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load CRM contacts" }, { status: 500 });
  }
}

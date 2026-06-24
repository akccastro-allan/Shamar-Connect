import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const context = await getRequiredAppContext();
    const client = createSupabaseWriteClient();
    const { data, error } = await client
      .from("group_contact_lists")
      .select("id, name, status, total_participants, unique_contacts, duplicates_removed, created_at, updated_at, whatsapp_groups(name, external_group_id)")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, lists: data || [] });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load group contact lists" }, { status: 500 });
  }
}

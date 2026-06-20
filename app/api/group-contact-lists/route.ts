import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function GET() {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseWriteClient();

    const { data, error } = await db
      .from("group_contact_lists")
      .select("id, name, status, total_participants, unique_contacts, duplicates_removed, created_at, whatsapp_groups(name, external_group_id)")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({ ok: true, lists: data || [] });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load imported lists" }, { status: 500 });
  }
}

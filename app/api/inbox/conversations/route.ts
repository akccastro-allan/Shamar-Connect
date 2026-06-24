import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const context = await getRequiredAppContext();
    const client = createSupabaseWriteClient();

    const { data, error } = await client
      .from("whatsapp_conversations")
      .select("id, provider, external_chat_id, name, is_group, status, stage, priority, unread_count, last_message_at, created_at, updated_at, crm_contacts(id, name, phone, email, company, consent_status, tags, source)")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, conversations: data || [] });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load inbox conversations" },
      { status: 500 },
    );
  }
}


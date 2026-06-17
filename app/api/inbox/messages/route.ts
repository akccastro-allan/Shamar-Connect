import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const conversationId = request.nextUrl.searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ ok: true, messages: [] });
    }

    const client = createSupabaseServerClient();

    const { data: conversation, error: conversationError } = await client
      .from("whatsapp_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .maybeSingle();

    if (conversationError) throw conversationError;

    if (!conversation) {
      return NextResponse.json({ ok: false, error: "Conversa não encontrada." }, { status: 404 });
    }

    const { data, error } = await client
      .from("whatsapp_messages")
      .select("id, external_message_id, provider, conversation_id, contact_id, direction, from_id, to_id, body, message_type, raw_payload, created_at, deleted_by_sender, deleted_at, has_media, media_count, media_summary, crm_contacts(id, name, phone)")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, messages: data || [] });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load inbox messages" },
      { status: 500 },
    );
  }
}


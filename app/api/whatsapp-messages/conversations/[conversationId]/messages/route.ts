import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

type Params = { params: Promise<{ conversationId: string }> };

export async function GET(_request: NextRequest, context: Params) {
  try {
    const { conversationId } = await context.params;
    const appContext = await getRequiredAppContext();
    const db = createSupabaseWriteClient();

    // Verify conversation belongs to this tenant/org before returning messages
    const { data: conversation, error: convError } = await db
      .from("whatsapp_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("tenant_id", appContext.tenantId)
      .eq("organization_id", appContext.organizationId)
      .maybeSingle();

    if (convError) throw convError;
    if (!conversation) {
      return NextResponse.json({ ok: false, error: "Conversa não encontrada." }, { status: 404 });
    }

    const { data, error } = await db
      .from("whatsapp_messages")
      .select("id, external_message_id, direction, from_id, to_id, body, message_type, created_at, raw_payload")
      .eq("conversation_id", conversationId)
      .eq("tenant_id", appContext.tenantId)
      .eq("organization_id", appContext.organizationId)
      .order("created_at", { ascending: true })
      .limit(300);

    if (error) throw error;

    return NextResponse.json({ ok: true, messages: data || [] });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load messages" }, { status: 500 });
  }
}

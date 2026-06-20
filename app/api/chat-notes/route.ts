import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const url = new URL(request.url);
    const externalChatId = url.searchParams.get("externalChatId") || "";
    if (!externalChatId) return NextResponse.json({ ok: false, error: "externalChatId is required" }, { status: 400 });

    const db = createSupabaseWriteClient();
    const { data, error } = await db
      .from("conversation_notes")
      .select("id, external_chat_id, note, created_at")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("external_chat_id", externalChatId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ ok: true, notes: data || [] });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to load notes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const body = await request.json();
    const externalChatId = String(body?.externalChatId || "");
    const note = String(body?.note || "").trim();
    if (!externalChatId || !note) return NextResponse.json({ ok: false, error: "externalChatId and note are required" }, { status: 400 });

    const db = createSupabaseWriteClient();
    const { data, error } = await db
      .from("conversation_notes")
      .insert({
        tenant_id: context.tenantId,
        organization_id: context.organizationId,
        external_chat_id: externalChatId,
        note,
      })
      .select("id, external_chat_id, note, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, note: data });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed to save note" }, { status: 500 });
  }
}

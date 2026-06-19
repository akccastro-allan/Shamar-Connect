import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const body = await request.json();
    const logId = String(body?.logId || "").trim();
    if (!logId) return NextResponse.json({ ok: false, error: "logId obrigatório." }, { status: 400 });

    const db = createSupabaseWriteClient();
    await db
      .from("ai_response_logs")
      .update({ status: "ignored", updated_at: new Date().toISOString() })
      .eq("id", logId)
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Falha ao ignorar log." }, { status: 500 });
  }
}

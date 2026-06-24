import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "50")));

    const db = createSupabaseWriteClient();

    let query = db
      .from("ai_response_logs")
      .select("id, conversation_id, mode, status, risk_level, intent, blocked_reason, user_message, suggested_response, final_response, sent_at, created_at")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    const logs = data || [];
    const stats = {
      total: logs.length,
      suggested: logs.filter((l) => l.status === "suggested").length,
      sent: logs.filter((l) => l.status === "sent" || l.status === "edited").length,
      blocked: logs.filter((l) => l.status === "blocked").length,
      ignored: logs.filter((l) => l.status === "ignored").length,
    };

    return NextResponse.json({ ok: true, logs, stats });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao carregar logs." },
      { status: 500 },
    );
  }
}

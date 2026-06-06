import { NextRequest, NextResponse } from "next/server";

import { AgentAuthError, getAuthenticatedAgent, touchAgentSeen } from "@/lib/integrations/agent-auth";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const dynamic = "force-dynamic";

const ALLOWED_LEVELS = new Set(["debug", "info", "warning", "error", "critical"]);
const MAX_LOGS_PER_REQUEST = 100;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as any));
    const logs = Array.isArray(body?.logs) ? body.logs : null;

    if (!logs) {
      return NextResponse.json(
        { ok: false, error: "Payload inválido. O campo logs deve ser um array." },
        { status: 400 },
      );
    }

    if (logs.length > MAX_LOGS_PER_REQUEST) {
      return NextResponse.json(
        { ok: false, error: `Lote acima do limite permitido de ${MAX_LOGS_PER_REQUEST} logs.` },
        { status: 400 },
      );
    }

    const { agent, source } = await getAuthenticatedAgent(request);
    const supabase = createSupabaseWriteClient();

    await touchAgentSeen((agent as any).id, request);

    const rows = [];

    for (const log of logs) {
      const level = typeof log?.level === "string" ? log.level.toLowerCase() : "";
      const message = typeof log?.message === "string" ? log.message.trim() : "";

      if (!ALLOWED_LEVELS.has(level)) {
        return NextResponse.json({ ok: false, error: `Level inválido: ${log?.level}` }, { status: 400 });
      }

      if (!message) {
        return NextResponse.json({ ok: false, error: "Mensagem de log obrigatória." }, { status: 400 });
      }

      rows.push({
        tenant_id: (agent as any).tenant_id || (source as any).tenant_id,
        organization_id: (agent as any).organization_id || (source as any).organization_id,
        integration_source_id: (source as any).id,
        integration_agent_id: (agent as any).id,
        level,
        message,
        context: log?.context && typeof log.context === "object" && !Array.isArray(log.context) ? log.context : {},
      });
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("integration_sync_logs").insert(rows);

      if (insertError) {
        throw insertError;
      }
    }

    return NextResponse.json({
      ok: true,
      inserted: rows.length,
    });
  } catch (error) {
    if (error instanceof AgentAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { ok: false, error: "Erro interno ao registrar logs do Shamar Agent." },
      { status: 500 },
    );
  }
}

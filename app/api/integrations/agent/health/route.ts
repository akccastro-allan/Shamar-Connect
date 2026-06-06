import { NextRequest, NextResponse } from "next/server";

import { AgentAuthError, getAuthenticatedAgent, touchAgentSeen } from "@/lib/integrations/agent-auth";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as any));
    const { agent, source } = await getAuthenticatedAgent(request);
    const supabase = createSupabaseWriteClient();
    const checkedAt = new Date().toISOString();

    const updatePayload: Record<string, any> = {
      status: "active",
    };

    if (typeof body?.machineName === "string" && body.machineName.trim().length > 0) {
      updatePayload.machine_name = body.machineName.trim();
    }

    if (typeof body?.agentVersion === "string" && body.agentVersion.trim().length > 0) {
      updatePayload.agent_version = body.agentVersion.trim();
    }

    if (body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)) {
      updatePayload.metadata = {
        ...((agent as any).metadata || {}),
        ...body.metadata,
      };
    }

    await touchAgentSeen((agent as any).id, request, updatePayload);

    await supabase.from("integration_sync_logs").insert({
      tenant_id: (agent as any).tenant_id || (source as any).tenant_id,
      organization_id: (agent as any).organization_id || (source as any).organization_id,
      integration_source_id: (source as any).id,
      integration_agent_id: (agent as any).id,
      level: "info",
      message: "Health check recebido do agente.",
      context: {
        machineName: body?.machineName || null,
        agentVersion: body?.agentVersion || null,
        status: body?.status || null,
      },
    });

    return NextResponse.json({
      ok: true,
      agentId: (agent as any).id,
      status: "active",
      checkedAt,
    });
  } catch (error) {
    if (error instanceof AgentAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { ok: false, error: "Erro interno ao processar health check do Shamar Agent." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export type LipsReadiness = {
  lipsOrgId: string | null;
  lipsTenantId: string | null;
  whatsappChannel: { exists: boolean; sessionId: string | null };
  contacts: { count: number };
  conversations: { count: number };
  agents: { count: number };
  pipeline: { stagesCount: number };
  support: { ticketsCount: number };
  checkedAt: string;
};

export async function GET() {
  try {
    const context = await getRequiredAppContext();

    if (context.role !== "owner" && context.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Acesso restrito a administradores." }, { status: 403 });
    }

    const db = createSupabaseWriteClient();

    // Find Lips org via the lips-main channel
    const { data: channel } = await db
      .from("channels")
      .select("tenant_id, organization_id, session_id")
      .eq("session_id", "lips-main")
      .maybeSingle();

    const lipsTenantId = channel?.tenant_id ?? null;
    const lipsOrgId = channel?.organization_id ?? null;

    if (!lipsTenantId || !lipsOrgId) {
      return NextResponse.json({
        ok: true,
        readiness: {
          lipsOrgId: null,
          lipsTenantId: null,
          whatsappChannel: { exists: false, sessionId: null },
          contacts: { count: 0 },
          conversations: { count: 0 },
          agents: { count: 0 },
          pipeline: { stagesCount: 0 },
          support: { ticketsCount: 0 },
          checkedAt: new Date().toISOString(),
        } satisfies LipsReadiness,
      });
    }

    const [contactsRes, conversationsRes, agentsRes, pipelineRes, supportRes] = await Promise.all([
      db.from("crm_contacts").select("id", { count: "exact", head: true })
        .eq("tenant_id", lipsTenantId).eq("organization_id", lipsOrgId),
      db.from("whatsapp_conversations").select("id", { count: "exact", head: true })
        .eq("tenant_id", lipsTenantId).eq("organization_id", lipsOrgId),
      db.from("tenant_users").select("id", { count: "exact", head: true })
        .eq("tenant_id", lipsTenantId).eq("organization_id", lipsOrgId).eq("status", "active"),
      db.from("pipeline_stages").select("id", { count: "exact", head: true })
        .eq("tenant_id", lipsTenantId).eq("organization_id", lipsOrgId),
      db.from("support_tickets").select("id", { count: "exact", head: true })
        .eq("tenant_id", lipsTenantId).eq("organization_id", lipsOrgId),
    ]);

    const readiness: LipsReadiness = {
      lipsOrgId,
      lipsTenantId,
      whatsappChannel: { exists: true, sessionId: channel?.session_id ?? null },
      contacts: { count: contactsRes.count ?? 0 },
      conversations: { count: conversationsRes.count ?? 0 },
      agents: { count: agentsRes.count ?? 0 },
      pipeline: { stagesCount: pipelineRes.count ?? 0 },
      support: { ticketsCount: supportRes.count ?? 0 },
      checkedAt: new Date().toISOString(),
    };

    return NextResponse.json({ ok: true, readiness });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao verificar prontidão." },
      { status: 500 },
    );
  }
}

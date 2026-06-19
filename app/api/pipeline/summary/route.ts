import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const days = Math.min(90, Math.max(1, Number(searchParams.get("days") || 30)));

    const db = createSupabaseServerClient();
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    // Get stages
    const { data: stages } = await db
      .from("pipeline_stages")
      .select("id, name, position, color")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .order("position");

    // Get items with stage info
    let itemsQuery = db
      .from("pipeline_items")
      .select("id, stage_id, value, created_at, closed_at, lost_at, channel_id")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .gte("created_at", since);

    if (channelId) itemsQuery = itemsQuery.eq("channel_id", channelId);

    const { data: items } = await itemsQuery;

    const stageMap = new Map((stages || []).map((s) => [s.id, s]));

    type StageCount = { id: string; name: string; position: number; color: string; count: number; totalValue: number };
    const counts = new Map<string, StageCount>();

    for (const stage of stages || []) {
      counts.set(stage.id, { id: stage.id, name: stage.name, position: stage.position, color: stage.color, count: 0, totalValue: 0 });
    }

    let totalValue = 0;
    for (const item of items || []) {
      const entry = counts.get(item.stage_id);
      if (entry) {
        entry.count += 1;
        entry.totalValue += Number(item.value || 0);
        totalValue += Number(item.value || 0);
      }
    }

    const closedStage = [...stageMap.values()].find((s) => s.name.toLowerCase() === "fechado");
    const lostStage = [...stageMap.values()].find((s) => s.name.toLowerCase() === "perdido");
    const totalItems = items?.length ?? 0;
    const closedCount = closedStage ? (counts.get(closedStage.id)?.count ?? 0) : 0;
    const lostCount = lostStage ? (counts.get(lostStage.id)?.count ?? 0) : 0;
    const activeCount = totalItems - closedCount - lostCount;
    const conversionRate = totalItems > 0 ? Math.round((closedCount / totalItems) * 100) : 0;

    return NextResponse.json({
      ok: true,
      days,
      stages: [...counts.values()],
      totals: { items: totalItems, active: activeCount, closed: closedCount, lost: lostCount, value: totalValue, conversionRate },
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Falha ao carregar resumo" }, { status: 500 });
  }
}

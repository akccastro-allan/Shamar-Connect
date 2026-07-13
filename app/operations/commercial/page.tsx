import { AppShell } from "@/components/app-shell";
import { CommercialOperationsPanel } from "@/components/operations/commercial-operations-panel";
import { assertCommandCenterRoute } from "@/lib/features/route-guards";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const metadata = { title: "Comercial — Centro de Comando" };
export const dynamic = "force-dynamic";

export default async function OperationsCommercialPage() {
  const context = await assertCommandCenterRoute();
  const db = createSupabaseWriteClient();

  const [opportunitiesResult, followUpsResult] = await Promise.all([
    db
      .from("commercial_opportunities")
      .select("id, title, stage, temperature, potential_value, updated_at")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("status", "open")
      .order("updated_at", { ascending: false })
      .limit(50),
    db
      .from("commercial_follow_ups")
      .select("id, reason, priority, due_at")
      .eq("tenant_id", context.tenantId)
      .eq("organization_id", context.organizationId)
      .eq("status", "pending")
      .lte("due_at", new Date().toISOString())
      .order("due_at", { ascending: true })
      .limit(50),
  ]);

  const tableReady = !isMissingCommercialTable(opportunitiesResult.error) && !isMissingCommercialTable(followUpsResult.error);

  if (!tableReady) {
    return (
      <AppShell active="operations">
        <CommercialOperationsPanel opportunities={[]} followUps={[]} tableReady={false} />
      </AppShell>
    );
  }

  if (opportunitiesResult.error) throw opportunitiesResult.error;
  if (followUpsResult.error) throw followUpsResult.error;

  return (
    <AppShell active="operations">
      <CommercialOperationsPanel
        opportunities={opportunitiesResult.data ?? []}
        followUps={followUpsResult.data ?? []}
        tableReady
      />
    </AppShell>
  );
}

function isMissingCommercialTable(error: { code?: string | null } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

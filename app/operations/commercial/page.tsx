import { AppShell } from "@/components/app-shell";
import { OperationsCommercialPage } from "@/components/operations/operations-command-center";
import { assertCommandCenterRoute } from "@/lib/features/route-guards";
import { getOperationsSnapshot } from "@/lib/operations/command-center";
import { resolveOperationsFilters } from "@/lib/operations/page-filters";

export const metadata = { title: "Comercial — Centro de Comando" };
export const dynamic = "force-dynamic";

export default async function CommercialPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await assertCommandCenterRoute();
  const snapshot = await getOperationsSnapshot(context, await resolveOperationsFilters(searchParams));

  return (
    <AppShell active="operations">
      <OperationsCommercialPage snapshot={snapshot} />
    </AppShell>
  );
}

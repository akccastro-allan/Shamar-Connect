import { AppShell } from "@/components/app-shell";
import { InternalChannelsPanel } from "@/components/operations/internal-channels-panel";
import { assertCommandCenterRoute } from "@/lib/features/route-guards";

export const metadata = { title: "Canais Internos — Centro de Comando" };
export const dynamic = "force-dynamic";

export default async function OperationsChannelsPage() {
  await assertCommandCenterRoute();

  return (
    <AppShell active="operations">
      <InternalChannelsPanel />
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { CommandCenterDashboard } from "@/components/admin/command-center/command-center-dashboard";
import { assertCommandCenterRoute } from "@/lib/features/route-guards";

export const metadata = { title: "Centro de Comando — ShamarConnect" };
export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  await assertCommandCenterRoute();

  return (
    <AppShell active="operations">
      <CommandCenterDashboard />
    </AppShell>
  );
}

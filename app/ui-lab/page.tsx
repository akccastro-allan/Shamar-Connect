import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { UiLabPanel } from "@/components/ui-lab-panel";
import { assertPlatformAdminRoute } from "@/lib/features/route-guards";

export default async function UiLabPage() {
  await assertPlatformAdminRoute();

  return (
    <AppShell active="ui-lab">
      <PageHeader title="UI Lab" description="Laboratório visual para evoluir Dashboard, Inbox, Listas importadas e Mobile/PWA." badge="Design System" />
      <UiLabPanel />
    </AppShell>
  );
}

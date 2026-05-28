import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { UiLabPanel } from "@/components/ui-lab-panel";

export default function UiLabPage() {
  return (
    <AppShell active="ui-lab">
      <PageHeader title="UI Lab" description="Laboratório visual para evoluir Dashboard, Inbox, Listas importadas e Mobile/PWA." badge="Design System" />
      <UiLabPanel />
    </AppShell>
  );
}

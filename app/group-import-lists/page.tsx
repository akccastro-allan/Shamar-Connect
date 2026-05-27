import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { GroupImportListsPanel } from "@/components/group-import-lists-panel";

export default function GroupImportListsPage() {
  return (
    <AppShell active="group-import-lists">
      <PageHeader title="Listas importadas" description="Revise contatos importados dos grupos, aprove ou reprove registros e exporte CSV real." badge="Revisão de listas" />
      <GroupImportListsPanel />
    </AppShell>
  );
}

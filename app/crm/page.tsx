import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { GroupContactListsPanel } from "@/components/crm/group-contact-lists-panel";

export default function CrmPage() {
  return (
    <AppShell active="crm">
      <PageHeader title="CRM" description="Listas, contatos e registros gerados manualmente a partir do WhatsApp Web." badge="Modo seguro" />
      <GroupContactListsPanel />
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { GroupContactListsPanel } from "@/components/crm/group-contact-lists-panel";

export default function CrmPage() {
  return (
    <AppShell active="crm">
      <PageHeader
        title="CRM e Listas Comerciais"
        description="Acompanhe listas importadas, contatos vindos de grupos, registros comerciais e bases de relacionamento para transformar dados do WhatsApp em oportunidades organizadas."
        badge="Gestão comercial"
      />
      <GroupContactListsPanel />
    </AppShell>
  );
}

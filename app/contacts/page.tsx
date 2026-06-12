import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ContactsPanel } from "@/components/crm/contacts-panel";

export default function ContactsPage() {
  return (
    <AppShell active="contacts">
      <PageHeader
        title="Base de Contatos"
        description="Organize leads, clientes e contatos comerciais capturados pelo WhatsApp, listas importadas e registros do CRM para manter relacionamento, histórico e próximas ações em controle."
        badge="CRM Comercial"
      />
      <ContactsPanel />
    </AppShell>
  );
}

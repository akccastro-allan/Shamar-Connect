import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ContactsPanel } from "@/components/crm/contacts-panel";

export default function ContactsPage() {
  return (
    <AppShell active="contacts">
      <PageHeader title="Contatos" description="Base de contatos salva manualmente a partir do WhatsApp Web e listas de grupos." badge="CRM" />
      <ContactsPanel />
    </AppShell>
  );
}

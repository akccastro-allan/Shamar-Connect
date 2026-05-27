import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ContactImportHubPanel } from "@/components/contact-import-hub-panel";

export default function ContactImportPage() {
  return (
    <AppShell active="contact-import">
      <PageHeader title="Importar contatos" description="Importe contatos do WhatsApp, TXT, CSV, planilhas e prepare integrações com Google e Microsoft." badge="Contact Import Hub" />
      <ContactImportHubPanel />
    </AppShell>
  );
}

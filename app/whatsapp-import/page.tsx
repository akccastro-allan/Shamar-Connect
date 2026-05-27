import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { WhatsappImportPanel } from "@/components/whatsapp-import-panel";

export default function WhatsappImportPage() {
  return (
    <AppShell active="whatsapp-import">
      <PageHeader title="Importação WhatsApp" description="Salve conversas do WhatsApp Web, exporte contatos de grupos e organize tudo no CRM." badge="WhatsApp Web Lab" />
      <WhatsappImportPanel />
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { WhatsappReaderPanel } from "@/components/whatsapp-reader-panel";

export default function WhatsappMessagesPage() {
  return (
    <AppShell active="whatsapp-messages">
      <PageHeader title="Mensagens WhatsApp" description="Leia conversas do WhatsApp Web conectado e salve manualmente apenas as mensagens escolhidas." badge="Leitura manual" />
      <WhatsappReaderPanel />
    </AppShell>
  );
}

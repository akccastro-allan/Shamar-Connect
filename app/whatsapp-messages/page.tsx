import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { WhatsappServiceCenter } from "@/components/whatsapp-service-center";

export default function WhatsappMessagesPage() {
  return (
    <AppShell active="whatsapp-messages">
      <PageHeader title="Mensagens WhatsApp" description="Central de atendimento para ler conversas, sincronizar histórico e conectar contatos ao CRM." badge="Atendimento" />
      <WhatsappServiceCenter />
    </AppShell>
  );
}

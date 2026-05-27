import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { WhatsappSettingsPanel } from "@/components/whatsapp-settings-panel";

export default function WhatsappSettingsPage() {
  return (
    <AppShell active="settings/whatsapp">
      <PageHeader title="Configurações do WhatsApp" description="Conecte o WhatsApp Web Lab, veja o status e escaneie o QR Code." badge="Gateway Railway" />
      <WhatsappSettingsPanel />
    </AppShell>
  );
}

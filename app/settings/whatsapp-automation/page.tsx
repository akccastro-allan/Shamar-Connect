import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { WhatsappAutomationSettingsPanel } from "@/components/whatsapp-automation-settings-panel";

export default function WhatsappAutomationSettingsPage() {
  return (
    <AppShell active="settings/whatsapp-automation">
      <PageHeader
        title="Configurações de automação"
        description="Visualize e entenda as regras atuais do autoatendimento. Algumas configurações ainda são fixas no backend e serão editáveis em versões futuras."
        badge="Autoatendimento"
      />
      <WhatsappAutomationSettingsPanel />
    </AppShell>
  );
}

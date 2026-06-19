import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { WhatsappDiagnosticsPanel } from "@/components/whatsapp-diagnostics-panel";

export default function WhatsappDiagnosticsPage() {
  return (
    <AppShell active="whatsapp-diagnostics">
      <PageHeader
        title="Diagnóstico WhatsApp"
        description="Verifique o status do gateway, conversas pendentes, eventos do watchdog e da automação. Nenhuma mensagem é enviada por esta tela."
        badge="Operacional"
      />
      <WhatsappDiagnosticsPanel />
    </AppShell>
  );
}

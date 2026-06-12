import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { InboxPanel } from "@/components/inbox/inbox-panel";

export default function InboxPage() {
  return (
    <AppShell active="inbox">
      <PageHeader
        title="Central de Atendimento"
        description="Gerencie conversas salvas, responda clientes, atualize dados do CRM, registre notas, acompanhe prioridade e mantenha o histórico comercial organizado em um único painel."
        badge="WhatsApp Central"
      />
      <InboxPanel />
    </AppShell>
  );
}

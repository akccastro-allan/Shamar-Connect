import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { QuickRepliesManagerPanel } from "@/components/quick-replies-manager-panel";

export default function QuickRepliesPage() {
  return (
    <AppShell active="quick-replies">
      <PageHeader title="Respostas rápidas" description="Cadastre respostas reutilizáveis para atendimento no WhatsApp." badge="Atendimento" />
      <QuickRepliesManagerPanel />
    </AppShell>
  );
}

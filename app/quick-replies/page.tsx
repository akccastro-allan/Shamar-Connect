import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { QuickRepliesManager } from "@/components/quick-replies-manager";

export default function QuickRepliesPage() {
  return (
    <AppShell active="quick-replies">
      <PageHeader title="Respostas rápidas" description="Cadastre respostas reutilizáveis para atendimento no WhatsApp." badge="Atendimento" />
      <QuickRepliesManager />
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ConversationFlowsManager } from "@/components/conversation-flows-manager";

export default function ConversationFlowsPage() {
  return (
    <AppShell active="conversation-flows">
      <PageHeader title="Fluxos de conversa" description="Crie sequências de atendimento para usar na Central WhatsApp." badge="Atendimento" />
      <ConversationFlowsManager />
    </AppShell>
  );
}

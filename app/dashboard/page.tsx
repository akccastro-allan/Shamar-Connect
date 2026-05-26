import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { MockQrCard } from "@/components/mock-qr-card";
import { ConversationList } from "@/components/conversation-list";
import { AiCopilotPanel } from "@/components/ai-copilot-panel";

export default function DashboardPage() {
  return (
    <AppShell active="dashboard">
      <PageHeader title="Dashboard" description="Visão executiva do atendimento, CRM e conexão WhatsApp." badge="MVP Fase 0.1" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Conversas abertas" value="18" helper="7 aguardando primeira resposta" />
        <MetricCard title="Tempo médio" value="4m 12s" helper="Simulado no mock-provider" />
        <MetricCard title="Leads no funil" value="42" helper="R$ 18.940 em oportunidades" />
        <MetricCard title="IA sugeriu" value="31" helper="Respostas revisadas por humanos" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <MockQrCard />
        <AiCopilotPanel />
      </div>
      <div className="mt-6"><ConversationList /></div>
    </AppShell>
  );
}

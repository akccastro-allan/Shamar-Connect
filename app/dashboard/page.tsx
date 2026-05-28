import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { DashboardOperationalPanel } from "@/components/dashboard-operational-panel";

export default function DashboardPage() {
  return (
    <AppShell active="dashboard">
      <PageHeader title="Dashboard" description="Visão operacional do atendimento, CRM, WhatsApp e importações." badge="Operação" />
      <DashboardOperationalPanel />
    </AppShell>
  );
}

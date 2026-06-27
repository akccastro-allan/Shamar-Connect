import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TeamReportClient } from "./team-report-client";

export default function TeamReportPage() {
  return (
    <AppShell active="reports/team">
      <PageHeader
        title="Relatório da equipe"
        description="Conversas ativas, resolvidas nos últimos 30 dias e fila de espera por setor."
        badge="Relatório"
      />

      <TeamReportClient />
    </AppShell>
  );
}

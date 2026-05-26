import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { FeatureLabPanel } from "@/components/feature-lab-panel";

export default function FeatureLabPage() {
  return (
    <AppShell active="feature-lab">
      <PageHeader title="Feature Lab" description="Pesquisa, testes e funções experimentais para CRM + WhatsApp antes da API oficial." badge="Pesquisa ativa" />
      <FeatureLabPanel />
    </AppShell>
  );
}

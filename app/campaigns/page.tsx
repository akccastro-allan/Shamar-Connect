import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { CampaignsPanel } from "@/components/crm/campaigns-panel";

export default function CampaignsPage() {
  return (
    <AppShell active="campaigns">
      <PageHeader
        title="Campanhas de Relacionamento"
        description="Identifique aniversariantes, clientes inativos e orçamentos sem retorno. Nenhuma mensagem é enviada automaticamente — o disparo é sempre manual e controlado."
        badge="CRM Comercial"
      />
      <CampaignsPanel />
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { BillingClient } from "./billing-client";

export default function BillingSettingsPage() {
  return (
    <AppShell active="settings/billing">
      <PageHeader
        title="Assinatura"
        description="Plano contratado, add-ons ativos e limites da sua conta."
        badge="Conta"
      />

      <BillingClient />
    </AppShell>
  );
}

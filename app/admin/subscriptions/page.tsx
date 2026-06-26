import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { AdminSubscriptionsClient } from "./admin-subscriptions-client";

export default function AdminSubscriptionsPage() {
  return (
    <AppShell active="admin">
      <PageHeader
        title="Assinaturas"
        description="Gestão de assinaturas ativas, pausadas e canceladas."
        badge="Admin"
      />

      <AdminSubscriptionsClient />
    </AppShell>
  );
}

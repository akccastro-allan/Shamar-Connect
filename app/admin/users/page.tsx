import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { AdminClientsPanel } from "@/components/admin-clients-panel";
import { getRequiredAppContext } from "@/lib/auth/app-context";

const PLATFORM_TENANT_ID = "0c633898-a297-4f5e-945b-a05171218566";

export default async function AdminUsersPage() {
  const context = await getRequiredAppContext();

  if (context.tenantId !== PLATFORM_TENANT_ID) {
    redirect("/dashboard");
  }

  return (
    <AppShell active="admin/users">
      <PageHeader
        title="Gestão de clientes"
        description="Provisione novos clientes e gerencie acesso ao ambiente."
        badge="Admin"
      />
      <AdminClientsPanel />
    </AppShell>
  );
}

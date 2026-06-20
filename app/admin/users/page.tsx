import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { AdminClientsPanel } from "@/components/admin-clients-panel";
import { getRequiredAppContext } from "@/lib/auth/app-context";

export default async function AdminUsersPage() {
  const context = await getRequiredAppContext();

  if (context.role !== "owner" && context.role !== "admin") {
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

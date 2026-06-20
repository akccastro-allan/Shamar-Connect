import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AdminSupportPanel } from "@/components/admin-support-panel";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

export const metadata = { title: "Admin Suporte — ShamarConnect" };

const PLATFORM_TENANT_ID = "0c633898-a297-4f5e-945b-a05171218566";

export default async function AdminSupportPage() {
  try {
    const context = await getRequiredAppContext();
    if (context.tenantId !== PLATFORM_TENANT_ID) redirect("/dashboard");
  } catch (err) {
    if (isUnauthorizedError(err)) redirect("/login");
    throw err;
  }

  return (
    <AppShell active="admin">
      <div className="p-6 lg:p-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-950">Tickets de Suporte</h1>
          <p className="mt-2 text-muted-foreground">Todos os chamados abertos por clientes.</p>
        </div>
        <AdminSupportPanel />
      </div>
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { AdminSupportPanel } from "@/components/admin-support-panel";

export const metadata = { title: "Admin Suporte — ShamarConnect" };

export default function AdminSupportPage() {
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

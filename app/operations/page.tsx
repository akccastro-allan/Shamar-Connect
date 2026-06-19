import { AppShell } from "@/components/app-shell";
import { OperationsDashboard } from "@/components/operations-dashboard";

export const metadata = { title: "Operações — ShamarConnect" };

export default function OperationsPage() {
  return (
    <AppShell active="operations">
      <div className="p-6 lg:p-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-950">Operações</h1>
          <p className="mt-2 text-muted-foreground">Status em tempo real de Hall Donous e Lips. Atualiza a cada 30 segundos.</p>
        </div>
        <OperationsDashboard />
      </div>
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { OperationsDashboard } from "@/components/operations-dashboard";
import { AllanCommandCenter } from "@/components/allan-command-center";
import { LipsReadinessCard } from "@/components/lips-readiness-card";
import { getRequiredAppContext } from "@/lib/auth/app-context";

export const metadata = { title: "Operações — ShamarConnect" };

export default async function OperationsPage() {
  const context = await getRequiredAppContext();
  const isPlatformAdmin = context.isPlatformTenant;

  return (
    <AppShell active="operations">
      <div className="p-6 lg:p-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-950">Central de Operações</h1>
          <p className="mt-2 text-muted-foreground">
            {isPlatformAdmin
              ? "Visão Allan — Hall Donous, Lips, Shamar, Viciados e demais unidades. Atualiza automaticamente a cada 30s."
              : "Status dos seus canais e atendimentos. Atualiza automaticamente a cada 30s."}
          </p>
        </div>
        <div className="space-y-10">
          <OperationsDashboard />
          {isPlatformAdmin && (
            <>
              <div className="grid gap-6 lg:grid-cols-3">
                <LipsReadinessCard />
              </div>
              <AllanCommandCenter />
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

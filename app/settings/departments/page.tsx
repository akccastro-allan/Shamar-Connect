import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { DepartmentsSettingsPanel } from "@/components/departments-settings-panel";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

export const metadata = { title: "Setores — ShamarConnect" };

export default async function DepartmentsSettingsPage() {
  let context;
  try {
    context = await getRequiredAppContext();
  } catch (err) {
    if (isUnauthorizedError(err)) redirect("/login");
    throw err;
  }

  const canManage = context.role === "owner" || context.role === "admin";

  return (
    <AppShell active="settings/departments">
      <PageHeader
        title="Setores de atendimento"
        description="Crie e organize os setores da clínica (Agendamento, Financeiro, Triagem...) para distribuir as conversas para a equipe certa."
        badge="Equipe"
      />
      <DepartmentsSettingsPanel canManage={canManage} />
    </AppShell>
  );
}

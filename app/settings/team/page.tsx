import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TeamSettingsPanel } from "@/components/team-settings-panel";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

export const metadata = { title: "Equipe — ShamarConnect" };

export default async function TeamSettingsPage() {
  let context;
  try {
    context = await getRequiredAppContext();
  } catch (err) {
    if (isUnauthorizedError(err)) redirect("/login");
    throw err;
  }

  const canManage = context.role === "owner" || context.role === "admin";

  return (
    <AppShell active="settings/team">
      <PageHeader
        title="Equipe de atendimento"
        description="Convide atendentes, defina o papel de cada um e o setor que atende. Administradores veem tudo; atendentes veem o que é permitido."
        badge="Equipe"
      />
      <TeamSettingsPanel canManage={canManage} />
    </AppShell>
  );
}

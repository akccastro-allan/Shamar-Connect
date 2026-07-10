import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CommandCenterDashboard } from "@/components/admin/command-center/command-center-dashboard";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";

export const metadata = { title: "Centro de Comando — ShamarConnect" };
export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  try {
    const context = await getRequiredAppContext();
    if (!context.isPlatformTenant || !["owner", "admin"].includes(context.role)) redirect("/dashboard");
  } catch (error) {
    if (isUnauthorizedError(error)) redirect("/login");
    throw error;
  }

  return (
    <AppShell active="operations">
      <CommandCenterDashboard />
    </AppShell>
  );
}

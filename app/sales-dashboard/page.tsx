import { AppShell } from "@/components/app-shell";
import SalesDashboardPanel from "@/components/sales-dashboard-panel";

export const metadata = { title: "Dashboard de Vendas — ShamarConnect" };

export default function SalesDashboardPage() {
  return (
    <AppShell active="sales-dashboard">
      <SalesDashboardPanel />
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import DistributionPanel from "@/components/distribution-panel";

export const metadata = { title: "Central de Distribuição — ShamarConnect" };

export default function DistributionPage() {
  return (
    <AppShell active="distribution">
      <DistributionPanel />
    </AppShell>
  );
}

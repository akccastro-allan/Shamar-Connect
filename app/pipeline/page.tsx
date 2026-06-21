import { AppShell } from "@/components/app-shell";
import PipelinePanel from "@/components/pipeline-panel";

export const metadata = { title: "Pipeline de Vendas — ShamarConnect" };

export default function PipelinePage() {
  return (
    <AppShell active="pipeline">
      <PipelinePanel />
    </AppShell>
  );
}

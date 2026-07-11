import { AppShell } from "@/components/app-shell";
import { AiLabPanel } from "@/components/ai-lab-panel";
import { assertPlatformAdminRoute } from "@/lib/features/route-guards";

export const metadata = { title: "AI Lab — ShamarConnect" };

export default async function AiLabPage() {
  await assertPlatformAdminRoute();

  return (
    <AppShell active="ai-lab">
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-950">AI Lab</h1>
          <p className="mt-2 text-muted-foreground">IA supervisionada para atendimento WhatsApp. O atendente revisa e aprova antes de qualquer envio.</p>
        </div>
        <AiLabPanel />
      </div>
    </AppShell>
  );
}

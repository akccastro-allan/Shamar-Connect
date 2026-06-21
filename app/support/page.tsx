import { AppShell } from "@/components/app-shell";
import { SupportPanel } from "@/components/support-panel";

export const metadata = { title: "Suporte — ShamarConnect" };

export default function SupportPage() {
  return (
    <AppShell active="support">
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-950">Suporte</h1>
          <p className="mt-2 text-muted-foreground">Abra um chamado para a equipe Shamar ou acompanhe os existentes.</p>
        </div>
        <SupportPanel />
      </div>
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SystemTestPanel } from "@/components/system-test-panel";
import { assertPlatformAdminRoute } from "@/lib/features/route-guards";

export default async function SystemTestPage() {
  await assertPlatformAdminRoute();

  return (
    <AppShell active="system-test">
      <PageHeader title="Teste do sistema" description="Valide rapidamente se Vercel, Supabase, Railway, WhatsApp e identidade visual estão funcionando." badge="Operacional" />
      <SystemTestPanel />
    </AppShell>
  );
}

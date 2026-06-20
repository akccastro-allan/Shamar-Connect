import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { WhatsappDiagnosticsPanel } from "@/components/whatsapp-diagnostics-panel";
import { getRequiredAppContext } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export default async function WhatsappDiagnosticsPage() {
  const context = await getRequiredAppContext();
  const db = createSupabaseWriteClient();

  const { data: channels } = await db
    .from("channels")
    .select("session_id, name")
    .eq("tenant_id", context.tenantId)
    .eq("organization_id", context.organizationId)
    .order("name");

  const sessions = (channels ?? []).map((c) => ({ id: c.session_id, label: c.name }));

  return (
    <AppShell active="whatsapp-diagnostics">
      <PageHeader
        title="Diagnóstico WhatsApp"
        description="Verifique o status do gateway, conversas pendentes, eventos do watchdog e da automação. Nenhuma mensagem é enviada por esta tela."
        badge="Operacional"
      />
      <Suspense>
        <WhatsappDiagnosticsPanel sessions={sessions} />
      </Suspense>
    </AppShell>
  );
}

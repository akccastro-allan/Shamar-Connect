import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { WhatsappImportPanel } from "@/components/whatsapp-import-panel";
import { getRequiredAppContext } from "@/lib/auth/app-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function WhatsappImportPage() {
  const context = await getRequiredAppContext();
  const db = createSupabaseServerClient();

  const { data: channels } = await db
    .from("channels")
    .select("id, name, session_id")
    .eq("tenant_id", context.tenantId)
    .eq("organization_id", context.organizationId)
    .not("session_id", "is", null)
    .order("name");

  const allowedSessions = (channels ?? []).map((c) => ({
    id: c.session_id as string,
    label: c.name,
  }));

  return (
    <AppShell active="whatsapp-import">
      <PageHeader title="Importação WhatsApp" description="Salve conversas do WhatsApp Web, exporte contatos de grupos e organize tudo no CRM." badge="WhatsApp Web Lab" />
      <WhatsappImportPanel allowedSessions={allowedSessions} />
    </AppShell>
  );
}

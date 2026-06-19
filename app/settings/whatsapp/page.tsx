import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { WhatsappSettingsPanel } from "@/components/whatsapp-settings-panel";
import { getRequiredAppContext } from "@/lib/auth/app-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function WhatsappSettingsPage() {
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
    <AppShell active="settings/whatsapp">
      <PageHeader title="Configurações do WhatsApp" description="Conecte o WhatsApp Web Lab, veja o status e escaneie o QR Code." badge="Gateway Railway" />
      <WhatsappSettingsPanel allowedSessions={allowedSessions} />
    </AppShell>
  );
}

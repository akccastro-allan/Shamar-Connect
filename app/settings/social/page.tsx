import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SocialSettingsPanel } from "@/components/social-settings-panel";
import { getRequiredAppContext } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const metadata = { title: "Instagram e Facebook — ShamarConnect" };

async function assertMetaAccess() {
  const ctx = await getRequiredAppContext();
  if (ctx.isPlatformTenant) return;
  const db = createSupabaseWriteClient();
  const { data: tenant } = await db.from("tenants").select("metadata").eq("id", ctx.tenantId).maybeSingle();
  const meta = tenant?.metadata as Record<string, unknown> | null;
  const enabled = meta?.features !== undefined &&
    typeof meta.features === "object" &&
    (meta.features as Record<string, unknown>).meta_channels === true;
  if (!enabled) redirect("/dashboard");
}

export default async function SocialSettingsPage() {
  await assertMetaAccess();

  return (
    <AppShell active="settings/social">
      <PageHeader
        title="Instagram e Facebook"
        description="Conecte as contas do Instagram Direct e do Facebook Messenger para receber e responder DMs na Central de Atendimento."
        badge="Configurações"
      />
      <SocialSettingsPanel />
    </AppShell>
  );
}

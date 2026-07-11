import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SocialSettingsPanel } from "@/components/social-settings-panel";
import { getRequiredAppContext } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";
import { canAccessMetaChannels, getTenantFeatureMetadata } from "@/lib/features/feature-flags";

export const metadata = { title: "Instagram e Facebook — ShamarConnect" };

async function assertMetaAccess() {
  const ctx = await getRequiredAppContext();
  const db = createSupabaseWriteClient();
  const tenantMetadata = await getTenantFeatureMetadata(db, ctx.tenantId);
  if (!canAccessMetaChannels(ctx, tenantMetadata)) redirect("/dashboard");
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

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ProfileSettingsPanel } from "@/components/profile-settings-panel";
import { getRequiredAppContext } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export default async function ProfileSettingsPage() {
  const context = await getRequiredAppContext();
  const db = createSupabaseWriteClient();

  const { data: user } = await db
    .from("app_users")
    .select("id, name, email, avatar_url")
    .eq("id", context.appUserId)
    .single();

  const profile = {
    id: user?.id ?? context.appUserId,
    name: user?.name ?? context.name,
    email: user?.email ?? context.email,
    avatar_url: user?.avatar_url ?? null,
  };

  return (
    <AppShell active="settings/profile">
      <PageHeader
        title="Meu perfil"
        description="Atualize sua foto, nome e senha de acesso."
        badge="Conta"
      />
      <ProfileSettingsPanel initialProfile={profile} />
    </AppShell>
  );
}

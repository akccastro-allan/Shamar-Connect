import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SocialSettingsPanel } from "@/components/social-settings-panel";

export const metadata = { title: "Instagram e Facebook — ShamarConnect" };

export default function SocialSettingsPage() {
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

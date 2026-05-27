import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { InboxPanel } from "@/components/inbox/inbox-panel";

export default function InboxPage() {
  return (
    <AppShell active="inbox">
      <PageHeader title="Inbox" description="Leitura das conversas e mensagens salvas manualmente no ShamarConnect." badge="Modo seguro" />
      <InboxPanel />
    </AppShell>
  );
}

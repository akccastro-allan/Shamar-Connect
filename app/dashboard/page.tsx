import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { DashboardOperationalPanel } from "@/components/dashboard-operational-panel";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

export const metadata = { title: "Dashboard — ShamarConnect" };

async function getDashboardMetrics(tenantId: string, organizationId: string) {
  const db = createSupabaseWriteClient();

  const [contacts, conversations, openConversations, channels] = await Promise.all([
    db
      .from("crm_contacts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId),
    db
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId),
    db
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId)
      .in("status", ["open", "pending"]),
    db
      .from("channels")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("organization_id", organizationId)
      .not("session_id", "is", null),
  ]);

  return {
    contactCount: contacts.count ?? 0,
    conversationCount: conversations.count ?? 0,
    openConversationCount: openConversations.count ?? 0,
    connectedChannelCount: channels.count ?? 0,
  };
}

export default async function DashboardPage() {
  let context;
  try {
    context = await getRequiredAppContext();
  } catch (err) {
    if (isUnauthorizedError(err)) redirect("/login");
    throw err;
  }

  const metrics = await getDashboardMetrics(context.tenantId, context.organizationId);
  const firstName = (context.name || "").trim().split(" ")[0];

  return (
    <AppShell active="dashboard">
      <PageHeader
        title={firstName ? `Olá, ${firstName}` : "Seu painel"}
        description="Acompanhe seus atendimentos, contatos e canais conectados — tudo em um só lugar."
        badge="Visão geral"
      />
      <DashboardOperationalPanel metrics={metrics} />
    </AppShell>
  );
}
